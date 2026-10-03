import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X, Plus, Trash2, Edit2, Check, Building2, Stethoscope,
  Heart, Activity, Shield, PlusSquare, Image as ImageIcon, Sparkles
} from 'lucide-react';
import { Hospital } from '../types';

interface HospitalManagerModalProps {
  isOpen: boolean;
  hospitals: Hospital[];
  onClose: () => void;
  onSaveHospitals: (hospitals: Hospital[]) => void;
}

const PRESET_GRADIENTS = [
  { name: 'Esmeralda Quirúrgico', start: '#0d9488', end: '#059669' },
  { name: 'Azul Clínico', start: '#4f46e5', end: '#0284c7' },
  { name: 'Carmesí Urgencias', start: '#e11d48', end: '#ea580c' },
  { name: 'Violeta Especialidades', start: '#7c3aed', end: '#a855f7' },
  { name: 'Ámbar Pediatría', start: '#d97706', end: '#f59e0b' },
  { name: 'Cian Cuidados Críticos', start: '#0891b2', end: '#06b6d4' },
];

export const HospitalManagerModal: React.FC<HospitalManagerModalProps> = ({
  isOpen,
  hospitals,
  onClose,
  onSaveHospitals,
}) => {
  const [list, setList] = useState<Hospital[]>(hospitals);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formCity, setFormCity] = useState('San Pedro Sula');
  const [formGradientStart, setFormGradientStart] = useState('#0d9488');
  const [formGradientEnd, setFormGradientEnd] = useState('#059669');
  const [formBadgeIcon, setFormBadgeIcon] = useState<Hospital['badgeIcon']>('hospital');
  const [formLogoUrl, setFormLogoUrl] = useState('');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingHospital(null);
    setFormName('');
    setFormShortName('');
    setFormCity('San Pedro Sula');
    setFormGradientStart('#0d9488');
    setFormGradientEnd('#059669');
    setFormBadgeIcon('hospital');
    setFormLogoUrl('');
  };

  const handleStartEdit = (hosp: Hospital) => {
    setEditingHospital(hosp);
    setIsCreating(false);
    setFormName(hosp.name);
    setFormShortName(hosp.shortName);
    setFormCity(hosp.city);
    setFormGradientStart(hosp.gradientStart);
    setFormGradientEnd(hosp.gradientEnd);
    setFormBadgeIcon(hosp.badgeIcon);
    setFormLogoUrl(hosp.logoUrl || '');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const short = formShortName.trim() || formName.trim().slice(0, 10);

    if (isCreating) {
      const newHospital: Hospital = {
        id: `hosp-${Date.now()}`,
        name: formName.trim(),
        shortName: short,
        city: formCity.trim(),
        color: formGradientStart,
        gradientStart: formGradientStart,
        gradientEnd: formGradientEnd,
        badgeIcon: formBadgeIcon,
        logoUrl: formLogoUrl || undefined,
        isCustom: true,
      };
      const updated = [...list, newHospital];
      setList(updated);
      onSaveHospitals(updated);
    } else if (editingHospital) {
      const updated = list.map((h) =>
        h.id === editingHospital.id
          ? {
              ...h,
              name: formName.trim(),
              shortName: short,
              city: formCity.trim(),
              color: formGradientStart,
              gradientStart: formGradientStart,
              gradientEnd: formGradientEnd,
              badgeIcon: formBadgeIcon,
              logoUrl: formLogoUrl || undefined,
            }
          : h
      );
      setList(updated);
      onSaveHospitals(updated);
    }

    setIsCreating(false);
    setEditingHospital(null);
  };

  const handleDelete = (id: string) => {
    if (list.length <= 1) {
      alert('Debes mantener al menos un hospital registrado.');
      return;
    }
    const updated = list.filter((h) => h.id !== id);
    setList(updated);
    onSaveHospitals(updated);
    if (editingHospital?.id === id) {
      setEditingHospital(null);
    }
  };

  const renderIconGlyph = (iconType: Hospital['badgeIcon'], className = 'w-4 h-4') => {
    switch (iconType) {
      case 'cross':
        return <PlusSquare className={className} />;
      case 'stethoscope':
        return <Stethoscope className={className} />;
      case 'heart':
        return <Heart className={className} />;
      case 'activity':
        return <Activity className={className} />;
      case 'shield':
        return <Shield className={className} />;
      case 'hospital':
      default:
        return <Building2 className={className} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Hospitales y Centros Médicos
              </h2>
              <p className="text-xs text-slate-400">
                Personaliza los colores, gradientes y logos para distinguir cada turno al instante
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

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Hospital List */}
          {!isCreating && !editingHospital && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tus Centros Asignados ({list.length})
                </span>
                <button
                  onClick={handleStartCreate}
                  className="px-3 py-1.5 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Hospital / Clínica</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {list.map((hosp) => (
                  <div
                    key={hosp.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md font-bold"
                        style={{
                          background: `linear-gradient(135deg, ${hosp.gradientStart}, ${hosp.gradientEnd})`,
                        }}
                      >
                        {hosp.logoUrl ? (
                          <img
                            src={hosp.logoUrl}
                            alt={hosp.shortName}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          renderIconGlyph(hosp.badgeIcon, 'w-5 h-5')
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-200 truncate">{hosp.name}</p>
                        <p className="text-xs text-slate-400">{hosp.city} · <span className="font-mono text-teal-400">{hosp.shortName}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(hosp)}
                        className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar hospital"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(hosp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create or Edit Form */}
          {(isCreating || editingHospital) && (
            <form onSubmit={handleSaveForm} className="space-y-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-200">
                  {isCreating ? 'Nuevo Hospital o Clínica' : `Editar ${editingHospital?.name}`}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingHospital(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Volver a la lista
                </button>
              </div>

              {/* Preview Box */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Vista previa en el turno:</span>
                <div
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-md flex items-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${formGradientStart}, ${formGradientEnd})`,
                  }}
                >
                  {formLogoUrl ? (
                    <img src={formLogoUrl} alt="Logo" className="w-4 h-4 rounded object-cover" />
                  ) : (
                    renderIconGlyph(formBadgeIcon, 'w-3.5 h-3.5')
                  )}
                  <span>{formShortName || formName || 'Nombre Corto'}</span>
                  <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px] font-mono">07:00-15:00</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nombre Completo del Hospital *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Hospital Bendaña"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nombre Corto (para botones y tarjetas)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Bendaña o Catarino"
                    value={formShortName}
                    onChange={(e) => setFormShortName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Ciudad / Ubicación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. San Pedro Sula"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Ícono Médico
                  </label>
                  <div className="flex gap-2">
                    {(['hospital', 'cross', 'stethoscope', 'heart', 'activity', 'shield'] as const).map(
                      (iconType) => (
                        <button
                          key={iconType}
                          type="button"
                          onClick={() => {
                            setFormBadgeIcon(iconType);
                            setFormLogoUrl(''); // Switch back to icon if user picks icon
                          }}
                          className={`p-2 rounded-lg border text-xs transition-colors ${
                            formBadgeIcon === iconType && !formLogoUrl
                              ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                          title={iconType}
                        >
                          {renderIconGlyph(iconType)}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Gradient Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Gradiente y Color de Identificación
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {PRESET_GRADIENTS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setFormGradientStart(preset.start);
                        setFormGradientEnd(preset.end);
                      }}
                      className="p-2 rounded-lg border border-slate-800 hover:border-slate-700 text-left flex items-center gap-2 transition-colors bg-slate-900"
                    >
                      <div
                        className="w-5 h-5 rounded-md shrink-0 shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${preset.start}, ${preset.end})`,
                        }}
                      />
                      <span className="text-[11px] text-slate-300 truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Color 1:</span>
                    <input
                      type="color"
                      value={formGradientStart}
                      onChange={(e) => setFormGradientStart(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Color 2:</span>
                    <input
                      type="color"
                      value={formGradientEnd}
                      onChange={(e) => setFormGradientEnd(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Logo / Image */}
              <div className="border-t border-slate-800 pt-3">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Logo personalizado (Opcional - Imagen o foto del hospital)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 flex items-center gap-2 transition-colors">
                    <ImageIcon className="w-4 h-4 text-teal-400" />
                    <span>Subir imagen o logo...</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {formLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormLogoUrl('')}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Quitar logo
                    </button>
                  )}
                </div>
              </div>

              {/* Save or Cancel */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingHospital(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Hospital</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
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
