import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Plus, Building2, User, BarChart3, Database,
  Share2, ChevronLeft, ChevronRight, Moon, Sun, Sparkles, AlertTriangle,
  ShieldCheck, Filter, RefreshCw, Settings, LogOut
} from 'lucide-react';
import { Hospital, MedicalShift, ShiftTemplate, UserSession, TursoConfig } from './types';
import {
  getStoredHospitals, saveStoredHospitals,
  getStoredShifts, saveStoredShifts,
  getStoredTemplates, saveStoredTemplates,
  getStoredUser, saveStoredUser,
  getStoredTursoConfig, saveStoredTursoConfig
} from './lib/storage';
import {
  getMonthMatrix, getWeekDays, formatDateToIso, SPANISH_MONTHS
} from './lib/timeUtils';
import { Header } from './components/Header';
import { MobileBottomBar } from './components/MobileBottomBar';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarWeekView } from './components/CalendarWeekView';
import { ShiftListView } from './components/ShiftListView';
import { UpcomingShiftsWidget } from './components/UpcomingShiftsWidget';
import { DayEditModal } from './components/DayEditModal';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { LoginModal } from './components/LoginModal';
import { StatsSummaryModal } from './components/StatsSummaryModal';
import { ExportModal } from './components/ExportModal';
import { LedNotification, LedMessage } from './components/LedNotification';
import {
  getTursoClient, syncLocalDataToTurso, saveUserProfileToTurso,
  fetchUserProfileFromTurso, fetchShiftsFromTurso, fetchHospitalsFromTurso
} from './lib/tursoClient';

