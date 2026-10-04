import React, { useState } from 'react';
import {
  Clock, Building2, Calendar, Filter, Plus, Moon,
  FileText, UserCheck, ChevronRight
} from 'lucide-react';
import { MedicalShift, Hospital } from '../types';
import {
  formatFriendlyDate, getHondurasTodayIso, getHondurasTomorrowIso
} from '../lib/timeUtils';
import { getHospitalForShift } from '../lib/storage';

interface ShiftListViewProps {
  shifts: MedicalShift[];
  hospitals: Hospital[];
  onSelectDate: (date: string) => void;
}

export const ShiftListView: React.FC<ShiftListViewProps> = ({
  shifts,
  hospitals,
  onSelectDate,
}) => {
  const [filterHospital, setFilterHospital] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const todayIso = getHondurasTodayIso();
  const tomorrowIso = getHondurasTomorrowIso();

  // Filter out rest days if needed, sort chronologically
  const filtered = shifts
    .filter((s) => s.shiftCode !== 'L')
    .filter((s) => (filterHospital === 'all' ? true : s.hospitalId === filterHospital))
    .filter((s) => (filterType === 'all' ? true : s.shiftCode === filterType))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  // Group shifts by date
  const groupedByDate: { date: string; shifts: MedicalShift[] }[] = [];
  filtered.forEach((shift) => {
    let group = groupedByDate.find((g) => g.date === shift.date);
    if (!group) {
      group = { date: shift.date, shifts: [] };
      groupedByDate.push(group);
    }
    group.shifts.push(shift);
  });

  const renderBadge = (shift: MedicalShift) => {
    switch (shift.shiftCode) {
      case '24H':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-lg text-xs font-bold">Guardia 24H</span>;
      case 'N':
        return <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1"><Moon className="w-3 h-3" /> Noche</span>;
      case 'T':
        return <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-lg text-xs font-bold">Tarde</span>;
      case 'C':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1"><UserCheck className="w-3 h-3" /> Cubrir</span>;
      case 'M':
      default:
        return <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-lg text-xs font-bold">Mañana</span>;
    }
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-5 space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold text-slate-300">Filtros:</span>

          <select
            value={filterHospital}
            onChange={(e) => setFilterHospital(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 min-h-[36px]"
          >
            <option value="all">Todos los Lugares</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 min-h-[36px]"
          >
            <option value="all">Todos los Tipos</option>
            <option value="M">Mañana (M)</option>
            <option value="T">Tarde (T)</option>
            <option value="N">Noche (N)</option>
            <option value="24H">Guardia 24H</option>
            <option value="C">Cubrir Turno (C)</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          {filtered.length} turnos en {groupedByDate.length} días
        </span>
      </div>

      {/* Grouped by Date List */}
      <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
        {groupedByDate.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No se encontraron turnos con los filtros seleccionados.
          </div>
        ) : (
          groupedByDate.map((group) => {
            const isToday = group.date === todayIso;
            const isTomorrow = group.date === tomorrowIso;
            const dayTotalHours = group.shifts.reduce((acc, s) => acc + (s.hours || 0), 0);

            return (
              <div
                key={group.date}
                className="space-y-2 rounded-2xl bg-slate-950/40 border border-slate-800/80 p-3 sm:p-4"
              >
                {/* Date Header: Aparece la fecha antes de cada turno o turnos del día */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="w-4 h-4 text-teal-400" />
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-100 capitalize">
                      {formatFriendlyDate(group.date)}
                    </h3>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-black uppercase tracking-wider">
                        Hoy
                      </span>
                    )}
                    {isTomorrow && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-black uppercase tracking-wider">
                        Mañana
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-800/40">
                      Total: {dayTotalHours}h
                    </span>
                    <button
                      onClick={() => onSelectDate(group.date)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1"
                      title="Editar turnos de este día"
                    >
                      <Plus className="w-3 h-3 text-teal-400" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>

                {/* Shifts of this date */}
                <div className="space-y-2 pt-1">
                  {group.shifts.map((shift, idx) => {
                    const hosp = getHospitalForShift(shift, hospitals);

                    return (
                      <div
                        key={shift.id || idx}
                        onClick={() => onSelectDate(shift.date)}
                        className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Hospital badge with gradient */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md font-mono font-bold text-xs"
                            style={{
                              background: `linear-gradient(135deg, ${hosp?.gradientStart || '#0d9488'}, ${hosp?.gradientEnd || '#059669'})`,
                            }}
                          >
                            <Building2 className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                                {hosp?.name || 'Centro de Trabajo'}
                              </p>
                              <span className="font-mono text-[10.5px] px-1.5 py-0.2 rounded bg-slate-800 text-teal-300">
                                {hosp?.shortName || ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">
                              {hosp?.city || 'Honduras'} {shift.department && `· ${shift.department}`}
                            </p>
                          </div>
                        </div>

                        {/* Right: Badge, Time & Hours */}
                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-mono font-bold text-slate-200">
                              {shift.startTime} - {shift.endTime}
                            </p>
                            <p className="text-[11px] font-mono text-teal-400">
                              {shift.hours} horas
                            </p>
                          </div>

                          {renderBadge(shift)}
                        </div>

                        {/* Note preview if any */}
                        {shift.notes && (
                          <div className="w-full sm:w-auto p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-center gap-1.5 font-sans mt-1 sm:mt-0">
                            <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate italic max-w-xs">{shift.notes}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
