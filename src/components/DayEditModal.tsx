import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Plus, Trash2, Clock, Building2, AlertCircle, Check,
  Calendar, ShieldAlert, Moon, UserCheck, FileText, Edit2,
  ArrowLeft, ChevronRight, AlertTriangle
} from 'lucide-react';
import { Hospital, MedicalShift, ShiftCode, ShiftTemplate } from '../types';
import {
  calculateShiftHours, formatFriendlyDate, getShiftDisplayCode,
  getShiftDisplayName, doShiftsOverlap, isShiftLibre, isShiftCollision
} from '../lib/timeUtils';
import { getHospitalForShift, getShiftColor } from '../lib/storage';

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
  const [allowForceCollision, setAllowForceCollision] = useState(false);

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
      setAllowForceCollision(false);
    }
  }, [isOpen, existingShifts, hospitals]);

  if (!isOpen) return null;

  const defaultHospitalId = hospitals[0]?.id || '';

  // Check overlap helper
  const checkOverlap = (target: MedicalShift, currentEditingIdx: number | null) => {
    if (isShiftLibre(target.shiftCode)) return null;

    const conflict = shifts.find((s, idx) => {
      if (currentEditingIdx !== null && idx === currentEditingIdx) return false;
      if (isShiftLibre(s.shiftCode)) return false;
      return doShiftsOverlap(target, s);
    });

    return conflict || null;
  };

  // Start editing an existing shift
  const handleOpenEditShift = (index: number) => {
    const shiftToEdit = JSON.parse(JSON.stringify(shifts[index]));
    setEditingIndex(index);
    setActiveShift(shiftToEdit);
    setValidationError(null);
    setAllowForceCollision(false);
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
    setAllowForceCollision(false);
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

    // Check intelligent overlap in real-time
    const conflict = checkOverlap(target, editingIndex);
    if (conflict) {
      const conflictHosp = getHospitalForShift(conflict, hospitals);
      setValidationError(
        `⚠️ Conflicto de horario: Las horas (${target.startTime} - ${target.endTime}) se solapan con el turno "${conflict.title}" en ${conflictHosp?.shortName || 'otro centro'} (${conflict.startTime} - ${conflict.endTime}).`
      );
      setAllowForceCollision(true);
    } else {
      setValidationError(null);
      setAllowForceCollision(false);
    }

    setActiveShift(target);
  };

  // Apply a template to the active shift
  const handleApplyTemplateToActive = (code: ShiftCode) => {
    if (code === 'L') {
      handleUpdateActiveShift({
        shiftCode: 'L',
        title: 'Libre total',
        startTime: '00:00',
        endTime: '00:00',
        hours: 0,
        isNightShift: false,
      });
      return;
    }

    if (code === 'LIBRE_A') {
      handleUpdateActiveShift({
        shiftCode: 'LIBRE_A',
        title: 'Libre A',
        startTime: '07:00',
        endTime: '15:00',
        hours: 0,
        isNightShift: false,
      });
      return;
    }

    if (code === 'LIBRE_B') {
      handleUpdateActiveShift({
        shiftCode: 'LIBRE_B',
        title: 'Libre B',
        startTime: '15:00',
        endTime: '21:00',
        hours: 0,
        isNightShift: false,
      });
      return;
    }

    if (code === 'LIBRE_C') {
      handleUpdateActiveShift({
        shiftCode: 'LIBRE_C',
        title: 'Libre C',
        startTime: '21:00',
        endTime: '07:00',
        hours: 0,
        isNightShift: true,
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

  // Adjust start or end time with +1h / -1h
  const handleAdjustTime = (field: 'startTime' | 'endTime', deltaHours: number) => {
    if (!activeShift) return;
    const timeVal = activeShift[field] || (field === 'startTime' ? '07:00' : '15:00');
    const [h, m] = timeVal.split(':').map(Number);
    let newH = (h + deltaHours + 24) % 24;
    const newTime = `${String(newH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
    handleUpdateActiveShift({ [field]: newTime });
  };

  // Save the currently edited shift back into the shifts array
  const handleSaveActiveShift = (forceAsCollision = false) => {
    if (!activeShift) return;

    // Check overlap if not forced
    const conflict = checkOverlap(activeShift, editingIndex);

    let finalShift = { ...activeShift };
    if (!finalShift.hospitalId && hospitals.length > 0) {
      finalShift.hospitalId = hospitals[0].id;
    }

    if (conflict && (forceAsCollision || finalShift.shiftCode === 'CHOQUE')) {
      finalShift.isCollision = true;
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
    setAllowForceCollision(false);
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
    (acc, s) => (isShiftLibre(s.shiftCode) ? acc : acc + (s.hours || 0)),
    0
  );
  const is24HourDay = totalDayHours >= 24;

  const currentHosp = activeShift ? getHospitalForShift(activeShift, hospitals) : null;
  const currentWorkplaceColor = currentHosp?.color || currentHosp?.gradientStart || '#0d9488';
  const currentShiftColor = activeShift ? getShiftColor(activeShift.shiftCode, templates) : '#f59e0b';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-2xl bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-0 sm:my-auto"
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
                  setAllowForceCollision(false);
                }}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0 min-h-[40px] min-w-[40px]"
                title="Volver al listado de turnos"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
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
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
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
                      const isCenterLibre = isShiftLibre(shift.shiftCode) && !isWholeDayOff;
                      const isCollision = isShiftCollision(shift.shiftCode) || shift.isCollision;
                      const workplaceColor = hosp?.color || hosp?.gradientStart || '#0d9488';
                      const shiftColor = getShiftColor(shift.shiftCode, templates);

                      return (
                        <div
                          key={shift.id || idx}
                          className={`p-3.5 rounded-2xl bg-slate-950/80 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors group ${
                            isCollision
                              ? 'border-red-500/60 ring-1 ring-red-500/50'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Hospital or Free icon badge with gradient fusion */}
                            <div
                              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 font-bold text-base shadow-md border border-white/20"
                              style={{
                                background: isCollision
                                  ? 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)'
                                  : isWholeDayOff
                                  ? '#064e3b'
                                  : isCenterLibre
                                  ? `linear-gradient(135deg, ${workplaceColor} 0%, #059669 100%)`
                                  : `linear-gradient(135deg, ${workplaceColor} 0%, ${shiftColor} 100%)`,
                              }}
                            >
                              {isWholeDayOff ? (
                                <Moon className="w-5 h-5 text-emerald-300" />
                              ) : hosp?.emoji ? (
                                <span>{hosp.emoji}</span>
                              ) : (
                                <Building2 className="w-5 h-5" />
                              )}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-sm text-slate-100 truncate">
                                  {isWholeDayOff ? 'Día Libre Completo' : (hosp?.shortName || hosp?.name || 'Centro')}
                                </span>

                                <span
                                  className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold text-white shadow-sm border border-white/20"
                                  style={{
                                    backgroundColor: isCollision
                                      ? '#dc2626'
                                      : isWholeDayOff || isCenterLibre
                                      ? '#059669'
                                      : shiftColor,
                                  }}
                                >
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
                              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-teal-600 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 min-h-[40px]"
                              title="Editar este turno específico"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveShift(idx)}
                              className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
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
                    className="flex-1 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all active:scale-[0.98] min-h-[46px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Agregar Turno a este día</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSetDayOff}
                    className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors min-h-[46px]"
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
                  {/* Collision Warning Banner */}
                  {validationError && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-start gap-2.5 font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{validationError}</span>
                      </div>
                      {allowForceCollision && (
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                          <button
                            type="button"
                            onClick={() => handleSaveActiveShift(true)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                          >
                            <span>Guardar con Alerta de Choque</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 1. Selector de Centro de Trabajo (Colores sólidos) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      1. Centro de Trabajo / Lugar:
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {hospitals.map((hosp) => {
                        const isSelected = activeShift.hospitalId === hosp.id;
                        const hospColor = hosp.color || hosp.gradientStart || '#0d9488';
                        return (
                          <button
                            key={hosp.id}
                            type="button"
                            onClick={() => handleUpdateActiveShift({ hospitalId: hosp.id })}
                            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 border ${
                              isSelected
                                ? 'text-white border-white shadow-lg ring-2 ring-white scale-102 font-black'
                                : 'text-slate-400 bg-slate-950 border-slate-800 hover:text-slate-200'
                            }`}
                            style={{
                              backgroundColor: isSelected ? hospColor : undefined,
                            }}
                          >
                            <span className="text-base">{hosp.emoji || '🏥'}</span>
                            <span>{hosp.shortName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Botones rápidos de Tipo de Turno (Colores de plantilla) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      2. Tipo de Turno / Plantilla:
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {templates.map((tpl) => {
                        const isSelected = activeShift.shiftCode === tpl.code;
                        const shiftColor = getShiftColor(tpl.code, templates);
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => handleApplyTemplateToActive(tpl.code)}
                            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                              isSelected
                                ? 'text-white border-white shadow-lg ring-2 ring-white scale-105 font-black'
                                : 'text-slate-400 bg-slate-950 border-slate-800 hover:text-slate-200'
                            }`}
                            style={{
                              backgroundColor: isSelected ? shiftColor : undefined,
                            }}
                          >
                            {tpl.name || tpl.code}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Ajuste de Horas Inicio y Fin con Steppers para Móvil */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Hora Inicio */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                      <label className="text-[11px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-400" />
                        <span>Hora Inicio</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustTime('startTime', -1)}
                          className="h-11 px-3.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold border border-slate-700 active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0 min-w-[44px]"
                          title="Restar 1 hora"
                        >
                          -1h
                        </button>
                        <input
                          type="time"
                          value={activeShift.startTime}
                          onChange={(e) => handleUpdateActiveShift({ startTime: e.target.value })}
                          className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-2 h-11 text-center text-base sm:text-lg font-mono font-black text-slate-100 focus:outline-none focus:border-teal-500 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => handleAdjustTime('startTime', 1)}
                          className="h-11 px-3.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-teal-300 rounded-xl text-xs font-mono font-bold border border-slate-700 active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0 min-w-[44px]"
                          title="Sumar 1 hora"
                        >
                          +1h
                        </button>
                      </div>
                    </div>

                    {/* Hora Fin */}
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                      <label className="text-[11px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-400" />
                        <span>Hora Fin</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustTime('endTime', -1)}
                          className="h-11 px-3.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold border border-slate-700 active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0 min-w-[44px]"
                          title="Restar 1 hora"
                        >
                          -1h
                        </button>
                        <input
                          type="time"
                          value={activeShift.endTime}
                          onChange={(e) => handleUpdateActiveShift({ endTime: e.target.value })}
                          className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-2 h-11 text-center text-base sm:text-lg font-mono font-black text-slate-100 focus:outline-none focus:border-teal-500 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => handleAdjustTime('endTime', 1)}
                          className="h-11 px-3.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-teal-300 rounded-xl text-xs font-mono font-bold border border-slate-700 active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0 min-w-[44px]"
                          title="Sumar 1 hora"
                        >
                          +1h
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary card with live gradient fusion preview */}
                  <div
                    className="p-3.5 rounded-2xl text-white shadow-md border border-white/20 flex items-center justify-between"
                    style={{
                      background: `linear-gradient(135deg, ${currentWorkplaceColor} 0%, ${currentShiftColor} 100%)`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{currentHosp?.emoji || '🏥'}</span>
                      <div>
                        <span className="font-bold text-xs block">{currentHosp?.shortName || 'Centro'} · {activeShift.shiftCode}</span>
                        <span className="text-[10px] opacity-90">{activeShift.startTime} a {activeShift.endTime}</span>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono bg-black/25 px-2.5 py-1 rounded-xl">
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 min-h-[44px] focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-300">
                        Notas u Observaciones (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Cubre a colega, guardia extra"
                        value={activeShift.notes || ''}
                        onChange={(e) => handleUpdateActiveShift({ notes: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 min-h-[44px] focus:outline-none focus:border-teal-500"
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
                        setAllowForceCollision(false);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors min-h-[44px]"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveActiveShift(false)}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-teal-900/40 transition-all active:scale-95 min-h-[44px]"
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
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 transition-all active:scale-95 min-h-[44px] border border-slate-700"
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
