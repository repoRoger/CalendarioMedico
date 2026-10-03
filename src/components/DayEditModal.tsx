import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X, Plus, Trash2, Clock, Building2, AlertCircle, Check,
  Calendar, ShieldAlert, Moon, Sparkles, PlusCircle, MinusCircle
} from 'lucide-react';
import { Hospital, MedicalShift, ShiftCode, ShiftTemplate } from '../types';
import { calculateShiftHours, formatFriendlyDate } from '../lib/timeUtils';

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
  const [shifts, setShifts] = useState<MedicalShift[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (existingShifts && existingShifts.length > 0) {
        setShifts(JSON.parse(JSON.stringify(existingShifts)));
      } else {
        setShifts([]);
      }
    }
  }, [isOpen, existingShifts]);

  if (!isOpen) return null;

  const defaultHospitalId = hospitals[0]?.id || '';

  const handleAddShift = (templateCode: ShiftCode = 'M', preferredHospitalId?: string) => {
    const tpl = templates.find((t) => t.code === templateCode) || templates[0];
    const startTime = tpl?.defaultStartTime || '07:00';
    const endTime = tpl?.defaultEndTime || '15:00';
    const calculated = calculateShiftHours(startTime, endTime);

    const newShift: MedicalShift = {
      id: `shift-${date}-${Date.now()}-${shifts.length + 1}`,
      date,
      hospitalId: preferredHospitalId || defaultHospitalId,
      shiftCode: tpl?.code || 'M',
      title: tpl?.name || 'Turno',
      startTime,
      endTime,
      hours: calculated,
      department: '',
      notes: '',
      isNightShift: tpl?.isNightShift || false,
      isSubstitute: false,
    };

    setShifts((prev) => [...prev, newShift]);
  };

  const handleUpdateShift = (index: number, updates: Partial<MedicalShift>) => {
    setShifts((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], ...updates };

      if (updates.startTime !== undefined || updates.endTime !== undefined) {
        target.hours = calculateShiftHours(target.startTime, target.endTime);
        const [sH] = target.startTime.split(':').map(Number);
        const [eH] = target.endTime.split(':').map(Number);
        target.isNightShift = sH >= 20 || eH <= 8 || target.shiftCode === 'N' || target.shiftCode === '24H';
      }

      copy[index] = target;
      return copy;
    });
  };

  const handleApplyTemplate = (index: number, templateCode: ShiftCode) => {
    const tpl = templates.find((t) => t.code === templateCode);
    if (!tpl) return;

    handleUpdateShift(index, {
      shiftCode: tpl.code,
      title: tpl.name,
      startTime: tpl.defaultStartTime,
      endTime: tpl.defaultEndTime,
      hours: tpl.defaultHours,
      isNightShift: tpl.isNightShift,
    });
  };

  const handleAdjustHours = (index: number, deltaHours: number) => {
    const shift = shifts[index];
    if (!shift) return;
    const [h, m] = shift.endTime.split(':').map(Number);
    let newH = (h + deltaHours + 24) % 24;
    const newEnd = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    handleUpdateShift(index, { endTime: newEnd });
  };

  const handleRemoveShift = (index: number) => {
    setShifts((prev) => prev.filter((_, i) => i !== index));
  };

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
    setShifts([freeShift]);
  };

  const totalDayHours = shifts.reduce((acc, s) => acc + (s.hours || 0), 0);
  const is24HourDay = totalDayHours >= 24;

  const handleSave = () => {
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

        {/* Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 capitalize truncate">
                {formatFriendlyDate(date)}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-mono text-teal-400 font-bold">{totalDayHours}h totales</span>
                <span>·</span>
                <span>{shifts.length} {shifts.length === 1 ? 'turno' : 'turnos'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 p-2 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 24-Hour Continuous Work Banner (Extreme Fatigue) */}
        {is24HourDay && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-200 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 font-mono font-extrabold flex items-center justify-center text-amber-300 shrink-0">
              24H
            </div>
            <div>
              <p className="font-bold text-amber-300">¡Jornada de 24 Horas Reales!</p>
              <p className="text-amber-200/80 text-[11px]">
                3 turnos consecutivos o guardia completa. ¡Recuerda descansar después!
              </p>
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {shifts.length === 0 ? (
            /* Empty State with Mobile One-Tap Quick Buttons */
            <div className="text-center py-6 px-3 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 space-y-3">
              <Clock className="w-8 h-8 text-teal-500/60 mx-auto" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Sin turnos en este día</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Toca para agregar directamente con tu horario recomendado:
                </p>
              </div>

              {/* Big Touch-Friendly Preset Pills */}
              <div className="grid grid-cols-2 gap-2 pt-1 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() => handleAddShift('M')}
                  className="min-h-[48px] p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center justify-between border border-slate-700 transition-all active:scale-95"
                >
                  <span className="font-bold">Mañana</span>
                  <span className="text-[11px] text-teal-400 font-mono">07:00-15:00</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddShift('T')}
                  className="min-h-[48px] p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center justify-between border border-slate-700 transition-all active:scale-95"
                >
                  <span className="font-bold">Tarde</span>
                  <span className="text-[11px] text-orange-400 font-mono">15:00-23:00</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddShift('N')}
                  className="min-h-[48px] p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center justify-between border border-slate-700 transition-all active:scale-95"
                >
                  <span className="font-bold flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" /> Noche
                  </span>
                  <span className="text-[11px] text-indigo-400 font-mono">23:00-07:00</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddShift('24H')}
                  className="min-h-[48px] p-2.5 rounded-xl bg-gradient-to-r from-rose-900/40 to-amber-900/40 hover:from-rose-900/60 hover:to-amber-900/60 text-slate-100 text-xs font-semibold flex items-center justify-between border border-rose-500/40 transition-all active:scale-95"
                >
                  <span className="font-bold text-rose-300">Guardia 24H</span>
                  <span className="text-[11px] text-amber-300 font-mono">24h</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSetDayOff}
                  className="text-xs text-slate-400 hover:text-emerald-400 py-1 transition-colors"
                >
                  Marcar como Día Libre (Descanso)
                </button>
              </div>
            </div>
          ) : (
            /* Populated Shifts: Mobile Card layout */
            shifts.map((shift, idx) => {
              const currentHospital = hospitals.find((h) => h.id === shift.hospitalId);

              return (
                <div
                  key={shift.id || idx}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 relative shadow-md"
                >
                  {/* Turno Header with Hospital Gradient Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-teal-400 font-mono text-xs flex items-center justify-center font-bold">
                        #{idx + 1}
                      </span>
                      {currentHospital && (
                        <div
                          className="px-2.5 py-1 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5"
                          style={{
                            background: `linear-gradient(135deg, ${currentHospital.gradientStart}, ${currentHospital.gradientEnd})`,
                          }}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{currentHospital.shortName}</span>
                        </div>
                      )}
                      <span className="text-xs font-mono font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-800/40">
                        {shift.hours}h
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveShift(idx)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-rose-400 p-1 rounded-lg"
                      title="Eliminar este turno"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mobile Hospital Quick Selector (Horizontal Touch Cards) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                      Centro Hospitalario:
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {hospitals.map((hosp) => {
                        const isSelected = shift.hospitalId === hosp.id;
                        return (
                          <button
                            key={hosp.id}
                            type="button"
                            onClick={() => handleUpdateShift(idx, { hospitalId: hosp.id })}
                            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 border ${
                              isSelected
                                ? 'text-white border-teal-400 shadow-md ring-1 ring-teal-400'
                                : 'text-slate-400 bg-slate-900 border-slate-800 hover:text-slate-200'
                            }`}
                            style={{
                              background: isSelected
                                ? `linear-gradient(135deg, ${hosp.gradientStart}, ${hosp.gradientEnd})`
                                : undefined,
                            }}
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{hosp.shortName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Shift Template Quick Touch Buttons */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                      Horario Recomendado:
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {templates.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleApplyTemplate(idx, tpl.code)}
                          className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                            shift.shiftCode === tpl.code
                              ? 'bg-slate-700 text-teal-300 border border-teal-500/40 shadow-sm'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {tpl.code}: {tpl.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Exact Hours Inputs with Stepper for easy thumb usage */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Hora Inicio
                      </label>
                      <input
                        type="time"
                        value={shift.startTime}
                        onChange={(e) => handleUpdateShift(idx, { startTime: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-100 min-h-[44px] focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-400 uppercase font-semibold">
                          Hora Fin
                        </label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustHours(idx, -1)}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                            title="-1 hora"
                          >
                            -1h
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustHours(idx, 1)}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-teal-300 rounded hover:bg-slate-700"
                            title="+1 hora"
                          >
                            +1h
                          </button>
                        </div>
                      </div>
                      <input
                        type="time"
                        value={shift.endTime}
                        onChange={(e) => handleUpdateShift(idx, { endTime: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-100 min-h-[44px] focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Sala/Servicio y Notas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Servicio (UCI, Emergencias, Piso 3...)"
                      value={shift.department || ''}
                      onChange={(e) => handleUpdateShift(idx, { department: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="text"
                      placeholder="Observaciones o relevo..."
                      value={shift.notes || ''}
                      onChange={(e) => handleUpdateShift(idx, { notes: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Quick Button to Add 2nd / 3rd Shift for 24h work */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => handleAddShift('T')}
              className="w-full min-h-[48px] py-2.5 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-teal-300 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar otro turno (Turno 2 o 3 para 24 horas)</span>
            </button>
          </div>
        </div>

        {/* Sticky Bottom Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            Total: <strong className="font-mono text-teal-400 text-sm">{totalDayHours}h</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[48px] px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-900/30 transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Turnos</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
