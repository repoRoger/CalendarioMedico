import React from 'react';
import { Building2, Calendar, Clock, User, Settings } from 'lucide-react';

export type MainAppSection = 'trabajos' | 'calendario' | 'proximos' | 'perfil' | 'ajustes';

interface AppBottomNavProps {
  activeSection: MainAppSection;
  onSelectSection: (section: MainAppSection) => void;
}

export const AppBottomNav: React.FC<AppBottomNavProps> = ({
  activeSection,
  onSelectSection,
}) => {
  const navItems: { id: MainAppSection; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'trabajos', label: 'Trabajos', icon: Building2 },
    { id: 'calendario', label: 'Calendario', icon: Calendar },
    { id: 'proximos', label: 'Próximos', icon: Clock },
    { id: 'perfil', label: 'Mi perfil', icon: User },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 shadow-2xl">
      <div className="max-w-xl mx-auto px-2">
        <div className="grid grid-cols-5 items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const isProximos = item.id === 'proximos';

            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`flex flex-col items-center justify-center py-1 relative min-h-[48px] rounded-xl transition-all ${
                  isActive
                    ? 'text-teal-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Active Indicator Top Pill */}
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 bg-teal-400 rounded-full shadow-sm shadow-teal-400/50" />
                )}

                <div
                  className={`flex items-center justify-center transition-transform ${
                    isProximos && isActive
                      ? 'w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 scale-105 shadow-sm'
                      : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <span className={`text-[10.5px] mt-1 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
