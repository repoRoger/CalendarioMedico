import React from 'react';
import {
  Clock, Plus, Edit2, Sparkles, Moon, Sun, ShieldAlert,
  UserCheck, Layers, AlertCircle
} from 'lucide-react';
import { ShiftTemplate } from '../types';

interface SettingsListViewProps {
  templates: ShiftTemplate[];
  onOpenCreate: () => void;
  onOpenEdit: (template: ShiftTemplate) => void;
}

export const SettingsListView: React.FC<SettingsListViewProps> = ({
  templates,
  onOpenCreate,
  onOpenEdit,
}) => {
  const getBadgeStyle = (code: string) => {
    switch (code) {
      case '24H':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'N':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'T':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'C':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'M':
      default:
        return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Horarios y Tipos de Turnos
            </h1>
            <span className="px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 font-mono text-xs font-bold border border-teal-500/30">
              {templates.length}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Listado de plantillas de turnos para editar rápidamente sus horas de entrada, salida y duración.
          </p>
        </div>

        {/* Action Button: Opens the Popup */}
        <button
          onClick={onOpenCreate}
          className="self-start sm:self-center px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-900/40 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Tipo de Turno</span>
        </button>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 gap-3">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="p-4 sm:p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 shadow-lg hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            {/* Left: Code badge, Name & Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border shadow-md shrink-0 ${getBadgeStyle(
                  tpl.code
                )}`}
              >
                {tpl.code}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base text-slate-100 truncate">
                    {tpl.name}
                  </h3>
                  <span className="text-xs font-mono font-bold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-800/40">
                    {tpl.defaultHours} horas
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap font-mono">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>{tpl.defaultStartTime} - {tpl.defaultEndTime}</span>
                  </span>
                  {tpl.description && (
                    <span className="font-sans text-slate-500 hidden sm:inline truncate max-w-xs">
                      · {tpl.description}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => onOpenEdit(tpl)}
                className="min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95 shadow-sm"
                title={`Editar horario de ${tpl.name}`}
              >
                <Edit2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Editar turno</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