export default function App() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'list'>('month');

  // Core Data State
  const [hospitals, setHospitals] = useState<Hospital[]>(() => getStoredHospitals());
  const [shifts, setShifts] = useState<MedicalShift[]>(() => getStoredShifts());
  const [templates, setTemplates] = useState<ShiftTemplate[]>(() => getStoredTemplates());
  const [user, setUser] = useState<UserSession>(() => getStoredUser());
  const [tursoConfig, setTursoConfig] = useState<TursoConfig>(() => getStoredTursoConfig());

  // Hospital filter for calendar (WrapPanel)
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');

  // Modal States (User prefers modals/popups for adding and editing data)
  const [selectedDateForModal, setSelectedDateForModal] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'hospitals' | 'templates'>('hospitals');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // LED Notifications
  const [notifications, setNotifications] = useState<LedMessage[]>([]);

  const addNotification = (type: 'success' | 'warning' | 'info', title: string, detail?: string) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    const newMsg: LedMessage = { id, type, title, detail };
    setNotifications((prev) => [...prev, newMsg]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Month navigation
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Login handler
  const handleLogin = async (email: string, personalName?: string, photoUrl?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPrefix = user.titlePrefix || 'Licda.';
    const cleanPersonal = personalName || user.personalName || 'Karen Rodríguez';
    const fullName = `${cleanPrefix} ${cleanPersonal}`;

    const loggedInUser: UserSession = {
      ...user,
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      titlePrefix: cleanPrefix,
      personalName: cleanPersonal,
      name: fullName,
      photoBlob: user.photoBlob || photoUrl || '',
      isLoggedIn: true,
    };

    setUser(loggedInUser);
    saveStoredUser(loggedInUser);

    addNotification('success', 'Sesión iniciada', `Bienvenida/o, ${fullName}`);

    // Fetch user profile and shifts from Turso if connected
    if (tursoConfig.databaseUrl && tursoConfig.authToken) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        const remoteProfile = await fetchUserProfileFromTurso(client, cleanEmail);
        if (remoteProfile) {
          const merged: UserSession = {
            ...loggedInUser,
            ...remoteProfile,
            isLoggedIn: true,
          };
          setUser(merged);
          saveStoredUser(merged);
        }

        const remoteShifts = await fetchShiftsFromTurso(client, cleanEmail);
        if (remoteShifts && remoteShifts.length > 0) {
          setShifts(remoteShifts);
          saveStoredShifts(remoteShifts);
        }

        const remoteHospitals = await fetchHospitalsFromTurso(client, cleanEmail);
        if (remoteHospitals && remoteHospitals.length > 0) {
          setHospitals(remoteHospitals);
          saveStoredHospitals(remoteHospitals);
        }
      } catch (err) {
        console.warn('Turso initial fetch error:', err);
      }
    }
  };

  // Logout handler
  const handleLogout = () => {
    const loggedOutUser: UserSession = {
      ...user,
      isLoggedIn: false,
    };
    setUser(loggedOutUser);
    saveStoredUser(loggedOutUser);
    addNotification('info', 'Sesión cerrada', 'Ingresa tu correo para volver a entrar.');
  };

  // Save profile ("Mis datos") handler
  const handleSaveProfile = async (updatedUser: UserSession) => {
    setUser(updatedUser);
    saveStoredUser(updatedUser);
    addNotification('success', 'Datos guardados', 'Tu perfil y foto se actualizaron.');

    // Save profile directly to Turso (including photo_blob) in background
    if (tursoConfig.databaseUrl && tursoConfig.authToken) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        await saveUserProfileToTurso(client, updatedUser);
      } catch (err) {
        console.warn('Error saving profile to Turso:', err);
      }
    }
  };

  // Handlers for data updates
  const handleSaveDayShifts = (date: string, updatedDayShifts: MedicalShift[]) => {
    const filtered = shifts.filter((s) => s.date !== date);
    const nextShifts = [...filtered, ...updatedDayShifts];
    setShifts(nextShifts);
    saveStoredShifts(nextShifts);

    const totalHours = updatedDayShifts.reduce((acc, s) => acc + (s.hours || 0), 0);
    if (totalHours >= 24) {
      addNotification(
        'warning',
        '⚡ Guardia de 24 horas registrada',
        `Has programado ${totalHours}h continuas para el ${date}. Recuerda descansar después.`
      );
    } else if (updatedDayShifts.length > 0) {
      addNotification(
        'success',
        'Turnos actualizados',
        `${updatedDayShifts.length} turno(s) guardado(s) (${totalHours}h totales).`
      );
    } else {
      addNotification('info', 'Día actualizado', 'Se eliminaron los turnos asignados a esta fecha.');
    }

    // Auto-sync in background to Turso
    if (tursoConfig.databaseUrl && tursoConfig.authToken && user.email) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        syncLocalDataToTurso(client, user.email, nextShifts, hospitals, templates);
      } catch (err) {
        console.warn('Background Turso sync skipped:', err);
      }
    }
  };

  const handleSaveHospitals = (updatedHospitals: Hospital[]) => {
    setHospitals(updatedHospitals);
    saveStoredHospitals(updatedHospitals);

    // Auto-sync in background to Turso
    if (tursoConfig.databaseUrl && tursoConfig.authToken && user.email) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        syncLocalDataToTurso(client, user.email, shifts, updatedHospitals, templates);
      } catch (err) {
        console.warn('Background Turso sync skipped:', err);
      }
    }
  };

  const handleSaveTemplates = (updatedTemplates: ShiftTemplate[]) => {
    setTemplates(updatedTemplates);
    saveStoredTemplates(updatedTemplates);

    // Auto-sync in background to Turso
    if (tursoConfig.databaseUrl && tursoConfig.authToken && user.email) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        syncLocalDataToTurso(client, user.email, shifts, hospitals, updatedTemplates);
      } catch (err) {
        console.warn('Background Turso sync skipped:', err);
      }
    }
  };

  const handleSaveTursoConfig = (cfg: TursoConfig) => {
    setTursoConfig(cfg);
    saveStoredTursoConfig(cfg);
  };

  const handleImportBackup = (data: {
    shifts?: MedicalShift[];
    hospitals?: Hospital[];
    templates?: ShiftTemplate[];
  }) => {
    if (data.shifts) {
      setShifts(data.shifts);
      saveStoredShifts(data.shifts);
    }
    if (data.hospitals) {
      setHospitals(data.hospitals);
      saveStoredHospitals(data.hospitals);
    }
    if (data.templates) {
      setTemplates(data.templates);
      saveStoredTemplates(data.templates);
    }
    addNotification('success', 'Datos importados', 'Copia de seguridad restaurada correctamente.');
  };

  // Month matrix & week calculations
  const monthDays = getMonthMatrix(currentYear, currentMonth);
  const weekDays = getWeekDays(currentDate);

  // Month stats for quick banner
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const currentMonthShifts = shifts.filter((s) => s.date.startsWith(monthPrefix) && s.shiftCode !== 'L');
  const monthTotalHours = currentMonthShifts.reduce((acc, s) => acc + (s.hours || 0), 0);

  // 24H shifts count
  const hoursPerDayMap: Record<string, number> = {};
  currentMonthShifts.forEach((s) => {
    hoursPerDayMap[s.date] = (hoursPerDayMap[s.date] || 0) + (s.hours || 0);
  });
  const month24hDaysCount = Object.values(hoursPerDayMap).filter((h) => h >= 24).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16 md:pb-6">
      {/* Top Bar with Brand Dropdown (Calendario, Mis datos, Ajustes, Cerrar sesión) */}
      <Header
        currentYear={currentYear}
        currentMonth={currentMonth}
        currentView={currentView}
        user={user}
        hospitals={hospitals}
        onViewChange={setCurrentView}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenSettings={(tab = 'hospitals') => {
          setSettingsInitialTab(tab);
          setIsSettingsModalOpen(true);
        }}
        onOpenStats={() => setIsStatsModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-3 sm:space-y-4">
        {/* Hospital Filter WrapPanel (User request: "los wrappanel de centros en el calendario los usaría para filtrar los turnos") */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-teal-400" />
              <span>Filtrar por Centro Médico:</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-[11px]">
                Mes: <strong className="text-teal-400">{monthTotalHours}h</strong>
              </span>
              {month24hDaysCount > 0 && (
                <span className="text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">
                  ⚡ {month24hDaysCount} de 24h
                </span>
              )}
            </div>
          </div>

          {/* Interactive Pills */}
          {hospitals.length === 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-dashed border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Comienza agregando tu primer lugar de trabajo o centro (hospital, fábrica, empresa, etc.):</span>
              </div>
              <button
                onClick={() => {
                  setSettingsInitialTab('hospitals');
                  setIsSettingsModalOpen(true);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-900/30 flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar centro</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {/* "Todos los centros" pill */}
              <button
                onClick={() => setHospitalFilter('all')}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                  hospitalFilter === 'all'
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20 ring-2 ring-teal-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                }`}
              >
                <span>Todos los centros</span>
                <span className="bg-black/20 px-1.5 py-0.2 rounded text-[10.5px] font-mono">
                  {currentMonthShifts.length}
                </span>
              </button>

              {/* Each hospital badge */}
              {hospitals.map((hosp) => {
                const isSelected = hospitalFilter === hosp.id;
                const hospHours = currentMonthShifts
                  .filter((s) => s.hospitalId === hosp.id)
                  .reduce((acc, s) => acc + (s.hours || 0), 0);

                return (
                  <button
                    key={hosp.id}
                    onClick={() => setHospitalFilter(isSelected ? 'all' : hosp.id)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-all active:scale-95 shadow-sm border ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-105 border-white'
                        : 'border-transparent opacity-85 hover:opacity-100 hover:scale-[1.02]'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${hosp.gradientStart}, ${hosp.gradientEnd})`,
                    }}
                    title={isSelected ? 'Clic para mostrar todos' : `Filtrar solo turnos de ${hosp.name}`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="font-bold">{hosp.shortName}</span>
                    <span className="bg-black/25 px-1.5 py-0.2 rounded text-[10.5px] font-mono">
                      {hospHours}h
                    </span>
                  </button>
                );
              })}

              {/* Quick link to manage hospitals */}
              <button
                onClick={() => {
                  setSettingsInitialTab('hospitals');
                  setIsSettingsModalOpen(true);
                }}
                className="text-xs text-slate-400 hover:text-teal-300 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-700 hover:border-teal-500/50 min-h-[40px] flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Centro</span>
              </button>
            </div>
          )}
        </div>

        {/* Upcoming Shifts: Hoy y Mañana (Vista rápida al entrar) */}
        <UpcomingShiftsWidget
          shifts={shifts}
          hospitals={hospitals}
          onSelectDate={(dateIso) => setSelectedDateForModal(dateIso)}
        />

        {/* View Component based on switcher */}
        {currentView === 'month' && (
          <CalendarMonthView
            days={monthDays}
            shifts={shifts}
            hospitals={hospitals}
            filteredHospitalId={hospitalFilter}
            onSelectDate={(date) => setSelectedDateForModal(date)}
          />
        )}

        {currentView === 'week' && (
          <CalendarWeekView
            days={weekDays}
            shifts={shifts}
            hospitals={hospitals}
            filteredHospitalId={hospitalFilter}
            onSelectDate={(date) => setSelectedDateForModal(date)}
          />
        )}

        {currentView === 'list' && (
          <ShiftListView
            shifts={hospitalFilter === 'all' ? shifts : shifts.filter((s) => s.hospitalId === hospitalFilter)}
            hospitals={hospitals}
            onSelectDate={(date) => setSelectedDateForModal(date)}
          />
        )}
      </main>

      {/* Fixed Mobile Bottom Navigation Bar (Thumb ergonomics) */}
      <MobileBottomBar
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenStats={() => setIsStatsModalOpen(true)}
        onOpenSettings={() => {
          setSettingsInitialTab('hospitals');
          setIsSettingsModalOpen(true);
        }}
        onQuickAddToday={() => setSelectedDateForModal(formatDateToIso(new Date()))}
      />

      {/* POPUP: Edit Day Shifts (Mobile-First Bottom Sheet) */}
      {selectedDateForModal && (
        <DayEditModal
          isOpen={Boolean(selectedDateForModal)}
          date={selectedDateForModal}
          existingShifts={shifts.filter((s) => s.date === selectedDateForModal)}
          hospitals={hospitals}
          templates={templates}
          onClose={() => setSelectedDateForModal(null)}
          onSaveDayShifts={handleSaveDayShifts}
          onOpenHospitalManager={() => {
            setSettingsInitialTab('hospitals');
            setIsSettingsModalOpen(true);
          }}
        />
      )}

      {/* POPUP: Settings (Lugares de Trabajo y Horarios) */}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          initialTab={settingsInitialTab}
          hospitals={hospitals}
          templates={templates}
          onClose={() => setIsSettingsModalOpen(false)}
          onSaveHospitals={handleSaveHospitals}
          onSaveTemplates={handleSaveTemplates}
          onNotify={addNotification}
        />
      )}

      {/* POPUP: Mis Datos (Profile editing: Abreviatura, Nombre, Foto en Turso) */}
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          currentUser={user}
          onClose={() => setIsProfileModalOpen(false)}
          onSaveUser={handleSaveProfile}
        />
      )}

      {/* GATEWAY: Login Modal (Shown ONLY when logged out) */}
      {!user.isLoggedIn && (
        <LoginModal
          isOpen={!user.isLoggedIn}
          currentUser={user}
          onLogin={handleLogin}
        />
      )}

      {/* POPUP: Stats */}
      {isStatsModalOpen && (
        <StatsSummaryModal
          isOpen={isStatsModalOpen}
          year={currentYear}
          month={currentMonth}
          shifts={shifts}
          hospitals={hospitals}
          onClose={() => setIsStatsModalOpen(false)}
        />
      )}

      {/* POPUP: Export */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          year={currentYear}
          month={currentMonth}
          shifts={shifts}
          hospitals={hospitals}
          user={user}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* LED Status Notification System */}
      <LedNotification
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </div>
  );
}
