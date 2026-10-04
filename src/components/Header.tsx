import React from 'react';
import { User, LogOut, BarChart3, Share2, RefreshCw } from 'lucide-react';
import { UserSession } from '../types';

interface HeaderProps {
  user: UserSession;
  onOpenProfile: () => void;
  onSyncCloud?: () => void;
  isSyncingCloud?: boolean;
  onOpenStats?: () => void;
  onOpenExport?: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenProfile,
  onSyncCloud,
  isSyncingCloud = false,
  onOpenStats,
  onOpenExport,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: User Title & Name (e.g. Lic. Roger Adan) */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-2xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all text-left group"
          title="Ver o editar perfil"
        >
          {/* User Photo / Avatar */}
          <div className="w-9 h-9 rounded-2xl overflow-hidden bg-teal-600/20 border border-teal-500/40 flex items-center justify-center font-bold text-teal-300 shrink-0 shadow-md group-hover:border-teal-400 transition-colors">
            {user.photoBlob ? (
              <img src={user.photoBlob} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs">
                {user.personalName ? user.personalName.charAt(0) : user.name.charAt(0)}
              </span>
            )}
          </div>

          {/* Name & Title */}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-teal-300 transition-colors truncate">
              {user.name}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              {user.specialty || 'Honduras'} · <span className="text-teal-400 font-medium">{user.email ? user.email.split('@')[0] : 'Turnos'}</span>
            </p>
          </div>
        </button>

        {/* Right: Quick actions (Sync, Stats, Export, Logout) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onSyncCloud && (
            <button
              onClick={onSyncCloud}
              disabled={isSyncingCloud}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 min-h-[38px] disabled:opacity-50"
              title="Descargar y sincronizar turnos con Turso en la nube"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncingCloud ? 'Cargando...' : 'Nube'}</span>
            </button>
          )}

          {onOpenStats && (
            <button
              onClick={onOpenStats}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 min-h-[38px]"
              title="Resumen de horas del mes"
            >
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="hidden md:inline">Resumen</span>
            </button>
          )}

          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 min-h-[38px]"
              title="Exportar rol en PDF o Excel"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Exportar</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold text-slate-300 hover:text-rose-300 transition-colors flex items-center gap-1.5 min-h-[38px]"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};
