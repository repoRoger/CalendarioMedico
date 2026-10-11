import React from 'react';
import {
  Clock, Calendar, Plus, Edit2, FileText, Building2, Sun, Moon,
  ChevronRight, ArrowRight, UserCheck, Sparkles, AlertCircle, AlertTriangle
} from 'lucide-react';
import { Hospital, MedicalShift, ShiftTemplate, UserSession } from '../types';
import { getHospitalForShift, getShiftColor } from '../lib/storage';
import {
  getHondurasDate, getHondurasTodayIso, getHondurasTomorrowIso,
  SPANISH_MONTHS, SPANISH_WEEKDAYS_FULL, formatFriendlyDate,
  getShiftDisplayCode, isShiftCollision, isShiftLibre, getContrastTextColor
} from '../lib/timeUtils';

interface ProximosViewProps {
  shifts: MedicalShift[];
  hospitals: Hospital[];
  templates?: ShiftTemplate[];
  user: UserSession;
  onEditDay: (dateIso: string) => void;
  onGoToCalendar: () => void;
  onOpenWorkplaces: () => void;
}

export const ProximosView: React.FC<ProximosViewProps> = ({
  shifts,
  hospitals,
  templates = [],
  user,
  onEditDay,
  onGoToCalendar,
  onOpenWorkplaces,
}) => {
  const hnDate = getHondurasDate();
  const todayIso = getHondurasTodayIso();
  const tomorrowIso = getHondurasTomorrowIso();

  const tomorrowDate = new Date(hnDate);
  tomorrowDate.setDate(hnDate.getDate() + 1);

  const todayShifts = shifts.filter((s) => s.date === todayIso && s.title !== 'Día Libre / Descanso');
  const tomorrowShifts = shifts.filter((s) => s.date === tomorrowIso && s.title !== 'Día Libre / Descanso');

  // Next upcoming shifts after tomorrow (up to 4)
  const futureShifts = shifts
    .filter((s) => s.date > tomorrowIso && s.title !== 'Día Libre / Descanso')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const formatHnDateDisplay = (date: Date) => {
    const dayName = SPANISH_WEEKDAYS_FULL[date.getDay()];
    const dayNum = date.getDate();
    const monthName = SPANISH_MONTHS[date.getMonth()];
    return `${dayName}, ${dayNum} de ${monthName}`;
  };

  const renderBadge = (shift: MedicalShift) => {
    const isCollision = isShiftCollision(shift.shiftCode) || shift.isCollision;
    const isLibre = isShiftLibre(shift.shiftCode);
    const shiftColor = getShiftColor(shift.shiftCode, templates);
    const textColor = getContrastTextColor(shiftColor);

    if (isCollision) {
      return (
        <span className="bg-red-600 text-white border border-red-400 px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 animate-pulse shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5" />
          CHOQUE
        </span>
      );
    }

    if (isLibre) {
      return (
        <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">
          Libre
        </span>
      );
    }

    return (
      <span
        className="px-2.5 py-1 rounded-lg text-xs font-black shadow-sm border border-white/20 font-mono"
        style={{
          backgroundColor: shiftColor,
          color: textColor,
        }}
      >
        {getShiftDisplayCode(shift.shiftCode, templates)}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Main Focus: Two Columns (HOY / MAÑANA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD 1: HOY */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 border-b-2 border-b-teal-500/60 shadow-xl shadow-teal-950/20 flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="space-y-3 relative z-10">
            {/* Header: HOY | Fecha Grande (flex-1) | Botón + */}
            <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
              <span className="px-2.5 py-1 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-black uppercase tracking-wider shrink-0">
                Hoy
              </span>

              <span className="flex-1 font-extrabold text-sm sm:text-base text-white truncate px-1">
                {formatHnDateDisplay(hnDate)}
              </span>

              <button
                onClick={() => onEditDay(todayIso)}
                className="w-10 h-10 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white flex items-center justify-center shadow-md shadow-teal-900/40 transition-transform active:scale-95 shrink-0 min-h-[40px] min-w-[40px]"
                title="Agregar o editar turno para hoy"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {todayShifts.length > 0 ? (
              <div className="space-y-3">
                {todayShifts.map((shift, idx) => {
                  const hosp = getHospitalForShift(shift, hospitals);
                  const workplaceColor = hosp?.color || hosp?.gradientStart || '#0d9488';
                  const isCollision = isShiftCollision(shift.shiftCode) || shift.isCollision;
                  const isLibre = isShiftLibre(shift.shiftCode);

                  return (
                    <div
                      key={shift.id || idx}
                      className={`p-3.5 pl-4 rounded-2xl bg-slate-950 border space-y-2 relative overflow-hidden shadow-lg transition-all ${
                        isCollision
                          ? 'border-red-500/60 ring-1 ring-red-500/50'
                          : 'border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      {/* Barra lateral sólida del centro */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 shadow-sm"
                        style={{
                          backgroundColor: isCollision ? '#ef4444' : workplaceColor,
                        }}
                      />

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Badge circular/cuadrado con color sólido del centro */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md font-bold text-lg"
                            style={{
                              backgroundColor: workplaceColor,
                            }}
                          >
                            {hosp?.emoji ? (
                              <span>{hosp.emoji}</span>
                            ) : (
                              <Building2 className="w-5 h-5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-extrabold text-sm sm:text-base text-white truncate drop-shadow-sm">
                              {hosp?.name || 'Centro de Trabajo'}
                            </p>
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <span>{hosp?.city || 'Honduras'}</span>
                              {shift.department && <span>· {shift.department}</span>}
                            </p>
                          </div>
                        </div>
                        {renderBadge(shift)}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs text-slate-300 font-mono">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-teal-400" />
                          {shift.startTime} - {shift.endTime}
                        </span>
                        <span className="font-bold text-teal-300">{isLibre ? '0h (Libre)' : `${shift.hours} horas`}</span>
                      </div>

                      {/* Highlighted Note */}
                      {shift.notes && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2 font-sans">
                          <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="leading-snug">
                            <span className="font-semibold text-amber-300">Nota: </span>
                            <span className="italic">{shift.notes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                <Sun className="w-8 h-8 mx-auto text-amber-400/60" />
                <p className="text-xs font-bold text-slate-200">Día Libre / Sin turno hoy</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  No tienes ningún turno programado para hoy. ¡Aprovecha para descansar o pulsa el botón (+) si te llamaron!
                </p>
              </div>
            )}
          </div>

          {/* Bottom Footer: Horas totales del día y botón Editar */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Total horas del día:</span>
              <span className="font-extrabold text-xs sm:text-sm font-mono text-teal-300 bg-teal-950/70 border border-teal-800/50 px-2.5 py-0.5 rounded-lg">
                {todayShifts.reduce((acc, s) => (isShiftLibre(s.shiftCode) ? acc : acc + (s.hours || 0)), 0)}h
              </span>
            </div>

            {todayShifts.length > 0 && (
              <button
                onClick={() => onEditDay(todayIso)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95 min-h-[38px]"
              >
                <Edit2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Editar turnos</span>
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: MAÑANA */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 border-b-2 border-b-indigo-500/60 shadow-xl shadow-indigo-950/20 flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="space-y-3 relative z-10">
            {/* Header: MAÑANA | Fecha Grande (flex-1) | Botón + */}
            <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
              <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-xs font-black uppercase tracking-wider shrink-0">
                Mañana
              </span>

              <span className="flex-1 font-extrabold text-sm sm:text-base text-white truncate px-1">
                {formatHnDateDisplay(tomorrowDate)}
              </span>

              <button
                onClick={() => onEditDay(tomorrowIso)}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center border border-slate-700 shadow-md transition-transform active:scale-95 shrink-0 min-h-[40px] min-w-[40px]"
                title="Agregar o editar turno para mañana"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {tomorrowShifts.length > 0 ? (
              <div className="space-y-3">
                {tomorrowShifts.map((shift, idx) => {
                  const hosp = getHospitalForShift(shift, hospitals);
                  const workplaceColor = hosp?.color || hosp?.gradientStart || '#0d9488';
                  const isCollision = isShiftCollision(shift.shiftCode) || shift.isCollision;
                  const isLibre = isShiftLibre(shift.shiftCode);

                  return (
                    <div
                      key={shift.id || idx}
                      className={`p-3.5 pl-4 rounded-2xl bg-slate-950 border space-y-2 relative overflow-hidden shadow-lg transition-all ${
                        isCollision
                          ? 'border-red-500/60 ring-1 ring-red-500/50'
                          : 'border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      {/* Barra lateral sólida del centro */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 shadow-sm"
                        style={{
                          backgroundColor: isCollision ? '#ef4444' : workplaceColor,
                        }}
                      />

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Badge con color sólido del centro */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md font-bold text-lg"
                            style={{
                              backgroundColor: workplaceColor,
                            }}
                          >
                            {hosp?.emoji ? (
                              <span>{hosp.emoji}</span>
                            ) : (
                              <Building2 className="w-5 h-5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-extrabold text-sm sm:text-base text-white truncate drop-shadow-sm">
                              {hosp?.name || 'Centro de Trabajo'}
                            </p>
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <span>{hosp?.city || 'Honduras'}</span>
                              {shift.department && <span>· {shift.department}</span>}
                            </p>
                          </div>
                        </div>
                        {renderBadge(shift)}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs text-slate-300 font-mono">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-teal-400" />
                          {shift.startTime} - {shift.endTime}
                        </span>
                        <span className="font-bold text-teal-300">{isLibre ? '0h (Libre)' : `${shift.hours} horas`}</span>
                      </div>

                      {/* Highlighted Note */}
                      {shift.notes && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start gap-2 font-sans">
                          <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="leading-snug">
                            <span className="font-semibold text-amber-300">Nota: </span>
                            <span className="italic">{shift.notes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                <Sun className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-bold text-slate-200">Día Libre / Sin turno mañana</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Aún no tienes turnos asignados para mañana. Pulsa el botón (+) para programar uno.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Footer: Horas totales del día y botón Editar */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Total horas del día:</span>
              <span className="font-extrabold text-xs sm:text-sm font-mono text-slate-300 bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded-lg">
                {tomorrowShifts.reduce((acc, s) => (isShiftLibre(s.shiftCode) ? acc : acc + (s.hours || 0)), 0)}h
              </span>
            </div>

            {tomorrowShifts.length > 0 && (
              <button
                onClick={() => onEditDay(tomorrowIso)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95 min-h-[38px]"
              >
                <Edit2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Editar turnos</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subsequent upcoming shifts preview with lateral workplace bar */}
      {futureShifts.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>Siguientes Días Programados</span>
            </span>
            <button
              onClick={onGoToCalendar}
              className="text-xs text-teal-400 hover:underline flex items-center gap-1 py-1"
            >
              <span>Ver todos en calendario</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {futureShifts.map((shift, idx) => {
              const hosp = getHospitalForShift(shift, hospitals);
              const workplaceColor = hosp?.color || hosp?.gradientStart || '#0d9488';
              const isCollision = isShiftCollision(shift.shiftCode) || shift.isCollision;

              return (
                <div
                  key={shift.id || idx}
                  onClick={() => onEditDay(shift.date)}
                  className="p-3 pl-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 hover:border-slate-700 cursor-pointer flex items-center justify-between gap-2.5 transition-all active:scale-[0.99] min-h-[60px] relative overflow-hidden shadow-md"
                >
                  {/* Barra lateral del centro */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 shadow-sm"
                    style={{
                      backgroundColor: isCollision ? '#ef4444' : workplaceColor,
                    }}
                  />

                  <div className="flex items-center gap-2.5 min-w-0 pl-1">
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-white truncate">
                        {formatFriendlyDate(shift.date).split(',')[0]} · {shift.date.split('-').slice(1).reverse().join('/')}
                      </p>
                      <p className="text-[11px] text-slate-300 font-semibold truncate flex items-center gap-1">
                        {hosp?.emoji && <span>{hosp.emoji}</span>}
                        <span className="text-white font-bold">{hosp?.shortName || 'Centro'}</span>
                        <span className="text-slate-400 font-mono">· {shift.startTime}-{shift.endTime} ({shift.hours}h)</span>
                      </p>
                    </div>
                  </div>
                  {renderBadge(shift)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
