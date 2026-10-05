import React from 'react';
import {
  Plus, Clock, Moon, ShieldAlert, Building2, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import {
  CalendarDayItem, SPANISH_WEEKDAYS, formatFriendlyDate, SPANISH_MONTHS,
  getShiftDisplayCode, isShiftLibre, isShiftCollision, getContrastTextColor
} from '../lib/timeUtils';
import { MedicalShift, Hospital, ShiftTemplate } from '../types';
import { getHospitalForShift, getShiftColor } from '../lib/storage';

interface CalendarWeekViewProps {
  days: CalendarDayItem[];
  shifts: MedicalShift[];
  hospitals: Hospital[];
  templates?: ShiftTemplate[];
  filteredHospitalId?: string;
  onSelectDate: (date: string) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onToday?: () => void;
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  days,
  shifts,
  hospitals,
  templates = [],
  filteredHospitalId = 'all',
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onToday,
}) => {
  const activeShifts = filteredHospitalId === 'all'
    ? shifts
    : shifts.filter((s) => s.hospitalId === filteredHospitalId || s.shiftCode === 'L');

  const shiftsByDate: Record<string, MedicalShift[]> = {};
  activeShifts.forEach((shift) => {
    if (!shiftsByDate[shift.date]) {
      shiftsByDate[shift.date] = [];
    }
    shiftsByDate[shift.date].push(shift);
  });

  // Calculate week label range from days array
  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  let weekRangeLabel = 'Semana';
  if (firstDay && lastDay) {
    const [y1, m1, d1] = firstDay.date.split('-').map(Number);
    const [y2, m2, d2] = lastDay.date.split('-').map(Number);
    if (m1 === m2) {
      weekRangeLabel = `${d1} al ${d2} de ${SPANISH_MONTHS[m1 - 1]} ${y1}`;
    } else {
      weekRangeLabel = `${d1} ${SPANISH_MONTHS[m1 - 1]?.slice(0, 3)} - ${d2} ${SPANISH_MONTHS[m2 - 1]?.slice(0, 3)} ${y2}`;
    }
  }

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-5 space-y-4">
      {/* Week Navigator Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
              Vista Semanal
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-100">
              {weekRangeLabel}
            </span>
          </div>
        </div>

        {/* Previous / Next Week buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {onPrevWeek && (
            <button
              onClick={onPrevWeek}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 flex items-center gap-1 transition-colors min-h-[36px]"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4 text-teal-400" />
              <span>Semana anterior</span>
            </button>
          )}

          {onToday && (
            <button
              onClick={onToday}
              className="px-3 py-1.5 bg-teal-950/60 hover:bg-teal-900/60 text-teal-300 rounded-xl text-xs font-bold border border-teal-800/40 transition-colors min-h-[36px]"
            >
              Esta semana
            </button>
          )}

          {onNextWeek && (
            <button
              onClick={onNextWeek}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 flex items-center gap-1 transition-colors min-h-[36px]"
              title="Semana siguiente"
            >
              <span>Semana siguiente</span>
              <ChevronRight className="w-4 h-4 text-teal-400" />
            </button>
          )}
        </div>
      </div>

      {/* Week Grid (7 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
        {days.map((dayItem, index) => {
          const allDayShifts = shiftsByDate[dayItem.date] || [];
          const isWholeDayLibre = allDayShifts.length > 0 && allDayShifts.every((s) => s.shiftCode === 'L' || s.title.toLowerCase().includes('descanso') || s.title.toLowerCase().includes('libre total'));
          const dayShifts = isWholeDayLibre ? [] : allDayShifts.filter((s) => s.title !== 'Día Libre / Descanso');
          const dayOffShift = allDayShifts.find((s) => isShiftLibre(s.shiftCode));
          const totalHours = dayShifts.reduce((acc, s) => (isShiftLibre(s.shiftCode) ? acc : acc + (s.hours || 0)), 0);
          const is24H = totalHours >= 24;

          return (
            <div
              key={dayItem.date}
              onClick={() => onSelectDate(dayItem.date)}
              className={`rounded-2xl p-3 border transition-all cursor-pointer flex flex-col justify-between min-h-[220px] ${
                dayItem.isToday
                  ? 'samsung-today-edge'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Day header */}
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2.5">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400">
                      {SPANISH_WEEKDAYS[index]}
                    </span>
                    <p className={`text-base font-bold font-mono ${dayItem.isToday ? 'text-teal-400' : 'text-slate-100'}`}>
                      {dayItem.dayNumber}
                    </p>
                  </div>

                  <div className="text-right">
                    {is24H ? (
                      <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        24H
                      </span>
                    ) : totalHours > 0 ? (
                      <span className="text-xs font-bold text-teal-400 font-mono">
                        {totalHours}h
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">0h</span>
                    )}
                  </div>
                </div>

                {/* Day off tag */}
                {dayOffShift && (
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 text-center mb-2 font-medium">
                    Libre
                  </div>
                )}

                {/* Shifts inside this day */}
                <div className="space-y-1.5">
                  {dayShifts.map((shift) => {
                    const hosp = getHospitalForShift(shift, hospitals);
                    const workplaceColor = hosp?.color || hosp?.gradientStart || '#0d9488';
                    const shiftColor = getShiftColor(shift.shiftCode, templates);
                    const isCollisionShift = isShiftCollision(shift.shiftCode) || shift.isCollision;
                    const isLibre = isShiftLibre(shift.shiftCode);
                    const shiftTextColor = getContrastTextColor(shiftColor);

                    return (
                      <div
                        key={shift.id}
                        className={`p-2.5 rounded-xl text-white text-xs shadow-md space-y-1 relative overflow-hidden bg-slate-900 border ${
                          isCollisionShift
                            ? 'border-red-500/80 ring-1 ring-red-500/60 bg-red-950/40'
                            : isLibre
                            ? 'border-emerald-500/40 bg-slate-900/90'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Barra lateral del centro */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1.5"
                          style={{
                            backgroundColor: isCollisionShift ? '#ef4444' : workplaceColor,
                          }}
                        />

                        <div className="flex items-center justify-between gap-1 pl-1">
                          <span className="font-extrabold text-white text-xs truncate flex items-center gap-1">
                            {hosp?.emoji && <span className="text-xs leading-none shrink-0">{hosp.emoji}</span>}
                            <span>{hosp?.shortName || hosp?.name || 'Centro'}</span>
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded-md font-mono font-black text-[10px] shadow-sm border border-white/20"
                            style={{
                              backgroundColor: isCollisionShift ? '#dc2626' : isLibre ? '#059669' : shiftColor,
                              color: isCollisionShift || isLibre ? '#ffffff' : shiftTextColor,
                            }}
                          >
                            {isCollisionShift ? '⚠️ CHOQUE' : getShiftDisplayCode(shift.shiftCode)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10.5px] opacity-90 font-mono pl-1">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3 h-3 text-teal-400" />
                            {shift.startTime} - {shift.endTime}
                          </span>
                          <span className="font-bold text-teal-300">
                            {isLibre ? '0h' : `${shift.hours}h`}
                          </span>
                        </div>

                        {shift.notes && (
                          <p className="text-[10px] text-amber-200 bg-black/25 px-1 py-0.5 rounded truncate italic ml-1">
                            {shift.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day footer */}
              <div className="pt-2 mt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate">
                  {dayShifts.length > 0 ? `${dayShifts.length} turno${dayShifts.length > 1 ? 's' : ''}` : 'Sin turnos'}
                </span>
                <span className="text-teal-400 font-semibold group-hover:underline">
                  + Editar
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
