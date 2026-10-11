import React from 'react';
import { User, BarChart3, Share2 } from 'lucide-react';
import { UserSession } from '../types';

interface HeaderProps {
  user: UserSession;
  onOpenProfile: () => void;
  onOpenStats?: () => void;
  onOpenExport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenProfile,
  onOpenStats,
  onOpenExport,
}) => {
  // Obtener solo primeros dos nombres o nombre y apellido (sin cargo ni prefijo)
  const getCleanShortName = () => {
    const raw = (user.personalName || user.name || '')
      .replace(/^(Licda\.|Lic\.|Dr\.|Dra\.|Téc\.|Enf\.|Aux\.|Ing\.|Prof\.|Sr\.|Sra\.)\s*/i, '')
      .trim();
    if (!raw) return 'Usuario';
    const words = raw.split(/\s+/).filter(Boolean);
    return words.slice(0, 2).join(' ');
  };

  // Solo el cargo abajo (sin especialidad ni lugar de trabajo)
  const getShortCargo = () => {
    return user.role?.trim() || user.titlePrefix?.trim() || 'Profesional';
  };

  return (
    <header
      className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 pb-2.5 sm:py-2.5"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 2rem)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: User Avatar, Name & Cargo */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 sm:gap-2.5 text-left group hover:opacity-95 transition-opacity min-w-0"
          title="Ver perfil y reportes"
        >
          {/* Avatar or Initials */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-900/40 shrink-0 border border-teal-400/30 overflow-hidden">
            {user.photoBlob ? (
              <img
                src={user.photoBlob}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs sm:text-sm font-black">
                {user.personalName ? user.personalName.charAt(0) : user.name.charAt(0)}
              </span>
            )}
          </div>

          {/* Name & Cargo (Clean, compact and truncated to prevent overflowing buttons) */}
          <div className="min-w-0 max-w-[135px] sm:max-w-xs">
            <h1 className="text-sm font-black tracking-tight text-yellow-400 group-hover:text-amber-300 transition-colors truncate">
              {getCleanShortName()}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              {getShortCargo()}
            </p>
          </div>
        </button>

        {/* Right: Quick actions (Resumen y Compartir) - shrink-0 to never overflow */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenStats && (
            <button
              onClick={onOpenStats}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 min-h-[38px] active:scale-95"
              title="Resumen de horas del mes"
            >
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="hidden md:inline">Resumen</span>
            </button>
          )}

          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 min-h-[38px] active:scale-95"
              title="Compartir rol en PDF o Excel"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Compartir</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
