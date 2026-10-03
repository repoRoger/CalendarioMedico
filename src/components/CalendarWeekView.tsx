import React from 'react';
import { Plus, Clock, Moon, ShieldAlert, Building2 } from 'lucide-react';
import { CalendarDayItem, SPANISH_WEEKDAYS, formatFriendlyDate } from '../lib/timeUtils';
import { MedicalShift, Hospital } from '../types';

interface CalendarWeekViewProps {
  days: CalendarDayItem[];
  shifts: MedicalShift[];
  hospitals: Hospital[];
  filteredHospitalId?: string;
  onSelectDate: (date: string) => void;
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  days,
  shifts,
  hospitals,
  filteredHospitalId = 'all',
  onSelectDate,
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

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4 sm:p-5">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((dayItem, index) => {
          const dayShifts = (shiftsByDate[dayItem.date] || []).filter((s) => s.shiftCode !== 'L');
          const dayOffShift = (shiftsByDate[dayItem.date] || []).find((s) => s.shiftCode === 'L');
          const totalHours = dayShifts.reduce((acc, s) => acc + (s.hours || 0), 0);
          const is24H = totalHours >= 24;

          return (
            <div
              key={dayItem.date}
              onClick={() => onSelectDate(dayItem.date)}
              className={`rounded-xl p-3 border transition-all cursor-pointer flex flex-col justify-between min-h-[220px] ${
                dayItem.isToday
                  ? 'bg-teal-950/20 border-teal-500/40 ring-1 ring-teal-500/30'
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ⚡ 24H
                      </span>
                    ) : totalHours > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-teal-300 bg-teal-950/60 border border-teal-800/30 font-semibold">
                        {totalHours}h
                      </span>
                    ) : dayOffShift ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        Libre
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600">0h</span>
                    )}
                  </div>
                </div>

                {/* List of shifts on that day */}
                <div className="space-y-2">
                  {dayShifts.map((shift, sIdx) => {
                    const hosp = hospitals.find((h) => h.id === shift.hospitalId);

                    return (
                      <div
                        key={shift.id || sIdx}
                        className="p-2 rounded-lg text-white shadow-sm space-y-1"
                        style={{
                          background: `linear-gradient(135deg, ${hosp?.gradientStart || '#0d9488'}, ${hosp?.gradientEnd || '#059669'})`,
                        }}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold flex items-center gap-1 truncate">
                            <span className="bg-black/30 px-1 py-0.2 rounded font-mono text-[10px]">
                              {shift.shiftCode}
                            </span>
                            <span className="truncate">{hosp?.shortName || shift.title}</span>
                          </span>
                          <span className="font-mono text-[11px] opacity-95 shrink-0 ml-1">
                            {shift.hours}h
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10.5px] opacity-90 font-mono">
                          <span>{shift.startTime} - {shift.endTime}</span>
                          {shift.department && (
                            <span className="truncate max-w-[70px] text-[10px]">{shift.department}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {dayShifts.length === 0 && !dayOffShift && (
                    <div className="py-6 text-center text-slate-600 text-xs">
                      Sin turnos
                    </div>
                  )}

                  {dayOffShift && (
                    <div className="py-4 text-center text-emerald-400/80 text-xs font-medium">
                      Descanso
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-2 border-t border-slate-800/60 text-right">
                <span className="text-[11px] text-slate-500 hover:text-teal-400 transition-colors inline-flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Editar día
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
