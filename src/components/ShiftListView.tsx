import React, { useState } from 'react';
import { Clock, Building2, Calendar, Filter, Plus, Moon, AlertCircle } from 'lucide-react';
import { MedicalShift, Hospital } from '../types';
import { formatFriendlyDate } from '../lib/timeUtils';

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

  // Filter out rest days if needed, sort by date
  const filtered = shifts
    .filter((s) => s.shiftCode !== 'L')
    .filter((s) => (filterHospital === 'all' ? true : s.hospitalId === filterHospital))
    .filter((s) => (filterType === 'all' ? true : s.shiftCode === filterType))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4 sm:p-6 space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold text-slate-300">Filtrar Turnos:</span>

          <select
            value={filterHospital}
            onChange={(e) => setFilterHospital(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Todos los Hospitales</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Todos los Tipos</option>
            <option value="M">Mañana (M)</option>
            <option value="T">Tarde (T)</option>
            <option value="N">Noche (N)</option>
            <option value="24H">Guardia 24H</option>
            <option value="D">Doble Turno</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Mostrando {filtered.length} turnos
        </span>
      </div>

      {/* Shifts list */}
      <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No se encontraron turnos con los filtros seleccionados.
          </div>
        ) : (
          filtered.map((shift) => {
            const hosp = hospitals.find((h) => h.id === shift.hospitalId);

            return (
              <div
                key={shift.id}
                onClick={() => onSelectDate(shift.date)}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {/* Hospital badge with gradient */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md font-mono font-bold text-xs"
                    style={{
                      background: `linear-gradient(135deg, ${hosp?.gradientStart || '#0d9488'}, ${hosp?.gradientEnd || '#059669'})`,
                    }}
                  >
                    {shift.shiftCode}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-200 capitalize">
                        {formatFriendlyDate(shift.date)}
                      </p>
                      <span className="text-slate-500 text-xs">·</span>
                      <span className="text-xs font-semibold text-teal-400">
                        {hosp?.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-slate-400 text-xs font-mono">
                      <span>{shift.startTime} - {shift.endTime}</span>
                      <span>·</span>
                      <span className="text-slate-300 font-semibold">{shift.hours} hrs</span>
                      {shift.department && (
                        <>
                          <span>·</span>
                          <span className="text-slate-400 font-sans">{shift.department}</span>
                        </>
                      )}
                    </div>

                    {shift.notes && (
                      <p className="text-[11px] text-slate-500 mt-1 italic">{shift.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {shift.shiftCode === '24H' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      24H
                    </span>
                  )}
                  {shift.isNightShift && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      <Moon className="w-3 h-3" /> Noche
                    </span>
                  )}
                  <span className="text-xs text-slate-500 group-hover:text-teal-400 transition-colors">
                    Editar →
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
