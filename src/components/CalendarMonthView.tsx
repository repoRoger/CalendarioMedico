import React from 'react';
import { Plus, Clock, Moon, Sparkles, Building2 } from 'lucide-react';
import { CalendarDayItem, SPANISH_WEEKDAYS, getShiftDisplayCode, getShiftMobileLabel } from '../lib/timeUtils';
import { MedicalShift, Hospital } from '../types';
import { getHospitalForShift } from '../lib/storage';

interface CalendarMonthViewProps {
  days: CalendarDayItem[];
  shifts: MedicalShift[];
  hospitals: Hospital[];
  filteredHospitalId?: string;
  onSelectDate: (date: string) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  days,
  shifts,
  hospitals,
  filteredHospitalId = 'all',
  onSelectDate,
}) => {
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

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
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
          // A day is a full-day off if it has a shift with shiftCode 'L' / 'LIBRE' that was created as a full day off
          const isWholeDayLibre = allDayShifts.length > 0 && allDayShifts.every((s) => s.shiftCode === 'L' || (s.shiftCode === 'LIBRE' && s.title.toLowerCase().includes('libre')));
          
          // Day shifts to display as cards
          const dayShifts = isWholeDayLibre
            ? []
            : allDayShifts.filter((s) => s.title !== 'Día Libre / Descanso');

          // Sum hours excluding any LIBRE shifts
          const totalHours = dayShifts.reduce(
            (acc, s) => (s.shiftCode === 'LIBRE' || s.shiftCode === 'L' ? acc : acc + (s.hours || 0)),
            0
          );
          const is24H = totalHours >= 24;
          const isExtended = totalHours >= 16 && totalHours < 24;

          return (
            <div
              key={dayItem.date}
              onClick={() => onSelectDate(dayItem.date)}
              className={`min-h-[125px] sm:min-h-[135px] p-1 sm:p-1.5 flex flex-col justify-between transition-all cursor-pointer relative group ${
                is24H
                  ? 'ring-2 ring-inset ring-amber-500/70 bg-amber-950/25 animate-pulse'
                  : isWholeDayLibre
                  ? 'bg-emerald-950/20 ring-1 ring-inset ring-emerald-500/30'
                  : !dayItem.isCurrentMonth
                  ? 'opacity-35 bg-slate-950/30'
                  : dayItem.isToday
                  ? 'bg-teal-950/20 ring-1 ring-inset ring-teal-500/30'
                  : dayItem.isWeekend
                  ? 'bg-slate-900/30'
                  : 'hover:bg-slate-800/40'
              }`}
            >
              {/* Day Header Row */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className={`text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center font-mono ${
                    dayItem.isToday
                      ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold shadow-teal-500/30'
                      : dayItem.isCurrentMonth
                      ? 'text-slate-200'
                      : 'text-slate-500'
                  }`}
                >
                  {dayItem.dayNumber}
                </span>

                {/* Day status badge (e.g. 24H or total hours) */}
                <div className="flex items-center gap-1">
                  {is24H ? (
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

                  {/* Hover Quick Edit Icon */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-teal-300 p-0.5 rounded">
                    <Plus className="w-3.5 h-3.5" />
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
                <div className="flex-1 space-y-1.5 overflow-hidden">
                  {dayShifts.slice(0, 3).map((shift, idx) => {
                    const hosp = getHospitalForShift(shift, hospitals);
                    const gradStart = hosp?.gradientStart || hosp?.color || '#0d9488';
                    const gradEnd = hosp?.gradientEnd || '#059669';

                    const displayCode = getShiftDisplayCode(shift.shiftCode);
                    const hospShortName = hosp?.shortName || hosp?.name || 'Centro';
                    const isLibreShift = shift.shiftCode === 'LIBRE' || shift.shiftCode === 'L';

                    return (
                      <div
                        key={shift.id || idx}
                        className={`rounded-lg px-1.5 py-1 shadow-md flex flex-col justify-center border transition-transform hover:scale-[1.02] ${
                          isLibreShift
                            ? 'border-emerald-500/40 text-emerald-200'
                            : 'border-white/20 text-white'
                        }`}
                        style={{
                          background: isLibreShift
                            ? `linear-gradient(135deg, ${gradStart}33, #064e3b99)`
                            : `linear-gradient(135deg, ${gradStart}, ${gradEnd})`,
                        }}
                        title={`${shift.title} en ${hosp?.name || 'Centro'} (${shift.startTime} - ${shift.endTime}) · ${isLibreShift ? '0h (Libre)' : `${shift.hours}h`}${shift.notes ? ` · 📝 ${shift.notes}` : ''}`}
                      >
                        {/* Línea 1: Turno grande y legible (e.g. TA, TB, TC, 24H, TA-TB, LIBRE) */}
                        <div className="flex items-center justify-between gap-1 leading-none font-mono">
                          <span className={`font-black text-[11.5px] sm:text-[13px] tracking-wide drop-shadow ${
                            isLibreShift ? 'text-emerald-300' : 'text-white'
                          }`}>
                            {displayCode}
                          </span>
                          {isLibreShift ? (
                            <span className="text-[8px] font-sans font-bold bg-emerald-950/80 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/30">
                              0h
                            </span>
                          ) : shift.notes ? (
                            <span
                              className="text-[8.5px] leading-none shrink-0"
                              title={`Nota: ${shift.notes}`}
                            >
                              📝
                            </span>
                          ) : null}
                        </div>

                        {/* Línea 2: Nombre abreviado del centro de trabajo */}
                        <div className={`font-bold text-[9px] sm:text-[9.5px] leading-tight truncate mt-0.5 ${
                          isLibreShift ? 'text-emerald-200/90' : 'text-white/95'
                        }`}>
                          {hospShortName}
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
                        title={`${h?.shortName}: ${s.hours}h`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
