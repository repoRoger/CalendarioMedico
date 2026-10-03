import React from 'react';
import { Calendar, CalendarDays, List, BarChart3, Settings, Plus } from 'lucide-react';

interface MobileBottomBarProps {
  currentView: 'month' | 'week' | 'list';
  onViewChange: (view: 'month' | 'week' | 'list') => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onQuickAddToday: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  currentView,
  onViewChange,
  onOpenStats,
  onOpenSettings,
  onQuickAddToday,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 pb-safe">
      <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-1">
        {/* Tab 1: Mes */}
        <button
          onClick={() => onViewChange('month')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors ${
            currentView === 'month' ? 'text-teal-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] mt-1">Mes</span>
        </button>

        {/* Tab 2: Semana */}
        <button
          onClick={() => onViewChange('week')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors ${
            currentView === 'week' ? 'text-teal-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] mt-1">Semana</span>
        </button>

        {/* Tab 3: Quick Add Button in Center (Tactile thumb anchor) */}
        <div className="flex items-center justify-center">
          <button
            onClick={onQuickAddToday}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-teal-900/40 active:scale-95 transition-transform"
            title="Agregar turno hoy"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Tab 4: Lista / Próximos */}
        <button
          onClick={() => onViewChange('list')}
          className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors ${
            currentView === 'list' ? 'text-teal-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <List className="w-5 h-5" />
          <span className="text-[10px] mt-1">Próximos</span>
        </button>

        {/* Tab 5: Ajustes */}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center min-h-[44px] py-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Settings className="w-5 h-5 text-amber-400/90" />
          <span className="text-[10px] mt-1">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};
