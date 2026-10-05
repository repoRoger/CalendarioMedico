import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Clock, Save, Sparkles, Check, Trash2, Pipette } from 'lucide-react';
import { ShiftTemplate, ShiftCode } from '../types';
import { calculateShiftHours } from '../lib/timeUtils';

interface TemplateModalProps {
  isOpen: boolean;
  template: ShiftTemplate | null; // null for creating, ShiftTemplate for editing
  onClose: () => void;
  onSave: (template: ShiftTemplate) => void;
  onDelete?: (templateId: string) => void;
}

const TEMPLATE_CODES: { code: ShiftCode; label: string }[] = [
  { code: 'TA', label: 'TA (07-15, 8h)' },
  { code: 'TB', label: 'TB (15-21, 6h)' },
  { code: 'TC', label: 'TC (21-07, 10h)' },
  { code: '24H', label: '24H (07-07, 24h)' },
  { code: 'CHOQUE', label: 'Choque / Conflicto' },
  { code: 'LIBRE_A', label: 'Libre A (0h)' },
  { code: 'LIBRE_B', label: 'Libre B (0h)' },
  { code: 'LIBRE_C', label: 'Libre C (0h)' },
  { code: 'LIBRE', label: 'Libre turno (0h)' },
  { code: 'L', label: 'Libre total (0h)' },
  { code: 'TA-TB', label: 'TA-TB (14h)' },
  { code: 'TB-TC', label: 'TB-TC (16h)' },
  { code: 'TC-TA', label: 'TC-TA (18h)' },
  { code: 'CUSTOM', label: 'Personalizado' },
];

