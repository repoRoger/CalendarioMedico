import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Clock, Check, Plus, RotateCcw } from 'lucide-react';
import { ShiftTemplate } from '../types';
import { calculateShiftHours } from '../lib/timeUtils';
import { DEFAULT_TEMPLATES } from '../lib/storage';

interface ShiftTemplatesModalProps {
  isOpen: boolean;
  templates: ShiftTemplate[];
  onClose: () => void;
  onSaveTemplates: (templates: ShiftTemplate[]) => void;
}

export const ShiftTemplatesModal: React.FC<ShiftTemplatesModalProps> = ({
  isOpen,
  templates,
  onClose,
  onSaveTemplates,
}) => {
  const [list, setList] = useState<ShiftTemplate[]>(templates);

  if (!isOpen) return null;

  const handleUpdate = (index: number, updates: Partial<ShiftTemplate>) => {
    setList((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], ...updates };
      if (updates.defaultStartTime !== undefined || updates.defaultEndTime !== undefined) {
        target.defaultHours = calculateShiftHours(target.defaultStartTime, target.defaultEndTime);
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleResetDefaults = () => {
    setList(DEFAULT_TEMPLATES);
  };

  const handleSave = () => {
    onSaveTemplates(list);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Horarios Recomendados de Turno
              </h2>
              <p className="text-xs text-slate-400">
                Configura las horas sugeridas por defecto para agregarlas en un solo clic al calendario
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

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {list.map((tpl, idx) => (
            <div
              key={tpl.id}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 font-mono font-bold text-teal-400 flex items-center justify-center text-xs">
                  {tpl.code}
                </span>
                <div>
                  <input
                    type="text"
                    value={tpl.name}
                    onChange={(e) => handleUpdate(idx, { name: e.target.value })}
                    className="bg-transparent font-semibold text-slate-200 text-xs border-b border-transparent hover:border-slate-700 focus:border-teal-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500">{tpl.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Inicio:</span>
                  <input
                    type="time"
                    value={tpl.defaultStartTime}
                    onChange={(e) => handleUpdate(idx, { defaultStartTime: e.target.value })}
                    className="bg-transparent text-xs font-mono text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Fin:</span>
                  <input
                    type="time"
                    value={tpl.defaultEndTime}
                    onChange={(e) => handleUpdate(idx, { defaultEndTime: e.target.value })}
                    className="bg-transparent text-xs font-mono text-slate-200 focus:outline-none"
                  />
                </div>

                <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/60 px-2 py-1 rounded border border-teal-800/40 shrink-0">
                  {tpl.defaultHours}h
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Predeterminados</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Horarios</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
