import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  X, User, Camera, Trash2, Check, Sparkles, Phone, Mail, Award, Stethoscope, Database
} from 'lucide-react';
import { UserSession } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  currentUser: UserSession;
  onClose: () => void;
  onSaveUser: (user: UserSession) => void;
}

const COMMON_PREFIXES = ['Licda.', 'Lic.', 'Dr.', 'Dra.', 'Téc.', 'Enf.', 'Aux.', 'Mgtr.'];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSaveUser,
}) => {
  const [titlePrefix, setTitlePrefix] = useState(currentUser.titlePrefix || 'Licda.');
  const [personalName, setPersonalName] = useState(currentUser.personalName || currentUser.name.replace(/^(Licda\.|Lic\.|Dr\.|Dra\.|Téc\.|Enf\.|Aux\.)\s*/i, ''));
  const [role, setRole] = useState(currentUser.role || 'Licenciada en Enfermería');
  const [specialty, setSpecialty] = useState(currentUser.specialty || 'Cuidados Intensivos y Urgencias');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [photoBlob, setPhotoBlob] = useState(currentUser.photoBlob || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Photo upload & resize to compact 300x300 JPEG data URL
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoBlob(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPersonal = personalName.trim() || 'Colega';
    const cleanPrefix = titlePrefix.trim();
    const fullName = cleanPrefix ? `${cleanPrefix} ${cleanPersonal}` : cleanPersonal;

    const updated: UserSession = {
      ...currentUser,
      titlePrefix: cleanPrefix,
      personalName: cleanPersonal,
      name: fullName,
      role: role.trim() || 'Personal de Salud',
      specialty: specialty.trim(),
      phone: phone.trim(),
      photoBlob: photoBlob,
    };

    onSaveUser(updated);
    onClose();
  };

  const computedFullName = titlePrefix.trim()
    ? `${titlePrefix.trim()} ${personalName.trim() || 'Tu Nombre'}`
    : personalName.trim() || 'Tu Nombre';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 35 }}
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-0 sm:my-auto"
      >
        {/* Mobile handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Mis Datos</h2>
              <p className="text-xs text-slate-400">Tu información profesional y foto de perfil</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 p-2 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="flex-1 p-5 overflow-y-auto space-y-4">
          {/* Avatar / Photo Uploader */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 border-2 border-slate-700 overflow-hidden flex items-center justify-center shadow-lg shadow-teal-950/40">
                {photoBlob ? (
                  <img
                    src={photoBlob}
                    alt={computedFullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-black text-white">
                    {personalName ? personalName.charAt(0).toUpperCase() : 'M'}
                  </span>
                )}
              </div>

              {/* Camera icon button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 p-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl shadow-md transition-all active:scale-90"
                title="Cambiar foto de perfil"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <h3 className="font-bold text-sm text-slate-100">{computedFullName}</h3>
              <p className="text-xs text-teal-400">{role || 'Enfermería'}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-teal-300 hover:underline font-semibold"
                >
                  {photoBlob ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {photoBlob && (
                  <>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => setPhotoBlob('')}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Quitar foto
                    </button>
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                Se guarda en Turso como imagen directa (sin necesidad de buckets externos).
              </p>
            </div>
          </div>

          {/* Abreviatura / Prefijo Profesional */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Abreviatura o Título Profesional
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-2 scrollbar-none">
              {COMMON_PREFIXES.map((prefix) => (
                <button
                  key={prefix}
                  type="button"
                  onClick={() => setTitlePrefix(prefix)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border ${
                    titlePrefix === prefix
                      ? 'bg-teal-600 text-white border-teal-400 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {prefix}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="O escribe una abreviatura personalizada (ej. Licda., Dr., Téc.)"
              value={titlePrefix}
              onChange={(e) => setTitlePrefix(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Nombre Personal */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre y Apellidos
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Karen Rodríguez"
              value={personalName}
              onChange={(e) => setPersonalName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-semibold focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Rol / Profesión */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Cargo o Rol
              </label>
              <input
                type="text"
                placeholder="Ej. Licenciada en Enfermería"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Especialidad / Área
              </label>
              <input
                type="text"
                placeholder="Ej. Cuidados Críticos / UCI"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Teléfono opcional */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Teléfono / WhatsApp (Opcional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="tel"
                placeholder="+504 9999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Correo informativo (Cuenta activa) */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-teal-400" />
              <div>
                <span className="text-[11px] block text-slate-500">Cuenta de Turso vinculada:</span>
                <span className="font-mono text-slate-200">{currentUser.email}</span>
              </div>
            </div>
            <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-mono">
              cliente_correo
            </span>
          </div>

          {/* Bottom Submit */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[48px] px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-900/30 transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Mis Datos</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