const PRESET_SHIFT_COLORS = [
  { hex: '#f59e0b', name: 'Ámbar (TA / Mañana)' },
  { hex: '#ea580c', name: 'Naranja (TB / Tarde)' },
  { hex: '#6366f1', name: 'Índigo (TC / Noche)' },
  { hex: '#e11d48', name: 'Carmesí (24H)' },
  { hex: '#dc2626', name: 'Rojo (Choque)' },
  { hex: '#10b981', name: 'Esmeralda (Libre A)' },
  { hex: '#059669', name: 'Verde (Libre B/C)' },
  { hex: '#8b5cf6', name: 'Púrpura (TA-TB)' },
  { hex: '#7c3aed', name: 'Violeta (TB-TC)' },
  { hex: '#0284c7', name: 'Azul Cielo (TC-TA)' },
  { hex: '#0d9488', name: 'Teal Clínico' },
  { hex: '#ec4899', name: 'Rosa Especial' },
];

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  template,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(template);

  const [code, setCode] = useState<ShiftCode>('TA');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:00');
  const [hours, setHours] = useState<number>(8);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#f59e0b');

  useEffect(() => {
    if (template) {
      setCode(template.code);
      setName(template.name);
      setStartTime(template.defaultStartTime);
      setEndTime(template.defaultEndTime);
      setHours(template.defaultHours);
      setDescription(template.description || '');
      setColor(template.color || '#f59e0b');
    } else {
      setCode('TA');
      setName('TA');
      setStartTime('07:00');
      setEndTime('15:00');
      setHours(8);
      setDescription('Turno TA (07:00 - 15:00)');
      setColor('#f59e0b');
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

  const handleCustomColorChange = (hexVal: string) => {
    let cleanHex = hexVal.trim();
    if (!cleanHex.startsWith('#') && cleanHex.length > 0) {
      cleanHex = `#${cleanHex}`;
    }
    setColor(cleanHex);
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

    const finalColor = color.trim() || '#f59e0b';

    const saved: ShiftTemplate = {
      id: template?.id || `tpl-${Date.now()}`,
      code,
      name: name.trim(),
      defaultStartTime: startTime,
      defaultEndTime: endTime,
      defaultHours: Number(hours) || calculateShiftHours(startTime, endTime),
      description: description.trim(),
      color: finalColor,
      colorBadge: template?.colorBadge || getColorBadge(code),
      isNightShift: code === 'TC' || code === '24H' || code === 'TB-TC' || code === 'TC-TA' || code === 'LIBRE_C',
    };

    onSave(saved);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 30 }}
        className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden my-0 sm:my-auto flex flex-col max-h-[92vh]"
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md font-black text-sm transition-colors"
              style={{ backgroundColor: color }}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isEditing ? 'Editar Tipo de Turno' : 'Nuevo Tipo de Turno'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? `Modifica ${name}` : 'Configura código, horas y color'}
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
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
              placeholder="Ej. TA, Guardia 24H, Cubrir..."
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

          {/* Total Horas */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">Total de horas calculadas:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min="0"
                max="48"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-teal-300 text-center focus:outline-none focus:border-teal-500"
              />
              <span className="text-xs font-bold text-teal-400">horas</span>
            </div>
          </div>

          {/* Selector de Color Personal del Turno (Paleta + Custom Color Picker) */}
          <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Pipette className="w-3.5 h-3.5 text-teal-400" />
                <span>Color Personal del Turno</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg border border-white/40 shadow-sm" style={{ backgroundColor: color }} />
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">{color}</span>
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
              {PRESET_SHIFT_COLORS.map((pc) => {
                const isSelected = color.toLowerCase() === pc.hex.toLowerCase();
                return (
                  <button
                    key={pc.hex}
                    type="button"
                    onClick={() => setColor(pc.hex)}
                    className={`h-9 rounded-xl flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'ring-2 ring-white scale-105 shadow-lg border-2 border-white'
                        : 'border-slate-800 hover:scale-102 opacity-90 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: pc.hex }}
                    title={pc.name}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>

            {/* Selector Libre / Color Picker */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/80">
              <label className="relative flex items-center justify-center w-11 h-11 rounded-xl cursor-pointer border border-slate-700 bg-slate-900 hover:border-teal-400 transition-colors shrink-0 shadow-inner">
                <input
                  type="color"
                  value={color.startsWith('#') && color.length === 7 ? color : '#f59e0b'}
                  onChange={(e) => setColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                <span
                  className="w-7 h-7 rounded-lg shadow-sm border border-white/30"
                  style={{ backgroundColor: color }}
                />
              </label>

              <div className="flex-1 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-medium">Color personalizado (Selector libre o código HEX):</span>
                <input
                  type="text"
                  maxLength={9}
                  value={color}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  placeholder="#f59e0b"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-teal-300 uppercase focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Vista previa de fusión en el Calendario */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
              Vista previa: Fusión con Centro en Calendario
            </span>
            <div className="grid grid-cols-2 gap-2">
              {/* Ejemplo 1: Con centro Turquesa */}
              <div
                className="p-2.5 rounded-xl text-white shadow-md border border-white/20 flex flex-col justify-center"
                style={{
                  background: `linear-gradient(135deg, #0d9488 0%, ${color} 100%)`,
                }}
              >
                <div className="flex items-center justify-between text-xs font-black font-mono">
                  <span>{name || 'TURNO'}</span>
                  <span className="text-[9px] font-sans font-normal opacity-90">{hours}h</span>
                </div>
                <div className="text-[10px] font-bold truncate mt-0.5 opacity-95">
                  🏥 Bendaña
                </div>
              </div>

              {/* Ejemplo 2: Con centro Índigo */}
              <div
                className="p-2.5 rounded-xl text-white shadow-md border border-white/20 flex flex-col justify-center"
                style={{
                  background: `linear-gradient(135deg, #4f46e5 0%, ${color} 100%)`,
                }}
              >
                <div className="flex items-center justify-between text-xs font-black font-mono">
                  <span>{name || 'TURNO'}</span>
                  <span className="text-[9px] font-sans font-normal opacity-90">{hours}h</span>
                </div>
                <div className="text-[10px] font-bold truncate mt-0.5 opacity-95">
                  🏨 Catarino
                </div>
              </div>
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
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 shrink-0">
            {isEditing && template && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Eliminar el turno "${template.name}"?`)) {
                    onDelete(template.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border border-rose-500/30 flex items-center gap-1.5 transition-colors min-h-[44px]"
                title="Eliminar este turno"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-2 shadow-lg shadow-teal-900/40 min-h-[44px] transition-transform active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Turno</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
