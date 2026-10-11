import React, { useState } from 'react';
import { Plus, Clock, Moon, Sparkles, Building2, Paintbrush, AlertTriangle, Check, RefreshCw, X, ShieldAlert, Trash2 } from 'lucide-react';
import {
  CalendarDayItem, SPANISH_WEEKDAYS, getShiftDisplayCode, getShiftMobileLabel,
  isShiftLibre, isShiftCollision, formatFriendlyDate, doShiftsOverlap, getContrastTextColor,
  getDynamicShiftTextClass, getDynamicHospitalTextClass, getAutoFitFontSize
} from '../lib/timeUtils';
import { MedicalShift, Hospital, ShiftTemplate, ShiftCode } from '../types';
import { getHospitalForShift, getShiftColor } from '../lib/storage';
import { getShiftGradient } from '../lib/colorUtils';

interface CalendarMonthViewProps {
  days: CalendarDayItem[];
  shifts: MedicalShift[];
  hospitals: Hospital[];
  templates: ShiftTemplate[];
  filteredHospitalId?: string;
  onSelectDate: (date: string) => void;
  onQuickAssignShift?: (
    date: string,
    hospitalId: string,
    templateCode: ShiftCode,
    resolution: 'create' | 'replace' | 'keep_both' | 'mark_collision',
    department?: string
  ) => void;
  onSaveDayShifts?: (date: string, shifts: MedicalShift[]) => void;
}

