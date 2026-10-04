import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X, Building2, Save, Sparkles, Check,
  Stethoscope, Heart, Activity, Shield, Briefcase, Factory, Building, Star
} from 'lucide-react';
import { Hospital } from '../types';

interface WorkplaceModalProps {
  isOpen: boolean;
  hospital: Hospital | null; // null for creating, Hospital for editing
  onClose: () => void;
  onSave: (hospital: Hospital) => void;
}

const BADGE_ICONS: { id: Hospital['badgeIcon']; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'hospital', label: 'Hospital', icon: Building2 },
  { id: 'stethoscope', label: 'Estetoscopio', icon: Stethoscope },
  { id: 'heart', label: 'Corazón', icon: Heart },
  { id: 'activity', label: 'Monitoreo', icon: Activity },
  { id: 'shield', label: 'Seguridad', icon: Shield },
  { id: 'factory', label: 'Fábrica/Maquila', icon: Factory },
  { id: 'building', label: 'Edificio', icon: Building },
  { id: 'briefcase', label: 'Empresa', icon: Briefcase },
  { id: 'star', label: 'Especial', icon: Star },
];

const PRESET_GRADIENTS = [
  { start: '#0d9488', end: '#059669', name: 'Turquesa Clínico' },
  { start: '#0284c7', end: '#2563eb', name: 'Azul Médico' },
  { start: '#7c3aed', end: '#4f46e5', name: 'Violeta UCI' },
  { start: '#e11d48', end: '#be123c', name: 'Rojo Emergencias' },
  { start: '#ea580c', end: '#c2410c', name: 'Naranja Industrial' },
  { start: '#16a34a', end: '#15803d', name: 'Verde Quirúrgico' },
  { start: '#475569', end: '#334155', name: 'Gris Corporativo' },
  { start: '#d97706', end: '#b45309', name: 'Ámbar Farmacia' },
];

const BUSINESS_TYPE_SUGGESTIONS = [
  'Hospital',
  'Clínica Privada',
  'Centro de Salud',
  'Fábrica / Maquila',
  'Call Center',
  'Seguridad',
  'Farmacia',
  'Laboratorio',
];

export const WorkplaceModal: React.FC<WorkplaceModalProps> = ({
  isOpen,
  hospital,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(hospital);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [city, setCity] = useState('');
  const [businessType, setBusinessType] = useState('Hospital');
  const [gradientStart, setGradientStart] = useState('#0d9488');
  const [gradientEnd, setGradientEnd] = useState('#059669');
  const [badgeIcon, setBadgeIcon] = useState<Hospital['badgeIcon']>('hospital');

  useEffect(() => {
    if (hospital) {
      setName(hospital.name);
      setShortName(hospital.shortName);
      setCity(hospital.city || '');
      setBusinessType(hospital.businessType || 'Hospital');
      setGradientStart(hospital.gradientStart || '#0d9488');
      setGradientEnd(hospital.gradientEnd || '#059669');
      setBadgeIcon(hospital.badgeIcon || 'hospital');
    } else {
      setName('');
      setShortName('');
      setCity('');
      setBusinessType('Hospital');
      setGradientStart('#0d9488');
      setGradientEnd('#059669');
      setBadgeIcon('hospital');
    }
  }, [hospital, isOpen]);

  // Auto-generate short abbreviation when typing name if shortName is not manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && (!shortName || shortName.length <= 4)) {
      const parts = val.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const acronym = parts.map((w) => w[0]?.toUpperCase()).join('').slice(0, 4);
        setShortName(acronym);
      } else if (parts.length === 1 && parts[0].length >= 2) {
        setShortName(parts[0].slice(0, 4).toUpperCase());
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const short = (shortName.trim() || name.slice(0, 4)).toUpperCase();

    const savedItem: Hospital = {
      id: hospital?.id || `hosp-${Date.now()}`,
      name: name.trim(),
      shortName: short,
      city: city.trim() || 'Honduras',
      businessType: businessType.trim() || 'Hospital',
      color: gradientStart,
      gradientStart,
      gradientEnd,
      badgeIcon,
      isCustom: true,
    };

    onSave(savedItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md font-bold text-sm"
              style={{ background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` }}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {isEditing ? 'Editar Lugar de Trabajo' : 'Nuevo Lugar de Trabajo'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? 'Modifica los datos del centro' : 'Hospital, clínica, empresa o fábrica'}
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Nombre y Siglas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Nombre del Centro / Lugar *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Hospital Escuela, Clínica Bendaña..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Siglas (Badge) *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={shortName}
                onChange={(e) => setShortName(e.target.value.toUpperCase())}
                placeholder="Ej. HE, CB"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-teal-300 focus:outline-none focus:border-teal-500 min-h-[44px]"
              />
            </div>
          </div>

          {/* Tipo / Giro de negocio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Tipo de Lugar o Negocio
            </label>
            <div className="flex gap-1.5 flex-wrap pb-1">
              {BUSINESS_TYPE_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setBusinessType(sug)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    businessType === sug
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="O escribe otro tipo personalizado..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 min-h-[44px]"
            />
          </div>

          {/* Ciudad */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">
              Ciudad / Ubicación
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ej. Tegucigalpa, San Pedro Sula, La Ceiba..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 min-h-[44px]"
            />
          </div>

          {/* Ícono */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Ícono Identificador
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {BADGE_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = badgeIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setBadgeIcon(item.id)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-teal-500/20 border-teal-500/60 text-teal-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-[10px] truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color del Centro */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Color en el Calendario
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_GRADIENTS.map((p) => {
                const isSelected = gradientStart === p.start && gradientEnd === p.end;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setGradientStart(p.start);
                      setGradientEnd(p.end);
                    }}
                    className={`h-11 rounded-xl p-2 flex items-center justify-between text-white text-xs font-bold transition-all ${
                      isSelected ? 'ring-2 ring-white scale-102 shadow-md' : 'opacity-85 hover:opacity-100'
                    }`}
                    style={{ background: `linear-gradient(135deg, ${p.start}, ${p.end})` }}
                  >
                    <span className="text-[11px] truncate">{p.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Card */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Vista previa en calendario:</span>
            <div className="flex items-center gap-2">
              <div
                className="px-2.5 py-1 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` }}
              >
                <span className="bg-black/25 px-1 py-0.2 rounded font-mono text-[10px]">
                  {shortName || 'HE'}
                </span>
                <span>{name || 'Nombre del Centro'}</span>
              </div>
              <span className="text-xs text-slate-400">· {city || 'Honduras'} ({businessType})</span>
            </div>
          </div>

          {/* Action Buttons */}
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
              <span>{isEditing ? 'Guardar Cambios' : 'Crear Lugar de Trabajo'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
