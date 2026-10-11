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
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: User Title & Name (e.g. Lic. Roger Adan) and Role */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 text-left group hover:opacity-95 transition-opacity"
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

          {/* Name & Role (no email username) */}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-teal-300 transition-colors truncate">
              {user.name}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              {user.role ? `${user.role}${user.specialty ? ` · ${user.specialty}` : ''}` : (user.specialty || 'Personal de Salud')}
            </p>
          </div>
        </button>

        {/* Right: Quick actions (Only Resumen and Compartir) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
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
