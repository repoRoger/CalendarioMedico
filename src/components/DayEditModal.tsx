import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Plus, Trash2, Clock, Building2, AlertCircle, Check,
  Calendar, ShieldAlert, Moon, UserCheck, FileText, Edit2,
  ArrowLeft, ChevronRight
} from 'lucide-react';
import { Hospital, MedicalShift, ShiftCode, ShiftTemplate } from '../types';
import { calculateShiftHours, formatFriendlyDate, getShiftDisplayCode, getShiftDisplayName } from '../lib/timeUtils';
import { getHospitalForShift } from '../lib/storage';

interface DayEditModalProps {
  isOpen: boolean;
  date: string; // 'YYYY-MM-DD'
  existingShifts: MedicalShift[];
  hospitals: Hospital[];
  templates: ShiftTemplate[];
  onClose: () => void;
  onSaveDayShifts: (date: string, shifts: MedicalShift[]) => void;
  onOpenHospitalManager: () => void;
}

export const DayEditModal: React.FC<DayEditModalProps> = ({
  isOpen,
  date,
  existingShifts,
  hospitals,
  templates,
  onClose,
  onSaveDayShifts,
  onOpenHospitalManager,
}) => {
  // Array of shifts for this day
  const [shifts, setShifts] = useState<MedicalShift[]>([]);

  // Navigation mode: 'list' (shows all shifts of this day) or 'edit' (edits ONE shift specifically)
  const [modalMode, setModalMode] = useState<'list' | 'edit'>('list');

  // If editing an existing shift, this is its index; if creating a new shift, this is null
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // The shift currently being edited in 'edit' mode
  const [activeShift, setActiveShift] = useState<MedicalShift | null>(null);

  // Validation warning state
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingShifts && existingShifts.length > 0) {
        // Sanitize shifts so hospitalId is always valid
        const sanitized: MedicalShift[] = existingShifts.map((s) => {
          if (!s.hospitalId) {
            const resolved = getHospitalForShift(s, hospitals);
            return { ...s, hospitalId: resolved.id };
          }
          return s;
        });
        setShifts(sanitized);
      } else {
        setShifts([]);
      }
      setModalMode('list');
      setEditingIndex(null);
      setActiveShift(null);
      setValidationError(null);
    }
  }, [isOpen, existingShifts, hospitals]);

  if (!isOpen) return null;

  const defaultHospitalId = hospitals[0]?.id || '';

  // Start editing an existing shift
  const handleOpenEditShift = (index: number) => {
    setEditingIndex(index);
    setActiveShift(JSON.parse(JSON.stringify(shifts[index])));
    setValidationError(null);
    setModalMode('edit');
  };

  // Start creating a brand new shift
  const handleOpenNewShift = (preferredCode: ShiftCode = 'TA') => {
    const tpl = templates.find((t) => t.code === preferredCode) || templates[0];
    const isCubrir = preferredCode === 'C';
    const startTime = tpl?.defaultStartTime || '07:00';
    const endTime = tpl?.defaultEndTime || '15:00';
    const calculated = calculateShiftHours(startTime, endTime);

    const newShift: MedicalShift = {
      id: `shift-${date}-${Date.now()}-${shifts.length + 1}`,
      date,
      hospitalId: defaultHospitalId,
      shiftCode: isCubrir ? 'C' : (tpl?.code || 'TA'),
      title: isCubrir ? 'Cubrir' : (tpl?.name || 'TA'),
      startTime,
      endTime,
      hours: calculated,
      department: '',
      notes: isCubrir ? 'Cubriendo a ' : '',
      isNightShift: tpl?.isNightShift || false,
      isSubstitute: isCubrir,
    };

    setEditingIndex(null); // Indicates brand new shift
    setActiveShift(newShift);
    setValidationError(null);
    setModalMode('edit');
  };

  // Update a field inside the active shift
  const handleUpdateActiveShift = (updates: Partial<MedicalShift>) => {
    if (!activeShift) return;
    const target = { ...activeShift, ...updates };

    if (target.shiftCode === 'LIBRE' || target.shiftCode === 'L') {
      target.hours = 0;
      target.isNightShift = false;
    } else if (updates.startTime !== undefined || updates.endTime !== undefined) {
      target.hours = calculateShiftHours(target.startTime, target.endTime);
      const [sH] = target.startTime.split(':').map(Number);
      const [eH] = target.endTime.split(':').map(Number);
      target.isNightShift = sH >= 20 || eH <= 8 || target.shiftCode === 'N' || target.shiftCode === '24H' || target.shiftCode === 'TB-TC' || target.shiftCode === 'TC-TA';
    }

    // Check duplicate schedule in real-time
    const duplicate = shifts.some((s, idx) => {
      if (editingIndex !== null && idx === editingIndex) return false;
      if (s.shiftCode === 'L' || s.shiftCode === 'LIBRE' || target.shiftCode === 'LIBRE' || target.shiftCode === 'L') return false;
      return s.startTime === target.startTime && s.endTime === target.endTime;
    });

    if (duplicate) {
      setValidationError(`Ya existe otro turno registrado con el mismo horario (${target.startTime} - ${target.endTime}) en este día.`);
    } else {
      setValidationError(null);
    }

    setActiveShift(target);
  };

  // Apply a template to the active shift
  const handleApplyTemplateToActive = (code: ShiftCode) => {
    if (code === 'L') {
      handleUpdateActiveShift({
        shiftCode: 'L',
        title: 'Día Libre / Descanso',
        startTime: '00:00',
        endTime: '00:00',
        hours: 0,
        isNightShift: false,
      });
      return;
    }

    if (code === 'LIBRE') {
      handleUpdateActiveShift({
        shiftCode: 'LIBRE',
        title: 'Libre turno',
        startTime: '00:00',
        endTime: '00:00',
        hours: 0,
        isNightShift: false,
      });
      return;
    }

    const tpl = templates.find((t) => t.code === code);
    if (!tpl || !activeShift) return;

    handleUpdateActiveShift({
      shiftCode: tpl.code,
      title: tpl.name,
      startTime: tpl.defaultStartTime,
      endTime: tpl.defaultEndTime,
      hours: tpl.defaultHours,
      isNightShift: tpl.isNightShift,
    });
  };

  // Adjust hours with +1h / -1h
  const handleAdjustHoursActive = (deltaHours: number) => {
    if (!activeShift) return;
    const [h, m] = activeShift.endTime.split(':').map(Number);
    let newH = (h + deltaHours + 24) % 24;
    const newEnd = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    handleUpdateActiveShift({ endTime: newEnd });
  };

  // Save the currently edited shift back into the shifts array
  const handleSaveActiveShift = () => {
    if (!activeShift) return;

    // Validate duplicate schedule before confirming
    const duplicate = shifts.find((s, idx) => {
      if (editingIndex !== null && idx === editingIndex) return false;
      if (s.shiftCode === 'L' || s.shiftCode === 'LIBRE' || activeShift.shiftCode === 'LIBRE' || activeShift.shiftCode === 'L') return false;
      return s.startTime === activeShift.startTime && s.endTime === activeShift.endTime;
    });

    if (duplicate) {
      setValidationError(`No se puede guardar: Ya tienes el turno "${duplicate.title}" en el mismo horario (${duplicate.startTime} - ${duplicate.endTime}) para este día.`);
      return;
    }

    // Ensure valid hospitalId
    let finalShift = { ...activeShift };
    if (!finalShift.hospitalId && hospitals.length > 0) {
      finalShift.hospitalId = hospitals[0].id;
    }

    let nextShifts: MedicalShift[];
    if (editingIndex !== null) {
      // Update existing shift
      nextShifts = shifts.map((s, idx) => (idx === editingIndex ? finalShift : s));
    } else {
      // Add new shift (remove generic day-off if adding a specific hospital shift)
      const filtered = shifts.filter((s) => s.title !== 'Día Libre / Descanso');
      nextShifts = [...filtered, finalShift];
    }

    setShifts(nextShifts);

    // DIRECT AUTO-PERSIST TO APP STATE & TURSO NUBE!
    onSaveDayShifts(date, nextShifts);

    // Return to list view
    setModalMode('list');
    setEditingIndex(null);
    setActiveShift(null);
    setValidationError(null);
  };

  // Delete a shift from the list (auto-persists immediately)
  const handleRemoveShift = (index: number) => {
    const nextShifts = shifts.filter((_, i) => i !== index);
    setShifts(nextShifts);
    onSaveDayShifts(date, nextShifts);
  };

  // Set the whole day as off (Libre) (auto-persists immediately)
  const handleSetDayOff = () => {
    const freeShift: MedicalShift = {
      id: `shift-${date}-${Date.now()}`,
      date,
      hospitalId: defaultHospitalId,
      shiftCode: 'L',
      title: 'Día Libre / Descanso',
      startTime: '00:00',
      endTime: '00:00',
      hours: 0,
      department: 'Descanso post-turno',
      notes: 'Sin turnos programados',
    };
    const nextShifts = [freeShift];
    setShifts(nextShifts);
    onSaveDayShifts(date, nextShifts);
  };

  const totalDayHours = shifts.reduce(
    (acc, s) => (s.shiftCode === 'LIBRE' || s.shiftCode === 'L' ? acc : acc + (s.hours || 0)),
    0
  );
  const is24HourDay = totalDayHours >= 24;

  // Final confirmation to save the whole day
  const handleSaveWholeDay = () => {
    onSaveDayShifts(date, shifts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-2xl bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-0 sm:my-auto"
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {modalMode === 'edit' ? (
              <button
                type="button"
                onClick={() => {
                  setModalMode('list');
                  setActiveShift(null);
                  setEditingIndex(null);
                  setValidationError(null);
                }}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
                title="Volver al listado de turnos"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-100 capitalize truncate">
                {modalMode === 'edit'
                  ? editingIndex !== null
                    ? `Editar Turno #${editingIndex + 1}`
                    : 'Nuevo Turno'
                  : formatFriendlyDate(date)}
              </h2>
              <p className="text-xs text-slate-400">
                {modalMode === 'edit'
                  ? formatFriendlyDate(date)
                  : `${shifts.length} ${shifts.length === 1 ? 'turno registrado' : 'turnos registrados'} · ${totalDayHours} horas totales`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {modalMode === 'list' && is24HourDay && (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                24 Horas
              </span>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Switch between 'list' and 'edit' */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          <AnimatePresence mode="wait">
            {modalMode === 'list' ? (
              /* VIEW 1: LISTADO DE TURNOS DEL DÍA */
              <motion.div
                key="list-view"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-4"
              >
                {/* List of Shifts for this Day */}
                {shifts.length === 0 ? (
                  <div className="py-10 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 p-6">
                    <Clock className="w-10 h-10 text-slate-600 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-slate-200">No hay turnos registrados en este día</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                        Puedes agregar turnos de trabajo o marcar el día como descanso.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {shifts.map((shift, idx) => {
                      const hosp = getHospitalForShift(shift, hospitals);
                      const isWholeDayOff = shift.shiftCode === 'L' && shift.title.toLowerCase().includes('libre');
                      const isCenterLibre = shift.shiftCode === 'LIBRE' || (shift.shiftCode === 'L' && !isWholeDayOff);

                      return (
                        <div
                          key={shift.id || idx}
                          className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Hospital or Free icon badge */}
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-md"
                              style={{
                                background: isWholeDayOff
                                  ? '#064e3b'
                                  : `linear-gradient(135deg, ${hosp?.gradientStart || '#0d9488'}, ${hosp?.gradientEnd || '#059669'})`,
                              }}
                            >
                              {isWholeDayOff ? <Moon className="w-5 h-5 text-emerald-300" /> : <Building2 className="w-5 h-5" />}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-slate-100 truncate">
                                  {isWholeDayOff ? 'Día Libre Completo' : (hosp?.shortName || hosp?.name || 'Centro')}
                                </span>

                                <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                                  isCenterLibre || isWholeDayOff
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-800 text-teal-300'
                                }`}>
                                  {getShiftDisplayCode(shift.shiftCode)}: {getShiftDisplayName(shift.title || shift.shiftCode)}
                                </span>

                                {!isWholeDayOff && !isCenterLibre && (
                                  <span className="text-xs text-slate-400 font-mono">
                                    {shift.startTime} - {shift.endTime}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                                {isWholeDayOff ? (
                                  <span className="text-emerald-400 font-semibold">
                                    0h (Descanso de turnos)
                                  </span>
                                ) : isCenterLibre ? (
                                  <span className="text-emerald-400 font-semibold">
                                    0h laboradas (Libre en este centro)
                                  </span>
                                ) : (
                                  <span className="font-bold text-teal-400 font-mono">
                                    {shift.hours}h laboradas
                                  </span>
                                )}
                                {shift.department && <span>· {shift.department}</span>}
                                {shift.notes && <span className="italic">· {shift.notes}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons for this single shift */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditShift(idx)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-teal-600 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 min-h-[36px]"
                              title="Editar este turno específico"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveShift(idx)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700 min-h-[36px] min-w-[36px] flex items-center justify-center"
                              title="Eliminar este turno"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Add Buttons in List View */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleOpenNewShift('TA')}
                    className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all active:scale-[0.98] min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Agregar Turno a este día</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSetDayOff}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors min-h-[44px]"
                  >
                    <Moon className="w-4 h-4 text-purple-400" />
                    <span>Marcar Día Libre</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* VIEW 2: EDICIÓN UNO A UNO DE UN TURNO ESPECÍFICO */
              activeShift && (
                <motion.div
                  key="edit-view"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="space-y-4"
                >
                  {/* Duplicate Schedule Warning */}
                  {validationError && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 font-medium animate-pulse">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  {/* 1. Selector de Centro de Trabajo */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      Centro de Trabajo / Lugar:
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {hospitals.map((hosp) => {
                        const isSelected = activeShift.hospitalId === hosp.id;
                        return (
                          <button
                            key={hosp.id}
                            type="button"
                            onClick={() => handleUpdateActiveShift({ hospitalId: hosp.id })}
                            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 border ${
                              isSelected
                                ? 'text-white border-teal-400 shadow-md ring-1 ring-teal-400'
                                : 'text-slate-400 bg-slate-950 border-slate-800 hover:text-slate-200'
                            }`}
                            style={{
                              background: isSelected
                                ? `linear-gradient(135deg, ${hosp.gradientStart}, ${hosp.gradientEnd})`
                                : undefined,
                            }}
                          >
                            <Building2 className="w-4 h-4" />
                            <span>{hosp.shortName}</span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={onOpenHospitalManager}
                        className="min-h-[44px] px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-teal-300 border border-dashed border-slate-700 shrink-0 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nuevo Centro</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Botones rápidos de Tipo de Turno */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      Horario Recomendado / Plantilla:
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {templates.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleApplyTemplateToActive(tpl.code)}
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            activeShift.shiftCode === tpl.code
                              ? 'bg-slate-700 text-teal-300 border border-teal-500/40 shadow-sm'
                              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {tpl.name || tpl.code}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Ajuste de Horas Inicio y Fin */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <label className="block text-[11px] text-slate-400 uppercase font-bold mb-1">
                        Hora Inicio
                      </label>
                      <input
                        type="time"
                        value={activeShift.startTime}
                        onChange={(e) => handleUpdateActiveShift({ startTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 min-h-[44px] focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-slate-400 uppercase font-bold">
                          Hora Fin
                        </label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustHoursActive(-1)}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 font-mono"
                            title="-1 hora"
                          >
                            -1h
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustHoursActive(1)}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-teal-300 rounded hover:bg-slate-700 font-mono"
                            title="+1 hora"
                          >
                            +1h
                          </button>
                        </div>
                      </div>
                      <input
                        type="time"
                        value={activeShift.endTime}
                        onChange={(e) => handleUpdateActiveShift({ endTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 min-h-[44px] focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Summary of this shift's hours */}
                  <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-800/40 flex items-center justify-between">
                    <span className="text-xs text-teal-200">Duración de este turno:</span>
                    <span className="text-sm font-black text-teal-300 font-mono">
                      {activeShift.hours} horas
                    </span>
                  </div>

                  {/* 4. Departamento y Notas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300">
                        Área / Departamento (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Emergencias, UCI, Piso 3"
                        value={activeShift.department || ''}
                        onChange={(e) => handleUpdateActiveShift({ department: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 min-h-[42px] focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300">
                        Notas u Observaciones (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Cubre a colega, doble jornada"
                        value={activeShift.notes || ''}
                        onChange={(e) => handleUpdateActiveShift({ notes: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 min-h-[42px] focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Action buttons inside Edit Mode */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setModalMode('list');
                        setActiveShift(null);
                        setEditingIndex(null);
                        setValidationError(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors min-h-[42px]"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveActiveShift}
                      disabled={!!validationError}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-teal-900/40 transition-all active:scale-95 min-h-[42px]"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingIndex !== null ? 'Guardar Turno en Nube' : 'Añadir Turno en Nube'}</span>
                    </button>
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer in List Mode */}
        {modalMode === 'list' && (
          <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/70 shrink-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs text-slate-400 font-mono">
                Total día: <strong className="text-teal-400 font-bold">{totalDayHours}h</strong>
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                <Check className="w-3 h-3" />
                Sincronizado
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 transition-all active:scale-95 min-h-[42px] border border-slate-700"
            >
              <Check className="w-4 h-4 text-teal-400" />
              <span>Listo / Cerrar</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