interface CollisionDialogState {
  date: string;
  newHospitalId: string;
  newHospitalName: string;
  newTemplateCode: ShiftCode;
  newTime: string;
  existingTitle: string;
  existingHospitalName: string;
  existingTime: string;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  days,
  shifts,
  hospitals,
  templates,
  filteredHospitalId = 'all',
  onSelectDate,
  onQuickAssignShift,
  onSaveDayShifts,
}) => {
  // Calendar Interaction Tool Mode: 'normal' | 'quick_paint' | 'quick_libre' | 'quick_delete'
  type InteractionMode = 'normal' | 'quick_paint' | 'quick_libre' | 'quick_delete';
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('normal');
  const isQuickMode = interactionMode === 'quick_paint';

  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(() => hospitals[0]?.id || 'hosp-bendana');
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<ShiftCode>('TA');
  const [quickDepartment, setQuickDepartment] = useState('');
  const [collisionDialog, setCollisionDialog] = useState<CollisionDialogState | null>(null);

  // Dynamic Delete Modal state
  const [deleteTargetDay, setDeleteTargetDay] = useState<{
    date: string;
    shifts: MedicalShift[];
  } | null>(null);

  // Apply hospital filter if selected
  const activeShifts = filteredHospitalId === 'all'
    ? shifts
    : shifts.filter((s) => s.hospitalId === filteredHospitalId || s.shiftCode === 'L');

  // Group shifts by date string
  const shiftsByDate: Record<string, MedicalShift[]> = {};
  activeShifts.forEach((shift) => {
    if (!shiftsByDate[shift.date]) {
      shiftsByDate[shift.date] = [];
    }
    shiftsByDate[shift.date].push(shift);
  });

  const activeHosp = hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];
  const activeHospColor = activeHosp?.color || activeHosp?.gradientStart || '#0d9488';
  const activeShiftColor = getShiftColor(selectedTemplateCode, templates);
  const activeTpl = templates.find((t) => t.code === selectedTemplateCode);

  const handleDayClick = (dayItem: CalendarDayItem) => {
    // 1. Normal mode: abre modal de edición de día completo
    if (interactionMode === 'normal') {
      onSelectDate(dayItem.date);
      return;
    }

    const allDayShifts = shifts.filter((s) => s.date === dayItem.date);

    // 2. Modo Libre (🌴)
    if (interactionMode === 'quick_libre') {
      if (!onSaveDayShifts) return;
      const isAlreadyLibre = allDayShifts.length > 0 && allDayShifts.every(
        (s) => s.shiftCode === 'L' || s.title.toLowerCase().includes('descanso') || s.title.toLowerCase().includes('libre total')
      );

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(25); } catch {}
      }

      if (isAlreadyLibre) {
        // Desmarcar día libre (lo deja vacío)
        onSaveDayShifts(dayItem.date, []);
      } else {
        // Asignar día libre total (palmerita de descanso)
        const libreShift: MedicalShift = {
          id: `shift-libre-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          date: dayItem.date,
          hospitalId: '',
          shiftCode: 'L',
          title: 'Día Libre Descanso',
          startTime: '00:00',
          endTime: '23:59',
          hours: 0,
          color: '#10b981',
          isNightShift: false,
        };
        onSaveDayShifts(dayItem.date, [libreShift]);
      }
      return;
    }

    // 3. Modo Eliminar (🗑️)
    if (interactionMode === 'quick_delete') {
      if (allDayShifts.length === 0) {
        return;
      }
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(30); } catch {}
      }
      // Abrir popup dinámico de eliminación según los turnos de ese día
      setDeleteTargetDay({
        date: dayItem.date,
        shifts: allDayShifts,
      });
      return;
    }

    // 4. Modo Rápido (quick_paint)
    if (!onQuickAssignShift) {
      onSelectDate(dayItem.date);
      return;
    }

    const targetHosp = hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];
    const targetTpl = templates.find((t) => t.code === selectedTemplateCode);

    const newStartTime = targetTpl?.defaultStartTime || '07:00';
    const newEndTime = targetTpl?.defaultEndTime || '15:00';
    const newHours = targetTpl?.defaultHours || 8;
    const normalizedTargetCode = getShiftDisplayCode(selectedTemplateCode, templates);

    // Check if exact same shift already exists on this day in same hospital
    const exactMatch = allDayShifts.find((s) => {
      const sHosp = getHospitalForShift(s, hospitals);
      const sCode = getShiftDisplayCode(s.shiftCode, templates);
      return sHosp.id === targetHosp.id && sCode === normalizedTargetCode;
    });

    if (exactMatch) {
      // Toggle off / delete this exact shift
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(20); } catch { /* ignore */ }
      }
      onQuickAssignShift(dayItem.date, targetHosp.id, selectedTemplateCode, 'create', quickDepartment);
      return;
    }

    // Intelligent Conflict / Overlap Detection
    const newTimeSpan = {
      startTime: newStartTime,
      endTime: newEndTime,
      hours: newHours,
      shiftCode: selectedTemplateCode,
    };

    const conflictShift = allDayShifts.find((existing) => {
      if (isShiftLibre(existing.shiftCode) && isShiftLibre(selectedTemplateCode)) return false;
      return doShiftsOverlap(newTimeSpan, {
        startTime: existing.startTime,
        endTime: existing.endTime,
        hours: existing.hours,
        shiftCode: existing.shiftCode,
      });
    });

    if (conflictShift) {
      const existingHosp = getHospitalForShift(conflictShift, hospitals);
      setCollisionDialog({
        date: dayItem.date,
        newHospitalId: targetHosp.id,
        newHospitalName: targetHosp.shortName || targetHosp.name || 'Centro',
        newTemplateCode: selectedTemplateCode,
        newTime: `${newStartTime} - ${newEndTime}`,
        existingTitle: conflictShift.title || conflictShift.shiftCode,
        existingHospitalName: existingHosp?.shortName || existingHosp?.name || 'Otro Centro',
        existingTime: `${conflictShift.startTime} - ${conflictShift.endTime}`,
      });
      return;
    }

    // NO CONFLICT
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch {
        // Ignore
      }
    }
    onQuickAssignShift(dayItem.date, targetHosp.id, selectedTemplateCode, 'create', quickDepartment);
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* Quick Painter Mode Toggle Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-200 uppercase tracking-wider font-mono">
            Calendario de Turnos
          </span>
        </div>

        {/* 3 Modos: A. Modo Rápido, B. Libre, C. Eliminar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* A. Modo Rápido */}
          <button
            type="button"
            onClick={() => setInteractionMode(interactionMode === 'quick_paint' ? 'normal' : 'quick_paint')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer min-h-[38px] ${
              interactionMode === 'quick_paint'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/25 ring-2 ring-amber-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Asignar rápidamente un centro y turno al tocar los días"
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>{interactionMode === 'quick_paint' ? 'Modo Rápido: ON' : 'Modo Rápido'}</span>
          </button>

          {/* B. Libre */}
          <button
            type="button"
            onClick={() => setInteractionMode(interactionMode === 'quick_libre' ? 'normal' : 'quick_libre')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer min-h-[38px] ${
              interactionMode === 'quick_libre'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-emerald-500/25 ring-2 ring-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
            }`}
            title="Marcar día como Libre Descanso total (palmerita) al tocarlo"
          >
            <span>🌴</span>
            <span>{interactionMode === 'quick_libre' ? 'Libre: ON' : 'Libre'}</span>
          </button>

          {/* C. Ícono de Eliminar */}
          <button
            type="button"
            onClick={() => setInteractionMode(interactionMode === 'quick_delete' ? 'normal' : 'quick_delete')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer min-h-[38px] ${
              interactionMode === 'quick_delete'
                ? 'bg-rose-600 hover:bg-rose-500 text-white font-black shadow-rose-500/25 ring-2 ring-rose-300'
                : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700'
            }`}
            title="Tocar un día para elegir qué turnos eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{interactionMode === 'quick_delete' ? 'Borrar: ON' : 'Eliminar'}</span>
          </button>
        </div>
      </div>

      {/* Quick Painter Toolbar (Visible when isQuickMode is active) */}
      {isQuickMode && (
        <div className="p-3 sm:p-4 bg-slate-950/95 border-b border-amber-500/40 space-y-3 shadow-xl animate-in fade-in duration-200">
          {/* 1. Selector de Lugar (Centros con color sólido) */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-mono block">
              1. Selecciona Centro de Trabajo:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              {hospitals.map((hosp) => {
                const isSel = selectedHospitalId === hosp.id;
                const hospColor = hosp.color || hosp.gradientStart || '#0d9488';
                return (
                  <button
                    key={hosp.id}
                    type="button"
                    onClick={() => setSelectedHospitalId(hosp.id)}
                    className={`min-h-[42px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all border ${
                      isSel
                        ? 'text-white border-white shadow-lg ring-2 ring-white scale-102 font-black'
                        : 'text-slate-300 bg-slate-900 border-slate-800 hover:text-white'
                    }`}
                    style={{
                      backgroundColor: isSel ? hospColor : undefined,
                    }}
                  >
                    <span className="text-base">{hosp.emoji || '🏥'}</span>
                    <span>{hosp.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Selector de Turno (Colores de plantillas) */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider font-mono block">
              2. Selecciona Turno a asignar:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
              {templates.map((tpl) => {
                const isSel = selectedTemplateCode === tpl.code;
                const shiftColor = getShiftColor(tpl.code, templates);
                const shiftGrad = getShiftGradient(shiftColor);
                const textColor = shiftGrad.textColor;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateCode(tpl.code)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                      isSel
                        ? 'border-white shadow-lg ring-2 ring-white scale-105 font-black'
                        : 'text-slate-300 bg-slate-900 border-slate-800 hover:text-white'
                    }`}
                    style={{
                      background: isSel ? shiftGrad.background : undefined,
                      borderColor: isSel ? shiftGrad.borderColor : undefined,
                      color: isSel ? textColor : undefined,
                    }}
                  >
                    {tpl.code === 'CHOQUE' ? '⚠️ Choque' : tpl.name || tpl.code}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Área de trabajo / Sala / Departamento (Textbox) */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider font-mono block">
              3. Área de trabajo / Sala (opcional):
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quickDepartment}
                onChange={(e) => setQuickDepartment(e.target.value)}
                placeholder="Ej: Quirófano, UCI, Emergencias, Piso 3, Sala de Partos..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none shadow-inner min-h-[40px]"
              />
              {quickDepartment && (
                <button
                  type="button"
                  onClick={() => setQuickDepartment('')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold shrink-0 min-h-[40px]"
                  title="Limpiar área"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Banner de Previsualización: 2 Filas (Arriba Turno, Abajo Centro) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Tarjeta de previsualización 2 filas con degradado armónico */}
              <div
                className="px-2.5 py-1.5 rounded-xl border flex flex-col justify-center items-center text-center gap-0.5 shadow-md overflow-hidden shrink-0 min-w-[85px]"
                style={{
                  background: getShiftGradient(activeShiftColor).background,
                  borderColor: getShiftGradient(activeShiftColor).borderColor,
                  color: getShiftGradient(activeShiftColor).textColor,
                }}
              >
                {/* Fila 1: Turno Centrado */}
                <div className="w-full flex items-center justify-center text-center leading-none overflow-hidden">
                  <span
                    className="font-black font-mono tracking-tight text-center truncate block leading-none drop-shadow-sm"
                    style={{
                      fontSize: `${getAutoFitFontSize(activeTpl?.name || selectedTemplateCode, 15.5, 9, 65)}px`,
                    }}
                  >
                    {activeTpl?.name || selectedTemplateCode}
                  </span>
                </div>
                {/* Fila 2: Centro Centrado */}
                <div className="w-full flex items-center justify-center text-center leading-tight overflow-hidden">
                  <span
                    className="font-extrabold tracking-tight opacity-90 text-center truncate block leading-tight drop-shadow-sm"
                    style={{
                      fontSize: `${getAutoFitFontSize(activeHosp?.shortName || 'Centro', 13.5, 8.5, 65)}px`,
                    }}
                  >
                    {activeHosp?.shortName || 'Centro'}
                  </span>
                </div>
              </div>

              <div className="min-w-0 leading-tight">
                <p className="text-slate-200 font-bold">
                  {quickDepartment ? <span className="text-teal-300">Área: {quickDepartment} · </span> : ''}
                  Toca cualquier día para asignar o quitar este turno.
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  Si hay turnos en otro horario, se agregan sumando horas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInteractionMode('normal')}
              className="self-end sm:self-auto text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer min-h-[36px] flex items-center gap-1"
            >
              <span>✕ Salir de Modo Rápido</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner de Modo Libre (🌴) */}
      {interactionMode === 'quick_libre' && (
        <div className="p-3 bg-emerald-950/85 border-b border-emerald-600/50 flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 text-emerald-200 min-w-0">
            <span className="text-xl shrink-0">🌴</span>
            <div className="min-w-0">
              <p className="font-black text-emerald-100 flex items-center gap-1.5">
                <span>Modo Día Libre (Descanso) Activo</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">1 toque</span>
              </p>
              <p className="text-[11px] text-emerald-300/80 truncate">
                Toca cualquier día para marcarlo como descanso total con palmerita o para desmarcarlo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInteractionMode('normal')}
            className="px-3 py-1.5 rounded-xl bg-emerald-900/70 hover:bg-emerald-800 text-white text-xs font-bold border border-emerald-700/70 shrink-0 cursor-pointer min-h-[34px]"
          >
            ✕ Salir
          </button>
        </div>
      )}

      {/* Banner de Modo Eliminar (🗑️) */}
      {interactionMode === 'quick_delete' && (
        <div className="p-3 bg-rose-950/85 border-b border-rose-600/50 flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 text-rose-200 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-300 shrink-0 border border-rose-500/30">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-rose-100">
                Modo Eliminación Rápida Activo
              </p>
              <p className="text-[11px] text-rose-300/80 truncate">
                Toca cualquier día con turnos asignados para elegir qué turnos deseas borrar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInteractionMode('normal')}
            className="px-3 py-1.5 rounded-xl bg-rose-900/70 hover:bg-rose-800 text-white text-xs font-bold border border-rose-700/70 shrink-0 cursor-pointer min-h-[34px]"
          >
            ✕ Salir
          </button>
        </div>
      )}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900 text-center">
        {SPANISH_WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`py-2.5 text-xs font-bold uppercase tracking-wider ${
              i >= 5 ? 'text-amber-400/80 bg-amber-500/5' : 'text-slate-400'
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60 bg-slate-950/40">
        {days.map((dayItem) => {
          const allDayShifts = shiftsByDate[dayItem.date] || [];
          const isWholeDayLibre = allDayShifts.length > 0 && allDayShifts.every((s) => s.shiftCode === 'L' || s.title.toLowerCase().includes('descanso') || s.title.toLowerCase().includes('libre total'));
          
          // Detect unresolved collision/conflict on this day
          const dayHasCollision = allDayShifts.some((s) => isShiftCollision(s.shiftCode) || s.isCollision) ||
            (allDayShifts.filter((s) => !isShiftLibre(s.shiftCode)).length >= 2 &&
             allDayShifts.filter((s) => !isShiftLibre(s.shiftCode)).some((a, i, arr) => arr.some((b, j) => i !== j && doShiftsOverlap(a, b))));

          // Day shifts to display as cards
          const dayShifts = isWholeDayLibre
            ? []
            : allDayShifts.filter((s) => s.title !== 'Día Libre / Descanso');

          // Sum hours excluding any LIBRE shifts
          const totalHours = dayShifts.reduce(
            (acc, s) => (isShiftLibre(s.shiftCode) ? acc : acc + (s.hours || 0)),
            0
          );
          const is24H = totalHours >= 24;
          const isExtended = totalHours >= 16 && totalHours < 24;

          return (
            <div
              key={dayItem.date}
              onClick={() => handleDayClick(dayItem)}
              className={`min-h-[125px] sm:min-h-[135px] p-0.5 sm:p-1.5 flex flex-col justify-between transition-all cursor-pointer relative group ${
                dayHasCollision
                  ? 'ring-2 ring-inset ring-red-500 bg-red-950/30'
                  : dayItem.isToday
                  ? 'samsung-today-edge'
                  : is24H
                  ? 'ring-2 ring-inset ring-amber-500/70 bg-amber-950/25 animate-pulse'
                  : isWholeDayLibre
                  ? 'bg-emerald-950/20 ring-1 ring-inset ring-emerald-500/30'
                  : !dayItem.isCurrentMonth
                  ? 'opacity-35 bg-slate-950/30'
                  : dayItem.isWeekend
                  ? 'bg-slate-900/30'
                  : 'hover:bg-slate-800/40'
              }`}
            >
              {/* Day Header Row */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className={`text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center font-mono ${
                    dayHasCollision
                      ? 'bg-red-500 text-white font-black shadow-md'
                      : dayItem.isToday
                      ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold shadow-teal-500/30'
                      : dayItem.isCurrentMonth
                      ? 'text-slate-200'
                      : 'text-slate-500'
                  }`}
                >
                  {dayItem.dayNumber}
                </span>

                {/* Day status badge */}
                <div className="flex items-center gap-1">
                  {dayHasCollision ? (
                    <span
                      className="p-0.5 rounded text-red-100 bg-red-600 border border-red-400 shadow-sm animate-pulse flex items-center justify-center shrink-0"
                      title="¡Conflicto de horario / Choque entre turnos!"
                    >
                      <AlertTriangle className="w-3 h-3" />
                    </span>
                  ) : is24H ? (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono text-amber-200 bg-amber-500/25 border border-amber-500/40 shadow-sm"
                      title="¡Jornada de 24 horas continuas trabajadas!"
                    >
                      24H
                    </span>
                  ) : totalHours > 0 ? (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                        isExtended
                          ? 'text-purple-300 bg-purple-500/20 border border-purple-500/30'
                          : 'text-slate-400 bg-slate-800/60'
                      }`}
                    >
                      {totalHours}h
                    </span>
                  ) : isWholeDayLibre ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 shadow-sm">
                      Libre
                    </span>
                  ) : null}

                  {/* Hover icon */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-teal-300 p-0.5 rounded">
                    {interactionMode === 'quick_paint' ? (
                      <Paintbrush className="w-3.5 h-3.5 text-amber-400" />
                    ) : interactionMode === 'quick_libre' ? (
                      <span className="text-xs">🌴</span>
                    ) : interactionMode === 'quick_delete' ? (
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </span>
                </div>
              </div>

              {/* Day Body: Either Whole Day Off Banner OR List of Shift Cards */}
              {isWholeDayLibre ? (
                <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center my-auto shadow-inner">
                  <span className="text-base sm:text-lg">🌴</span>
                  <span className="font-extrabold text-[11px] sm:text-xs text-emerald-200 tracking-tight leading-tight">
                    Día Libre
                  </span>
                  <span className="text-[9px] text-emerald-400/80 font-medium">Descanso</span>
                </div>
              ) : (
                <div className="flex-1 space-y-1 sm:space-y-1.5 overflow-hidden">
                  {dayShifts.slice(0, 3).map((shift, idx) => {
                    const hosp = getHospitalForShift(shift, hospitals);
                    const shiftColor = getShiftColor(shift.shiftCode, templates);
                    const shiftGrad = getShiftGradient(shiftColor);

                    const shiftTemplate = templates.find((t) => t.code === shift.shiftCode);
                    const isLibreShift = isShiftLibre(shift.shiftCode);
                    const isCollisionShift = isShiftCollision(shift.shiftCode) || shift.isCollision;
                    const shiftDisplayName = isCollisionShift
                      ? '⚠️'
                      : (shiftTemplate?.name || getShiftDisplayCode(shift.shiftCode, templates) || shift.title || shift.shiftCode || 'TA');
                    const hospShortName = hosp?.shortName || hosp?.name || 'Centro';
                    const shiftFontSize = getAutoFitFontSize(shiftDisplayName, true);
                    const hospFontSize = getAutoFitFontSize(hospShortName, false);

                    return (
                      <div
                        key={shift.id || idx}
                        className={`rounded-lg py-0.5 px-0.5 sm:py-1 sm:px-1 shadow-sm flex flex-col justify-center items-center text-center gap-0.5 transition-all hover:scale-[1.02] relative overflow-hidden border ${
                          isCollisionShift
                            ? 'ring-1 ring-red-400/80 border-red-500/80'
                            : ''
                        }`}
                        style={{
                          background: isCollisionShift
                            ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                            : shiftGrad.background,
                          borderColor: isCollisionShift ? 'rgba(239, 68, 68, 0.4)' : shiftGrad.borderColor,
                          color: isCollisionShift ? '#ffffff' : shiftGrad.textColor,
                          boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.4)',
                        }}
                        title={`${shift.title} en ${hosp?.name || 'Centro'} (${shift.startTime} - ${shift.endTime}) · ${isLibreShift ? '0h (Libre)' : `${shift.hours}h`}${shift.department ? ` · Área: ${shift.department}` : ''}${shift.notes ? ` · 📝 ${shift.notes}` : ''}`}
                      >
                        {/* Fila 1 (Arriba): Nombre del Turno Centrado y Auto-ajustado */}
                        <div className="w-full flex items-center justify-center text-center leading-none overflow-hidden">
                          <span
                            className="font-black font-sans tracking-tight text-center truncate block leading-none drop-shadow-sm"
                            style={{
                              fontSize: `${shiftFontSize}px`,
                            }}
                          >
                            {shiftDisplayName}
                          </span>
                        </div>

                        {/* Fila 2 (Abajo): Nombre abreviado del centro Centrado y Auto-ajustado */}
                        <div className="w-full flex items-center justify-center text-center leading-tight overflow-hidden">
                          <span
                            className="font-extrabold font-sans tracking-tight opacity-90 text-center truncate block leading-tight drop-shadow-sm"
                            style={{
                              fontSize: `${hospFontSize}px`,
                            }}
                          >
                            {hospShortName}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* If more than 3 shifts on the same day */}
                  {dayShifts.length > 3 && (
                    <div className="text-[10px] text-center text-teal-400 font-semibold bg-slate-900/80 rounded py-0.5">
                      +{dayShifts.length - 3} turnos más
                    </div>
                  )}
                </div>
              )}

              {/* Bottom hospital indicator dots on tablet/desktop */}
              {dayShifts.length > 1 && (
                <div className="hidden sm:flex items-center gap-1 pt-1 justify-end">
                  {dayShifts.map((s, i) => {
                    const h = getHospitalForShift(s, hospitals);
                    return (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: h?.color || '#0d9488' }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Collision Resolution Modal (Shown when clicking in Quick Mode on conflicting shift) */}
      {collisionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-red-500/60 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-100">¿Choque de Horario?</h3>
                <p className="text-xs text-rose-300/80">Conflicto de horas en {formatFriendlyDate(collisionDialog.date)}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <p className="text-slate-300">
                Ya tienes un turno en <strong className="text-white">{collisionDialog.existingHospitalName}</strong>:
              </p>
              <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-mono font-bold flex items-center justify-between">
                <span>{collisionDialog.existingTitle}</span>
                <span>{collisionDialog.existingTime}</span>
              </div>
              <p className="text-slate-400 pt-1">
                Y estás agregando un turno con horario solapado: <strong className="text-teal-300">{collisionDialog.newHospitalName} · {collisionDialog.newTemplateCode} ({collisionDialog.newTime})</strong>
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onQuickAssignShift?.(
                    collisionDialog.date,
                    collisionDialog.newHospitalId,
                    collisionDialog.newTemplateCode,
                    'mark_collision',
                    quickDepartment
                  );
                  setCollisionDialog(null);
                }}
                className="w-full py-3 px-3 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-red-950/50 cursor-pointer min-h-[44px]"
              >
                <span>⚡ Marcar Choque (Alerta Roja)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onQuickAssignShift?.(
                    collisionDialog.date,
                    collisionDialog.newHospitalId,
                    collisionDialog.newTemplateCode,
                    'replace',
                    quickDepartment
                  );
                  setCollisionDialog(null);
                }}
                className="w-full py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer min-h-[44px]"
              >
                <span>🔄 Sobrescribir (Reemplazar existente)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onQuickAssignShift?.(
                    collisionDialog.date,
                    collisionDialog.newHospitalId,
                    collisionDialog.newTemplateCode,
                    'keep_both',
                    quickDepartment
                  );
                  setCollisionDialog(null);
                }}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer min-h-[44px]"
              >
                <span>➕ Mantener ambos turnos</span>
              </button>

              <button
                type="button"
                onClick={() => setCollisionDialog(null)}
                className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-200 cursor-pointer min-h-[36px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Delete Modal for quick_delete mode */}
      {deleteTargetDay && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-500/30">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <span>Eliminar turnos del día</span>
                </h3>
                <p className="text-xs text-slate-400 capitalize mt-1">
                  {formatFriendlyDate(deleteTargetDay.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTargetDay(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              ¿Qué deseas eliminar de este día?
            </p>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {/* Opción 1: Eliminar TODO el día */}
              <button
                type="button"
                onClick={() => {
                  onSaveDayShifts?.(deleteTargetDay.date, []);
                  setDeleteTargetDay(null);
                }}
                className="w-full p-3 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 active:scale-95 transition-all cursor-pointer min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar TODO ({deleteTargetDay.shifts.length} {deleteTargetDay.shifts.length === 1 ? 'turno' : 'turnos'})</span>
              </button>

              {/* Opción 2: Eliminar turnos específicos dinámicamente si hay más de 1 */}
              {deleteTargetDay.shifts.length > 1 && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    O borrar turno individual:
                  </p>
                  {deleteTargetDay.shifts.map((s) => {
                    const hosp = hospitals.find((h) => h.id === s.hospitalId);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          const remaining = deleteTargetDay.shifts.filter((x) => x.id !== s.id);
                          onSaveDayShifts?.(deleteTargetDay.date, remaining);
                          setDeleteTargetDay(null);
                        }}
                        className="w-full p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-medium flex items-center justify-between gap-2 border border-slate-800 hover:border-rose-500/50 active:scale-95 transition-all cursor-pointer min-h-[42px] text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-rose-300 block truncate">
                            Borrar solo: {s.title || s.shiftCode}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {s.startTime} - {s.endTime} {hosp ? `· ${hosp.shortName}` : ''}
                          </span>
                        </div>
                        <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDeleteTargetDay(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer min-h-[38px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
