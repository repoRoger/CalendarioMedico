import React from 'react';
import { Plus, Clock, Moon, Sparkles, Building2 } from 'lucide-react';
import { CalendarDayItem, SPANISH_WEEKDAYS } from '../lib/timeUtils';
import { MedicalShift, Hospital } from '../types';

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
          const dayShifts = (shiftsByDate[dayItem.date] || []).filter((s) => s.shiftCode !== 'L');
          const dayOffShift = (shiftsByDate[dayItem.date] || []).find((s) => s.shiftCode === 'L');
          const totalHours = dayShifts.reduce((acc, s) => acc + (s.hours || 0), 0);
          const is24H = totalHours >= 24;
          const isExtended = totalHours >= 16 && totalHours < 24;

          return (
            <div
              key={dayItem.date}
              onClick={() => onSelectDate(dayItem.date)}
              className={`min-h-[110px] sm:min-h-[125px] p-1.5 sm:p-2 flex flex-col justify-between transition-all cursor-pointer relative group ${
                !dayItem.isCurrentMonth
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
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono text-amber-200 bg-amber-500/20 border border-amber-500/30 animate-pulse"
                      title="¡Jornada de 24 horas continuas trabajadas!"
                    >
                      ⚡ 24H
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
                  ) : dayOffShift ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      Libre
                    </span>
                  ) : null}

                  {/* Hover Quick Edit Icon */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-teal-300 p-0.5 rounded">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Day Shifts Chips (supports 1, 2, 3 or more shifts!) */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {dayShifts.slice(0, 3).map((shift, idx) => {
                  const hosp = hospitals.find((h) => h.id === shift.hospitalId);
                  const gradStart = hosp?.gradientStart || '#0d9488';
                  const gradEnd = hosp?.gradientEnd || '#059669';

                  return (
                    <div
                      key={shift.id || idx}
                      className="rounded-md px-1.5 py-0.5 text-white shadow-sm flex items-center justify-between text-[11px] leading-tight transition-transform hover:scale-[1.02]"
                      style={{
                        background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})`,
                      }}
                      title={`${shift.title} en ${hosp?.name || 'Centro'} (${shift.startTime} - ${shift.endTime}) · ${shift.hours}h${shift.notes ? ` · 📝 ${shift.notes}` : ''}`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-bold font-mono text-[10px] bg-black/25 px-1 rounded shrink-0">
                          {shift.shiftCode}
                        </span>
                        <span className="truncate font-medium text-[10.5px]">
                          {hosp?.shortName || shift.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {shift.notes && (
                          <span
                            className="text-[9px] bg-amber-400/30 text-amber-200 px-0.5 rounded leading-none"
                            title={`Nota: ${shift.notes}`}
                          >
                            📝
                          </span>
                        )}
                        <span className="font-mono text-[9.5px] opacity-90">
                          {shift.startTime.slice(0, 5)}
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

              {/* Bottom hospital indicator dots when multiple */}
              {dayShifts.length > 1 && (
                <div className="flex items-center gap-1 pt-1 justify-end">
                  {dayShifts.map((s, i) => {
                    const h = hospitals.find((item) => item.id === s.hospitalId);
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
