import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar, Clock, Building2, Database, User, BarChart3,
  Share2, ChevronLeft, ChevronRight, Settings, ChevronDown, Check, LogOut
} from 'lucide-react';
import { Hospital, UserSession } from '../types';
import { SPANISH_MONTHS } from '../lib/timeUtils';

interface HeaderProps {
  currentYear: number;
  currentMonth: number;
  currentView: 'month' | 'week' | 'list';
  user: UserSession;
  hospitals: Hospital[];
  onViewChange: (view: 'month' | 'week' | 'list') => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onOpenProfile: () => void;
  onOpenSettings: (tab?: 'hospitals' | 'templates' | 'turso') => void;
  onOpenStats: () => void;
  onOpenExport: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentYear,
  currentMonth,
  currentView,
  user,
  hospitals,
  onViewChange,
  onPrevMonth,
  onNextMonth,
  onToday,
  onOpenProfile,
  onOpenSettings,
  onOpenStats,
  onOpenExport,
  onLogout,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Zone 1: Interactive Brand with Dropdown: Calendario, Mis datos, Ajustes, Cerrar sesión */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all text-left group"
            title="Menú CalendarioMedico"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-900/40 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-base font-extrabold tracking-tight text-white group-hover:text-teal-300 transition-colors">
                Calendario<span className="text-teal-400">Medico</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform" />
            </div>
          </button>

          {/* Dropdown Menu Popup (Calendario, Mis datos, Ajustes, Cerrar sesión) */}
          {isMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-60 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl p-1.5 backdrop-blur-lg z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-800/80 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-teal-600/30 border border-teal-500/40 flex items-center justify-center font-bold text-teal-300 shrink-0">
                  {user.photoBlob ? (
                    <img src={user.photoBlob} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-100 truncate">{user.name}</p>
                  <p className="text-[11px] text-teal-400 truncate">{user.email}</p>
                </div>
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    onViewChange('month');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <span className="font-medium">Calendario</span>
                </button>

                <button
                  onClick={() => {
                    onOpenProfile();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <User className="w-4 h-4 text-sky-400" />
                  <span className="font-medium">Mis datos</span>
                </button>

                <button
                  onClick={() => {
                    onOpenSettings('hospitals');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span className="font-medium">Ajustes</span>
                </button>

                <div className="h-px bg-slate-800 my-1" />

                <button
                  onClick={() => {
                    onOpenStats();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span>Resumen de horas</span>
                </button>

                <button
                  onClick={() => {
                    onOpenExport();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>Compartir Rol</span>
                </button>

                <div className="h-px bg-slate-800 my-1" />

                {/* Cerrar Sesión option */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 text-rose-400 hover:bg-rose-500/10 transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Zone 2: Month / Navigation (Compact for mobile) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Month / Year navigator */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 sm:p-1">
            <button
              onClick={onPrevMonth}
              className="p-1 sm:p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={onToday}
              className="px-2 sm:px-3 py-1 text-xs font-bold text-slate-200 hover:text-teal-300 transition-colors capitalize min-w-[100px] sm:min-w-[130px] text-center"
            >
              {SPANISH_MONTHS[currentMonth]} {currentYear}
            </button>

            <button
              onClick={onNextMonth}
              className="p-1 sm:p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop view switcher */}
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => onViewChange('month')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'month'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => onViewChange('week')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'week'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => onViewChange('list')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'list'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lista
            </button>
          </div>
        </div>

        {/* Zone 3: Direct Action Shortcuts */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Ajustes button */}
          <button
            onClick={() => onOpenSettings()}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5 min-h-[40px]"
            title="Ajustes (Hospitales, Horarios, Turso)"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>

          {/* User profile avatar trigger (opens Mis Datos) */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 min-h-[40px]"
            title="Mis datos (Ver o editar perfil)"
          >
            <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 overflow-hidden flex items-center justify-center font-bold text-[11px] shrink-0">
              {user.photoBlob ? (
                <img src={user.photoBlob} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span>{user.personalName ? user.personalName.charAt(0) : user.name.charAt(0)}</span>
              )}
            </div>
            <span className="hidden lg:inline truncate max-w-[110px] font-medium">
              {user.name}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
