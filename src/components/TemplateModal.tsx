import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Clock, Save, Sparkles, Check } from 'lucide-react';
import { ShiftTemplate, ShiftCode } from '../types';
import { calculateShiftHours } from '../lib/timeUtils';

interface TemplateModalProps {
  isOpen: boolean;
  template: ShiftTemplate | null; // null for creating, ShiftTemplate for editing
  onClose: () => void;
  onSave: (template: ShiftTemplate) => void;
}

const TEMPLATE_CODES: { code: ShiftCode; label: string; color: string }[] = [
  { code: 'M', label: 'M · Mañana', color: 'from-teal-600 to-emerald-500' },
  { code: 'T', label: 'T · Tarde', color: 'from-orange-600 to-amber-500' },
  { code: 'N', label: 'N · Noche', color: 'from-indigo-600 to-purple-600' },
  { code: '24H', label: '24H · Guardia 24H', color: 'from-rose-600 to-red-600' },
  { code: 'C', label: 'C · Cubrir', color: 'from-amber-600 to-yellow-600' },
  { code: 'D', label: 'D · Doble', color: 'from-cyan-600 to-blue-600' },
  { code: 'CUSTOM', label: 'Personalizado', color: 'from-slate-700 to-slate-800' },
];

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  template,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(template);

  const [code, setCode] = useState<ShiftCode>('M');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:00');
  const [hours, setHours] = useState<number>(8);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (template) {
      setCode(template.code);
      setName(template.name);
      setStartTime(template.defaultStartTime);
      setEndTime(template.defaultEndTime);
      setHours(template.defaultHours);
      setDescription(template.description || '');
    } else {
      setCode('M');
      setName('Turno Mañana');
      setStartTime('07:00');
      setEndTime('15:00');
      setHours(8);
      setDescription('Horario diurno estándar');
    }
  }, [template, isOpen]);

  // Recalculate hours when start or end time changes
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const computed = calculateShiftHours(newStart, endTime);
    setHours(computed);
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    const computed = calculateShiftHours(startTime, newEnd);
    setHours(computed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const getColorBadge = (c: ShiftCode) => {
      switch (c) {
        case '24H': return 'bg-rose-500 text-white';
        case 'N': return 'bg-indigo-600 text-white';
        case 'T': return 'bg-orange-500 text-white';
        case 'C': return 'bg-amber-500 text-white';
        case 'D': return 'bg-cyan-600 text-white';
        case 'M':
        default:
          return 'bg-teal-600 text-white';
      }
    };

    const saved: ShiftTemplate = {
      id: template?.id || `tpl-${Date.now()}`,
      code,
      name: name.trim(),
      defaultStartTime: startTime,
      defaultEndTime: endTime,
      defaultHours: Number(hours) || calculateShiftHours(startTime, endTime),
      description: description.trim(),
      colorBadge: template?.colorBadge || getColorBadge(code),
      isNightShift: code === 'N' || code === '24H',
    };

    onSave(saved);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shadow-md">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isEditing ? 'Editar Tipo de Turno' : 'Nuevo Tipo de Turno'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? `Modifica ${name}` : 'Crea una plantilla con su horario'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Código / Categoría */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Tipo de Turno (Código)
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {TEMPLATE_CODES.map((tc) => (
                <button
                  key={tc.code}
                  type="button"
                  onClick={() => setCode(tc.code)}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border font-bold transition-all ${
                    code === tc.code
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Nombre del Turno *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mañana, Tarde, Guardia 24H, Cubrir..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 min-h-[44px]"
            />
          </div>

          {/* Horas Inicio y Fin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Hora Inicio
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-teal-500 min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Hora Fin
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-teal-500 min-h-[44px]"
              />
            </div>
          </div>

          {/* Total Horas (Autocalculado pero editable) */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">Total de horas calculadas:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="48"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-teal-300 text-center focus:outline-none focus:border-teal-500"
              />
              <span className="text-xs font-bold text-teal-400">horas</span>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Descripción o Notas (Opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Turno regular de 8 horas, guardia hospitalaria..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 min-h-[44px]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-2 shadow-lg shadow-teal-900/40 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Turno</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
