import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Copy, Check, Printer, Share2, Calendar } from 'lucide-react';
import { MedicalShift, Hospital, UserSession } from '../types';
import { SPANISH_MONTHS, formatFriendlyDate, getShiftDisplayCode } from '../lib/timeUtils';

interface ExportModalProps {
  isOpen: boolean;
  year: number;
  month: number;
  shifts: MedicalShift[];
  hospitals: Hospital[];
  user: UserSession;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  year,
  month,
  shifts,
  hospitals,
  user,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthShifts = shifts
    .filter((s) => s.date.startsWith(monthPrefix) && s.shiftCode !== 'L' && s.shiftCode !== 'LIBRE')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const totalHours = monthShifts.reduce((acc, s) => acc + (s.hours || 0), 0);

  // Group by date
  const groupedByDate: Record<string, MedicalShift[]> = {};
  monthShifts.forEach((s) => {
    if (!groupedByDate[s.date]) groupedByDate[s.date] = [];
    groupedByDate[s.date].push(s);
  });

  const generateTextReport = () => {
    const lines = [
      `📋 ROL DE TURNOS - ${SPANISH_MONTHS[month].toUpperCase()} ${year}`,
      `👤 Profesional: ${user.name} (${user.role})`,
      `⏱️ Total horas acumuladas: ${totalHours} horas`,
      `----------------------------------------`,
    ];

    Object.entries(groupedByDate).forEach(([d, dayShifts]) => {
      const [_, __, dayNum] = d.split('-');
      const shiftDesc = dayShifts
        .map((s) => {
          const hosp = hospitals.find((h) => h.id === s.hospitalId)?.shortName || 'Hosp';
          return `[${getShiftDisplayCode(s.shiftCode)}] ${hosp} (${s.startTime}-${s.endTime}, ${s.hours}h)`;
        })
        .join(' + ');

      lines.push(`• Día ${dayNum}: ${shiftDesc}`);
    });

    lines.push(`----------------------------------------`);
    lines.push(`Generado desde CalendarioMedico`);

    return lines.join('\n');
  };

  const handleCopy = () => {
    const text = generateTextReport();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

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
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Exportar / Compartir Rol
              </h2>
              <p className="text-xs text-slate-400">
                Envía tus turnos a supervisión o colegas por WhatsApp
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

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-teal-900/20"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar para WhatsApp'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
            {generateTextReport()}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
