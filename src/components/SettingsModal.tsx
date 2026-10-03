import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X, Building2, Clock, Trash2, Edit2, Plus, Check,
  RotateCcw, Sparkles
} from 'lucide-react';
import { Hospital, ShiftTemplate } from '../types';
import { calculateShiftHours } from '../lib/timeUtils';
import { DEFAULT_TEMPLATES } from '../lib/storage';

interface SettingsModalProps {
  isOpen: boolean;
  hospitals: Hospital[];
  templates: ShiftTemplate[];
  initialTab?: 'hospitals' | 'templates';
  onClose: () => void;
  onSaveHospitals: (hospitals: Hospital[]) => void;
  onSaveTemplates: (templates: ShiftTemplate[]) => void;
  onNotify: (type: 'success' | 'warning' | 'info', title: string, detail?: string) => void;
}

const PRESET_GRADIENTS = [
  { name: 'Esmeralda Quirúrgico', start: '#0d9488', end: '#059669' },
  { name: 'Azul Clínico', start: '#4f46e5', end: '#0284c7' },
  { name: 'Carmesí Urgencias', start: '#e11d48', end: '#ea580c' },
  { name: 'Violeta Especialidades', start: '#7c3aed', end: '#a855f7' },
  { name: 'Ámbar Pediatría', start: '#d97706', end: '#f59e0b' },
  { name: 'Cian Cuidados Críticos', start: '#0891b2', end: '#06b6d4' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  hospitals,
  templates,
  initialTab = 'hospitals',
  onClose,
  onSaveHospitals,
  onSaveTemplates,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'hospitals' | 'templates'>(initialTab);

  // Hospital / Workplace state
  const [hospList, setHospList] = useState<Hospital[]>(hospitals);
  const [isCreatingHosp, setIsCreatingHosp] = useState(false);
  const [editingHosp, setEditingHosp] = useState<Hospital | null>(null);

  const [formName, setFormName] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formBusinessType, setFormBusinessType] = useState('Hospital');
  const [formCity, setFormCity] = useState('San Pedro Sula');
  const [formGradientStart, setFormGradientStart] = useState('#0d9488');
  const [formGradientEnd, setFormGradientEnd] = useState('#059669');
  const [formBadgeIcon, setFormBadgeIcon] = useState<Hospital['badgeIcon']>('hospital');
  const [formLogoUrl, setFormLogoUrl] = useState('');

  // Inline delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Templates state
  const [tplList, setTplList] = useState<ShiftTemplate[]>(templates);

  if (!isOpen) return null;

  // Hospital Handlers
  const handleStartCreateHosp = () => {
    setIsCreatingHosp(true);
    setEditingHosp(null);
    setConfirmDeleteId(null);
    setFormName('');
    setFormShortName('');
    setFormBusinessType('Hospital');
    setFormCity('San Pedro Sula');
    setFormGradientStart('#0d9488');
    setFormGradientEnd('#059669');
    setFormBadgeIcon('hospital');
    setFormLogoUrl('');
  };

  const handleStartEditHosp = (h: Hospital) => {
    setEditingHosp(h);
    setIsCreatingHosp(false);
    setConfirmDeleteId(null);
    setFormName(h.name);
    setFormShortName(h.shortName);
    setFormBusinessType(h.businessType || 'Hospital');
    setFormCity(h.city);
    setFormGradientStart(h.gradientStart);
    setFormGradientEnd(h.gradientEnd);
    setFormBadgeIcon(h.badgeIcon);
    setFormLogoUrl(h.logoUrl || '');
  };

  const handleSaveHospForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const short = formShortName.trim() || formName.trim().slice(0, 10);

    let updated: Hospital[];
    if (isCreatingHosp) {
      const newHosp: Hospital = {
        id: `hosp-${Date.now()}`,
        name: formName.trim(),
        shortName: short,
        businessType: formBusinessType.trim() || undefined,
        city: formCity.trim(),
        color: formGradientStart,
        gradientStart: formGradientStart,
        gradientEnd: formGradientEnd,
        badgeIcon: formBadgeIcon,
        logoUrl: formLogoUrl || undefined,
        isCustom: true,
      };
      updated = [...hospList, newHosp];
    } else {
      updated = hospList.map((h) =>
        h.id === editingHosp?.id
          ? {
              ...h,
              name: formName.trim(),
              shortName: short,
              businessType: formBusinessType.trim() || undefined,
              city: formCity.trim(),
              color: formGradientStart,
              gradientStart: formGradientStart,
              gradientEnd: formGradientEnd,
              badgeIcon: formBadgeIcon,
              logoUrl: formLogoUrl || undefined,
            }
          : h
      );
    }

    setHospList(updated);
    onSaveHospitals(updated);
    setIsCreatingHosp(false);
    setEditingHosp(null);
    onNotify('success', 'Guardado con éxito', `Se actualizó ${short}`);
  };

  const handleConfirmDelete = (id: string) => {
    const updated = hospList.filter((h) => h.id !== id);
    setHospList(updated);
    onSaveHospitals(updated);
    setConfirmDeleteId(null);
    onNotify('info', 'Lugar de trabajo eliminado');
  };

  // Templates Handlers
  const handleUpdateTemplate = (index: number, updates: Partial<ShiftTemplate>) => {
    setTplList((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], ...updates };
      if (updates.defaultStartTime !== undefined || updates.defaultEndTime !== undefined) {
        target.defaultHours = calculateShiftHours(target.defaultStartTime, target.defaultEndTime);
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleSaveTemplatesAll = () => {
    onSaveTemplates(tplList);
    onNotify('success', 'Horarios guardados', 'Plantillas de turnos actualizadas');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Ajustes</h2>
              <p className="text-xs text-slate-400">Lugares de trabajo y horarios predefinidos</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs (Thumb-Friendly on mobile) */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/50 flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'hospitals'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Lugares de Trabajo ({hospList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'templates'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Horarios Predefinidos</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* TAB 1: HOSPITALS & WORKPLACES */}
          {activeTab === 'hospitals' && (
            <div className="space-y-4">
              {!isCreatingHosp && !editingHosp ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Tus Centros y Empresas
                    </span>
                    <button
                      type="button"
                      onClick={handleStartCreateHosp}
                      className="min-h-[40px] px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nuevo Centro</span>
                    </button>
                  </div>

                  {hospList.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-400">Aún no tienes ningún lugar de trabajo creado.</p>
                      <button
                        type="button"
                        onClick={handleStartCreateHosp}
                        className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all"
                      >
                        + Crear tu primer centro
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {hospList.map((hosp) => (
                        <div
                          key={hosp.id}
                          className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 font-bold shadow-md"
                              style={{
                                background: `linear-gradient(135deg, ${hosp.gradientStart}, ${hosp.gradientEnd})`,
                              }}
                            >
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-slate-100 truncate">{hosp.name}</p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {hosp.city} {hosp.businessType && `· ${hosp.businessType}`} · <span className="font-mono text-teal-400">{hosp.shortName}</span>
                              </p>
                            </div>
                          </div>

                          {/* Actions with inline delete confirmation */}
                          {confirmDeleteId === hosp.id ? (
                            <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-500/40 px-2 py-1 rounded-xl animate-in fade-in shrink-0">
                              <span className="text-[11px] text-rose-300 font-semibold">¿Eliminar?</span>
                              <button
                                type="button"
                                onClick={() => handleConfirmDelete(hosp.id)}
                                className="w-7 h-7 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-colors shadow-sm"
                                title="Sí, eliminar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleStartEditHosp(hosp)}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-teal-300 p-1 rounded-lg"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(hosp.id)}
                                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-rose-400 p-1 rounded-lg"
                                title="Eliminar lugar de trabajo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Form for Hospital / Workplace */
                <form onSubmit={handleSaveHospForm} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-200">
                      {isCreatingHosp ? 'Nuevo Lugar de Trabajo / Centro' : `Editar ${editingHosp?.name}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingHosp(false);
                        setEditingHosp(null);
                        setConfirmDeleteId(null);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-200"
                    >
                      Volver
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Nombre Completo del Centro o Empresa *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Hospital Bendaña, Planta Cervecería, Empresa Seguridad..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {/* Custom Business / Sector Type Text Input */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Tipo o Giro de Negocio (Texto libre)</label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-1.5 scrollbar-none">
                      {['Hospital', 'Clínica', 'Fábrica / Planta', 'Call Center', 'Seguridad Privada', 'Hotel', 'Comercio'].map((tipo) => (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => setFormBusinessType(tipo)}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors shrink-0 ${
                            formBusinessType === tipo
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-semibold'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {tipo}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Escribe el tipo de negocio o actividad..."
                      value={formBusinessType}
                      onChange={(e) => setFormBusinessType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Nombre Corto (Botones y tarjetas)</label>
                      <input
                        type="text"
                        placeholder="Ej. Bendaña o Planta 1"
                        value={formShortName}
                        onChange={(e) => setFormShortName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Ciudad o Sede</label>
                      <input
                        type="text"
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5">Ícono del Centro / Empresa</label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { id: 'hospital', label: 'Hospital' },
                        { id: 'briefcase', label: 'Empresa / Negocio' },
                        { id: 'factory', label: 'Fábrica / Planta' },
                        { id: 'building', label: 'Edificio' },
                        { id: 'shield', label: 'Seguridad' },
                        { id: 'cross', label: 'Emergencias' },
                        { id: 'heart', label: 'Salud' },
                        { id: 'activity', label: 'Operaciones' },
                        { id: 'star', label: 'Destacado' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFormBadgeIcon(item.id as any)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            formBadgeIcon === item.id
                              ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1.5">Color & Gradiente</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                      {PRESET_GRADIENTS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setFormGradientStart(p.start);
                            setFormGradientEnd(p.end);
                          }}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 flex items-center gap-2 text-left"
                        >
                          <div
                            className="w-4 h-4 rounded shrink-0"
                            style={{ background: `linear-gradient(135deg, ${p.start}, ${p.end})` }}
                          />
                          <span className="text-[10px] text-slate-300 truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">Color 1:</span>
                        <input
                          type="color"
                          value={formGradientStart}
                          onChange={(e) => setFormGradientStart(e.target.value)}
                          className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">Color 2:</span>
                        <input
                          type="color"
                          value={formGradientEnd}
                          onChange={(e) => setFormGradientEnd(e.target.value)}
                          className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingHosp(false);
                        setEditingHosp(null);
                        setConfirmDeleteId(null);
                      }}
                      className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Horarios Predeterminados
                </span>
                <button
                  type="button"
                  onClick={() => setTplList(DEFAULT_TEMPLATES)}
                  className="text-[11px] text-slate-400 hover:text-teal-400 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar</span>
                </button>
              </div>

              {tplList.map((tpl, idx) => (
                <div
                  key={tpl.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 font-mono font-bold text-teal-400 text-xs flex items-center justify-center">
                      {tpl.code}
                    </span>
                    <div>
                      <p className="font-semibold text-xs text-slate-200">{tpl.name}</p>
                      <p className="text-[10px] text-slate-500">{tpl.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-[11px] font-mono">
                      <input
                        type="time"
                        value={tpl.defaultStartTime}
                        onChange={(e) => handleUpdateTemplate(idx, { defaultStartTime: e.target.value })}
                        className="bg-transparent text-slate-200 focus:outline-none"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="time"
                        value={tpl.defaultEndTime}
                        onChange={(e) => handleUpdateTemplate(idx, { defaultEndTime: e.target.value })}
                        className="bg-transparent text-slate-200 focus:outline-none"
                      />
                    </div>

                    <span className="text-[11px] font-mono font-bold text-teal-400 bg-teal-950/60 px-2 py-1 rounded border border-teal-800/40">
                      {tpl.defaultHours}h
                    </span>
                  </div>
                </div>
              ))}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveTemplatesAll}
                  className="min-h-[44px] px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Horarios</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
