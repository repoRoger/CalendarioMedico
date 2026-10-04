import React from 'react';
import { motion } from 'motion/react';
import {
  X, BarChart3, Clock, Building2, Moon, AlertTriangle, Calendar, Award
} from 'lucide-react';
import { MedicalShift, Hospital } from '../types';
import { SPANISH_MONTHS } from '../lib/timeUtils';

interface StatsSummaryModalProps {
  isOpen: boolean;
  year: number;
  month: number;
  shifts: MedicalShift[];
  hospitals: Hospital[];
  onClose: () => void;
}

export const StatsSummaryModal: React.FC<StatsSummaryModalProps> = ({
  isOpen,
  year,
  month,
  shifts,
  hospitals,
  onClose,
}) => {
  if (!isOpen) return null;

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthShifts = shifts.filter((s) => s.date.startsWith(monthPrefix) && s.shiftCode !== 'L');

  const totalHours = monthShifts.reduce((acc, s) => acc + (s.hours || 0), 0);
  const totalShiftsCount = monthShifts.length;
  const nightShiftsCount = monthShifts.filter((s) => s.isNightShift || s.shiftCode === 'TC' || s.shiftCode === 'N').length;

  // Group by date to detect days with >= 24h
  const dateMap: Record<string, number> = {};
  monthShifts.forEach((s) => {
    dateMap[s.date] = (dateMap[s.date] || 0) + (s.hours || 0);
  });
  const heavy24hDays = Object.values(dateMap).filter((h) => h >= 24).length;

  // Breakdown by hospital
  const hospitalStats = hospitals.map((hosp) => {
    const hospShifts = monthShifts.filter((s) => s.hospitalId === hosp.id);
    const hospHours = hospShifts.reduce((acc, s) => acc + (s.hours || 0), 0);
    const percentage = totalHours > 0 ? Math.round((hospHours / totalHours) * 100) : 0;
    return {
      hospital: hosp,
      shiftsCount: hospShifts.length,
      hours: hospHours,
      percentage,
    };
  }).filter((hs) => hs.shiftsCount > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Resumen de Horas & Guardias
              </h2>
              <p className="text-xs text-slate-400">
                Balance del mes de {SPANISH_MONTHS[month]} {year}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Top key metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Horas Totales</span>
              <p className="text-xl sm:text-2xl font-bold font-mono text-teal-400">
                {totalHours}h
              </p>
              <span className="text-[10px] text-slate-500">acumuladas</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Total Turnos</span>
              <p className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
                {totalShiftsCount}
              </p>
              <span className="text-[10px] text-slate-500">servicios cubiertos</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Turnos Noche</span>
              <p className="text-xl sm:text-2xl font-bold font-mono text-indigo-400 flex items-center gap-1">
                <Moon className="w-4 h-4" />
                <span>{nightShiftsCount}</span>
              </p>
              <span className="text-[10px] text-slate-500">recargo nocturno</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">Días 24 Horas</span>
              <p className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
                {heavy24hDays}
              </p>
              <span className="text-[10px] text-slate-500">jornadas 24h</span>
            </div>
          </div>

          {/* Breakdown by Hospital */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Distribución de Horas por Hospital
            </h3>

            {hospitalStats.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No hay turnos registrados en este mes.</p>
            ) : (
              hospitalStats.map((item) => (
                <div
                  key={item.hospital.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-md"
                        style={{
                          background: `linear-gradient(135deg, ${item.hospital.gradientStart}, ${item.hospital.gradientEnd})`,
                        }}
                      />
                      <span className="font-semibold text-slate-200">{item.hospital.name}</span>
                      <span className="text-slate-500 text-[11px]">({item.hospital.city})</span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-teal-400 text-sm">{item.hours}h</span>
                      <span className="text-slate-500 text-[11px] ml-2">({item.shiftsCount} turnos · {item.percentage}%)</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        background: `linear-gradient(90deg, ${item.hospital.gradientStart}, ${item.hospital.gradientEnd})`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Health reminder note */}
          {heavy24hDays > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">Nota para salud del personal:</p>
                <p className="text-amber-200/80 text-[11px] mt-0.5">
                  Registras {heavy24hDays} días con 24 horas continuas de labor (3 turnos o guardia completa). En enfermería hospitalaria se recomienda un mínimo de 24 a 48 horas de reposo compensatorio post-guardia.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
