import React from 'react';
import {
  Clock, Calendar, Plus, Edit2, FileText, Building2, Sun, Moon,
  ChevronRight, ArrowRight, UserCheck, Sparkles, AlertCircle
} from 'lucide-react';
import { Hospital, MedicalShift, UserSession } from '../types';
import {
  getHondurasDate, getHondurasTodayIso, getHondurasTomorrowIso,
  SPANISH_MONTHS, SPANISH_WEEKDAYS_FULL, formatFriendlyDate
} from '../lib/timeUtils';

interface ProximosViewProps {
  shifts: MedicalShift[];
  hospitals: Hospital[];
  user: UserSession;
  onEditDay: (dateIso: string) => void;
  onGoToCalendar: () => void;
  onOpenWorkplaces: () => void;
}

export const ProximosView: React.FC<ProximosViewProps> = ({
  shifts,
  hospitals,
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

  const todayShifts = shifts.filter((s) => s.date === todayIso && s.shiftCode !== 'L');
  const tomorrowShifts = shifts.filter((s) => s.date === tomorrowIso && s.shiftCode !== 'L');

  // Next upcoming shifts after tomorrow (up to 4)
  const futureShifts = shifts
    .filter((s) => s.date > tomorrowIso && s.shiftCode !== 'L')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const formatHnDateDisplay = (date: Date) => {
    const dayName = SPANISH_WEEKDAYS_FULL[date.getDay()];
    const dayNum = date.getDate();
    const monthName = SPANISH_MONTHS[date.getMonth()];
    return `${dayName}, ${dayNum} de ${monthName}`;
  };

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
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Welcome Banner with Honduras Local Time indicator */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
              Hora local Honduras (UTC-6)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            ¡Hola, {user.name}!
          </h1>
          <p className="text-xs text-slate-400">
            Aquí tienes tus turnos más próximos para hoy y mañana.
          </p>
        </div>

        <button
          onClick={onGoToCalendar}
          className="self-start sm:self-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white rounded-2xl text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <Calendar className="w-4 h-4 text-teal-400" />
          <span>Ver Calendario Completo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Focus: Two Columns (HOY / MAÑANA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD 1: HOY */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-black uppercase tracking-wider">
                  Hoy
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {formatHnDateDisplay(hnDate)}
                </span>
              </div>
              <span className="text-[11px] font-mono text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-800/40">
                {todayShifts.reduce((acc, s) => acc + (s.hours || 0), 0)}h hoy
              </span>
            </div>

            {todayShifts.length > 0 ? (
              <div className="space-y-3">
                {todayShifts.map((shift, idx) => {
                  const hosp = hospitals.find((h) => h.id === shift.hospitalId);
                  return (
                    <div
                      key={shift.id || idx}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md font-bold text-xs"
                            style={{
                              background: `linear-gradient(135deg, ${hosp?.gradientStart || '#0d9488'}, ${hosp?.gradientEnd || '#059669'})`,
                            }}
                          >
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-100 truncate">
                              {hosp?.name || 'Centro de Trabajo'}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {hosp?.city || 'Honduras'} {shift.department && `· ${shift.department}`}
                            </p>
                          </div>
                        </div>
                        {renderBadge(shift)}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs text-slate-300 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-400" />
                          {shift.startTime} - {shift.endTime}
                        </span>
                        <span className="font-bold text-teal-300">{shift.hours} horas</span>
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
                  No tienes ningún turno programado para hoy. ¡Aprovecha para descansar o programa uno si te llamaron!
                </p>
              </div>
            )}
          </div>

          {/* Action button for Hoy */}
          <button
            onClick={() => onEditDay(todayIso)}
            className="w-full min-h-[46px] py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all active:scale-98"
          >
            {todayShifts.length > 0 ? (
              <>
                <Edit2 className="w-4 h-4" />
                <span>Editar Turnos de Hoy</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>+ Agregar Turno para Hoy</span>
              </>
            )}
          </button>
        </div>

        {/* CARD 2: MAÑANA */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-xs font-black uppercase tracking-wider">
                  Mañana
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {formatHnDateDisplay(tomorrowDate)}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                {tomorrowShifts.reduce((acc, s) => acc + (s.hours || 0), 0)}h mañana
              </span>
            </div>

            {tomorrowShifts.length > 0 ? (
              <div className="space-y-3">
                {tomorrowShifts.map((shift, idx) => {
                  const hosp = hospitals.find((h) => h.id === shift.hospitalId);
                  return (
                    <div
                      key={shift.id || idx}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md font-bold text-xs"
                            style={{
                              background: `linear-gradient(135deg, ${hosp?.gradientStart || '#0d9488'}, ${hosp?.gradientEnd || '#059669'})`,
                            }}
                          >
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-100 truncate">
                              {hosp?.name || 'Centro de Trabajo'}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {hosp?.city || 'Honduras'} {shift.department && `· ${shift.department}`}
                            </p>
                          </div>
                        </div>
                        {renderBadge(shift)}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs text-slate-300 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-400" />
                          {shift.startTime} - {shift.endTime}
                        </span>
                        <span className="font-bold text-teal-300">{shift.hours} horas</span>
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
                  Aún no tienes turnos asignados para mañana.
                </p>
              </div>
            )}
          </div>

          {/* Action button for Mañana */}
          <button
            onClick={() => onEditDay(tomorrowIso)}
            className="w-full min-h-[46px] py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-98"
          >
            {tomorrowShifts.length > 0 ? (
              <>
                <Edit2 className="w-4 h-4" />
                <span>Editar Turnos de Mañana</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>+ Agregar Turno para Mañana</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Subsequent upcoming shifts preview */}
      {futureShifts.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>Siguientes Días Programados</span>
            </span>
            <button
              onClick={onGoToCalendar}
              className="text-xs text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {futureShifts.map((shift, idx) => {
              const hosp = hospitals.find((h) => h.id === shift.hospitalId);
              return (
                <div
                  key={shift.id || idx}
                  onClick={() => onEditDay(shift.date)}
                  className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 cursor-pointer flex items-center justify-between gap-2.5 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-2.5 h-8 rounded-full shrink-0"
                      style={{ background: hosp?.gradientStart || '#0d9488' }}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-200">
                        {formatFriendlyDate(shift.date).split(',')[0]} · {shift.date.split('-').slice(1).reverse().join('/')}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {hosp?.shortName || 'Centro'} · {shift.startTime}-{shift.endTime} ({shift.hours}h)
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
