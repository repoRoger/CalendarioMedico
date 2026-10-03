import React, { useState } from 'react';
import {
  Calendar, Clock, Building2, FileText, Plus, ChevronRight,
  Sun, Moon, ShieldAlert, Sparkles, ChevronDown, ChevronUp, UserCheck
} from 'lucide-react';
import { Hospital, MedicalShift } from '../types';
import { formatDateToIso, SPANISH_MONTHS, SPANISH_WEEKDAYS_FULL } from '../lib/timeUtils';

interface UpcomingShiftsWidgetProps {
  shifts: MedicalShift[];
  hospitals: Hospital[];
  onSelectDate: (dateIso: string) => void;
}

export const UpcomingShiftsWidget: React.FC<UpcomingShiftsWidgetProps> = ({
  shifts,
  hospitals,
  onSelectDate,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const now = new Date();
  const todayIso = formatDateToIso(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowIso = formatDateToIso(tomorrow);

  const todayShifts = shifts.filter((s) => s.date === todayIso && s.shiftCode !== 'L');
  const tomorrowShifts = shifts.filter((s) => s.date === tomorrowIso && s.shiftCode !== 'L');

  const formatHeaderDate = (date: Date) => {
    const dayName = SPANISH_WEEKDAYS_FULL[date.getDay()];
    const dayNum = date.getDate();
    const monthName = SPANISH_MONTHS[date.getMonth()];
    return `${dayName}, ${dayNum} de ${monthName}`;
  };

  const renderShiftBadge = (shift: MedicalShift) => {
    switch (shift.shiftCode) {
      case '24H':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold">Guardia 24H</span>;
      case 'N':
        return <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold">Noche</span>;
      case 'T':
        return <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold">Tarde</span>;
      case 'C':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><UserCheck className="w-3 h-3" /> Cubrir</span>;
      case 'M':
      default:
        return <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold">Mañana</span>;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all">
      {/* Widget Header with Toggle */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-200">
            Próximos Turnos · <span className="text-teal-400">Hoy y Mañana</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors p-1"
          title={isCollapsed ? 'Expandir vista rápida' : 'Colapsar vista rápida'}
        >
          <span className="text-[11px] hidden sm:inline">{isCollapsed ? 'Mostrar' : 'Ocultar'}</span>
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Widget Body: Two Cards (Hoy / Mañana) */}
      {!isCollapsed && (
        <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* CARD 1: HOY */}
          <div
            onClick={() => onSelectDate(todayIso)}
            className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-teal-500/50 transition-all cursor-pointer group space-y-2.5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-teal-300">Hoy</span>
                <span className="text-xs text-slate-400">{formatHeaderDate(now)}</span>
              </div>
              <span className="text-[11px] text-teal-400 group-hover:underline flex items-center gap-0.5 font-medium">
                Editar <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {todayShifts.length > 0 ? (
              <div className="space-y-2">
                {todayShifts.map((shift, idx) => {
                  const hosp = hospitals.find((h) => h.id === shift.hospitalId);
                  return (
                    <div
                      key={shift.id || idx}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ background: hosp?.gradientStart || '#0d9488' }}
                          />
                          <span className="font-bold text-xs text-slate-100 truncate">
                            {hosp?.name || hosp?.shortName || 'Centro de Trabajo'}
                          </span>
                        </div>
                        {renderShiftBadge(shift)}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span>{shift.startTime} - {shift.endTime}</span>
                        <span className="text-teal-400 font-bold">{shift.hours}h</span>
                      </div>

                      {/* Nota destacada si existe */}
                      {shift.notes && (
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-1.5 mt-1 font-sans">
                          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="leading-snug italic font-medium">{shift.notes}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center space-y-1 text-slate-500">
                <Sun className="w-5 h-5 mx-auto text-slate-600" />
                <p className="text-xs font-medium text-slate-400">Día Libre / Sin turno hoy</p>
                <p className="text-[11px] text-teal-400 hover:underline">+ Toca para programar turno</p>
              </div>
            )}
          </div>

          {/* CARD 2: MAÑANA */}
          <div
            onClick={() => onSelectDate(tomorrowIso)}
            className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-teal-500/50 transition-all cursor-pointer group space-y-2.5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">Mañana</span>
                <span className="text-xs text-slate-400">{formatHeaderDate(tomorrow)}</span>
              </div>
              <span className="text-[11px] text-teal-400 group-hover:underline flex items-center gap-0.5 font-medium">
                Editar <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {tomorrowShifts.length > 0 ? (
              <div className="space-y-2">
                {tomorrowShifts.map((shift, idx) => {
                  const hosp = hospitals.find((h) => h.id === shift.hospitalId);
                  return (
                    <div
                      key={shift.id || idx}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ background: hosp?.gradientStart || '#0d9488' }}
                          />
                          <span className="font-bold text-xs text-slate-100 truncate">
                            {hosp?.name || hosp?.shortName || 'Centro de Trabajo'}
                          </span>
                        </div>
                        {renderShiftBadge(shift)}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span>{shift.startTime} - {shift.endTime}</span>
                        <span className="text-teal-400 font-bold">{shift.hours}h</span>
                      </div>

                      {/* Nota destacada si existe */}
                      {shift.notes && (
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-1.5 mt-1 font-sans">
                          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="leading-snug italic font-medium">{shift.notes}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center space-y-1 text-slate-500">
                <Sun className="w-5 h-5 mx-auto text-slate-600" />
                <p className="text-xs font-medium text-slate-400">Día Libre / Sin turno mañana</p>
                <p className="text-[11px] text-teal-400 hover:underline">+ Toca para programar turno</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
