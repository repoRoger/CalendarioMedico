import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X, Building2, Save, Check, Pipette,
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

const PRESET_WORKPLACE_COLORS = [
  { hex: '#0d9488', name: 'Turquesa Clínico' },
  { hex: '#0284c7', name: 'Azul Médico' },
  { hex: '#4f46e5', name: 'Índigo Hospital' },
  { hex: '#7c3aed', name: 'Violeta UCI' },
  { hex: '#e11d48', name: 'Rojo Emergencias' },
  { hex: '#ea580c', name: 'Naranja Industrial' },
  { hex: '#16a34a', name: 'Verde Quirúrgico' },
  { hex: '#059669', name: 'Esmeralda' },
  { hex: '#d97706', name: 'Ámbar' },
  { hex: '#0891b2', name: 'Cian Sanitario' },
  { hex: '#db2777', name: 'Rosa Maternidad' },
  { hex: '#475569', name: 'Gris Corporativo' },
];

const POPULAR_EMOJIS = [
  '🏥', '🏨', '⚕️', '🩺', '💉', '🚑', '🧪', '🔬',
  '🏫', '📚', '🎓', '🎒', '👩‍🏫', '👨‍🏫',
  '🏢', '🏬', '🏪', '🛒', '💼', '💻',
  '🏭', '🏗️', '🛡️', '🔒', '👮', '🚒',
  '✈️', '🍽️', '☕', '⚡', '🌟', '🎯'
];

const BUSINESS_TYPE_SUGGESTIONS = [
  'Hospital',
  'Clínica Privada',
  'Centro de Salud',
  'Fábrica / Maquila',
  'Escuela / Colegio',
  'Universidad',
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
  const [color, setColor] = useState('#0d9488');
  const [badgeIcon, setBadgeIcon] = useState<Hospital['badgeIcon']>('hospital');
  const [emoji, setEmoji] = useState('🏥');

  useEffect(() => {
    if (hospital) {
      setName(hospital.name);
      setShortName(hospital.shortName);
      setCity(hospital.city || '');
      setBusinessType(hospital.businessType || 'Hospital');
      setColor(hospital.color || hospital.gradientStart || '#0d9488');
      setBadgeIcon(hospital.badgeIcon || 'hospital');
      setEmoji(hospital.emoji || '🏥');
    } else {
      setName('');
      setShortName('');
      setCity('');
      setBusinessType('Hospital');
      setColor('#0d9488');
      setBadgeIcon('hospital');
      setEmoji('🏥');
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

    const short = (shortName.trim() || name.slice(0, 4)).toUpperCase();
    const finalColor = color.trim() || '#0d9488';

    const savedItem: Hospital = {
      id: hospital?.id || `hosp-${Date.now()}`,
      name: name.trim(),
      shortName: short,
      city: city.trim() || 'Honduras',
      businessType: businessType.trim() || 'Hospital',
      color: finalColor,
      gradientStart: finalColor,
      gradientEnd: finalColor,
      badgeIcon,
      emoji: emoji.trim() || '🏥',
      isCustom: true,
    };

    onSave(savedItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 30 }}
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden my-0 sm:my-auto flex flex-col max-h-[92vh]"
      >
        {/* Mobile Grab Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md font-bold text-sm transition-colors"
              style={{ backgroundColor: color }}
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
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
                placeholder="Ej. Hospital Escuela, Bendaña..."
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
                placeholder="Ej. HE, BEND"
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

          {/* Color del Centro de Trabajo (Selector Sólido + Color Picker Personal) */}
          <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Pipette className="w-3.5 h-3.5 text-teal-400" />
                <span>Color de Identificación del Centro</span>
              </label>
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-lg border border-white/40 shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">{color}</span>
              </div>
            </div>

            {/* Paleta de Colores Preestablecidos */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
              {PRESET_WORKPLACE_COLORS.map((p) => {
                const isSelected = color.toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setColor(p.hex)}
                    className={`h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold transition-all ${
                      isSelected
                        ? 'ring-2 ring-white scale-105 shadow-lg border-2 border-white'
                        : 'border border-slate-800 opacity-90 hover:opacity-100 hover:scale-[1.02]'
                    }`}
                    style={{ backgroundColor: p.hex }}
                    title={p.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>

            {/* Selector de Color Libre / Personalizado (HTML5 Color Picker + Input HEX) */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/80">
              <label className="relative flex items-center justify-center w-11 h-11 rounded-xl cursor-pointer border border-slate-700 bg-slate-900 hover:border-teal-400 transition-colors shrink-0 shadow-inner">
                <input
                  type="color"
                  value={color.startsWith('#') && color.length === 7 ? color : '#0d9488'}
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
                  placeholder="#0d9488"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-teal-300 uppercase focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Emoticon y Logo */}
          <div className="space-y-1.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Emoticono / Ícono Visual
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Seleccionado:</span>
                <span className="text-2xl">{emoji}</span>
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {POPULAR_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center shrink-0 border transition-all ${
                    emoji === e
                      ? 'bg-teal-500/20 border-teal-400 scale-105 shadow-sm'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={4}
                placeholder="Escribe o pega cualquier emoji (ej. 🏥, 🩺, 🏫)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 min-h-[40px]"
              />
              <span className="text-[10px] text-slate-400">Teclado emoji</span>
            </div>
          </div>

          {/* Ícono Identificador secundario */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Ícono del Centro
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

          {/* Preview Card en Calendario con la Fusión de Color */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
              Vista previa: Fusión de Color en el Calendario
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Badge sólido del centro */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div
                  className="w-8 h-8 rounded-xl text-white font-bold flex items-center justify-center text-sm shadow-md"
                  style={{ backgroundColor: color }}
                >
                  {emoji || '🏥'}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-100 block truncate">{name || 'Centro Médico'}</span>
                  <span className="text-[10px] text-slate-400">{city || 'Honduras'} · Color Sólido</span>
                </div>
              </div>

              {/* Fusión con turno TA (#f59e0b) en calendario */}
              <div
                className="p-2 rounded-xl text-white shadow-md border border-white/20 flex flex-col justify-center"
                style={{
                  background: `linear-gradient(135deg, ${color} 0%, #f59e0b 100%)`,
                }}
              >
                <div className="flex items-center justify-between text-xs font-black font-mono">
                  <span>TA</span>
                  <span className="text-[9px] font-sans font-normal opacity-90">07:00 - 15:00</span>
                </div>
                <div className="text-[10px] font-bold truncate mt-0.5 opacity-95">
                  {emoji || '🏥'} {shortName || 'CENTRO'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 shrink-0">
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
              <span>{isEditing ? 'Guardar Cambios' : 'Crear Lugar de Trabajo'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
