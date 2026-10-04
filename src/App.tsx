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
  getMonthMatrix, getWeekDays, formatDateToIso, SPANISH_MONTHS,
  getHondurasDate, getHondurasTodayIso, getHondurasTomorrowIso
} from './lib/timeUtils';
import { Header } from './components/Header';
import { AppBottomNav, MainAppSection } from './components/AppBottomNav';
import { ProximosView } from './components/ProximosView';
import { WorkplacesListView } from './components/WorkplacesListView';
import { WorkplaceModal } from './components/WorkplaceModal';
import { ProfileReportView } from './components/ProfileReportView';
import { SettingsListView } from './components/SettingsListView';
import { TemplateModal } from './components/TemplateModal';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarWeekView } from './components/CalendarWeekView';
import { ShiftListView } from './components/ShiftListView';
import { DayEditModal } from './components/DayEditModal';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { LoginModal } from './components/LoginModal';
import { StatsSummaryModal } from './components/StatsSummaryModal';
import { ExportModal } from './components/ExportModal';
import { LedNotification, LedMessage } from './components/LedNotification';
import {
  getTursoClient, syncLocalDataToTurso, saveUserProfileToTurso,
  fetchUserProfileFromTurso, fetchShiftsFromTurso, fetchHospitalsFromTurso,
  mergeShifts, mergeHospitals, deleteHospitalFromTurso,
  loginUserWithPassword, registerUserWithPassword
} from './lib/tursoClient';
import { generateSampleShifts, DEFAULT_HOSPITALS } from './lib/storage';

export default function App() {
  const [currentDate, setCurrentDate] = useState(() => getHondurasDate());
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'list'>('month');
  const [activeSection, setActiveSection] = useState<MainAppSection>('proximos');

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

  // Workplace Modal State (Opens ONLY when creating or editing a workplace)
  const [isWorkplaceModalOpen, setIsWorkplaceModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);

  // Template Modal State (Opens ONLY when creating or editing a shift template)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);

  // Cloud Sync State
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

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

  // Sync Cloud bidirectional (merge local and remote without dropping either!)
  const handleSyncCloud = async (isSilent = false) => {
    if (!user.email || !tursoConfig.databaseUrl || !tursoConfig.authToken) {
      if (!isSilent) addNotification('warning', 'Sin sesión', 'Inicia sesión con tu correo para sincronizar.');
      return;
    }

    setIsSyncingCloud(true);
    try {
      const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);

      // 1. Fetch remote shifts and hospitals for this user from Turso
      const remoteShifts = await fetchShiftsFromTurso(client, user.email);
      const remoteHospitals = await fetchHospitalsFromTurso(client, user.email);

      let finalShifts = remoteShifts || [];

      // Check if this device has NEW local shifts that aren't in Turso yet (e.g. friend created them offline)
      if (shifts && shifts.length > 0) {
        const unsyncedLocal = shifts.filter(
          (localS) =>
            !finalShifts.some(
              (r) => r.id === localS.id || (r.date === localS.date && r.startTime === localS.startTime)
            )
        );
        if (unsyncedLocal.length > 0) {
          finalShifts = [...finalShifts, ...unsyncedLocal];
        }
      }

      setShifts(finalShifts);
      saveStoredShifts(finalShifts);

      // 2. HOSPITALS: Turso is authoritative if remote has records.
      // If this device created a new workplace locally not yet in Turso, include it!
      let finalHospitals = (remoteHospitals && remoteHospitals.length > 0) ? remoteHospitals : hospitals;
      if (hospitals && hospitals.length > 0 && remoteHospitals && remoteHospitals.length > 0) {
        const unsyncedHosp = hospitals.filter(
          (locH) => !remoteHospitals.some((r) => r.id === locH.id || r.name.toLowerCase() === locH.name.toLowerCase())
        );
        const customUnsynced = unsyncedHosp.filter((h) => h.isCustom);
        if (customUnsynced.length > 0) {
          finalHospitals = [...finalHospitals, ...customUnsynced];
        }
      }

      setHospitals(finalHospitals);
      saveStoredHospitals(finalHospitals);

      // 3. Keep Turso 100% updated with this consolidated authoritative dataset
      await syncLocalDataToTurso(client, user.email, finalShifts, finalHospitals, templates);

      if (!isSilent) {
        addNotification(
          'success',
          'Nube Turso sincronizada',
          `Sincronizados ${finalShifts.length} turnos totales desde Turso.`
        );
      }

      // 4. Fetch remote profile
      const remoteProfile = await fetchUserProfileFromTurso(client, user.email);
      if (remoteProfile) {
        setUser((prev) => {
          const merged = { ...prev, ...remoteProfile, isLoggedIn: true };
          saveStoredUser(merged);
          return merged;
        });
      }
    } catch (err: any) {
      console.warn('Sync cloud error:', err);
      if (!isSilent) {
        addNotification('warning', 'Aviso Turso', err.message || 'Error de conexión a Turso');
      }
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Allows user to reload/merge full sample shifts for October if they want
  const handleLoadSampleShifts = async () => {
    const samples = generateSampleShifts();
    const merged = mergeShifts(shifts, samples);
    setShifts(merged);
    saveStoredShifts(merged);
    addNotification(
      'success',
      'Turnos cargados',
      `Se agregaron turnos de muestra (${merged.length} turnos en total).`
    );

    if (tursoConfig.databaseUrl && tursoConfig.authToken && user.email) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        await syncLocalDataToTurso(client, user.email, merged, hospitals, templates);
      } catch (err) {
        console.warn('Sync sample error:', err);
      }
    }
  };

  // Auto-fetch from Turso on app load/mount based strictly on logged-in user
  useEffect(() => {
    if (user.email && user.isLoggedIn) {
      handleSyncCloud(true);
    }
  }, [user.email, user.isLoggedIn]);

  // Month navigation
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevDate = () => {
    if (currentView === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    }
  };

  const handleNextDate = () => {
    if (currentView === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(getHondurasDate());
  };

  const handleSelectSection = (section: MainAppSection) => {
    // All 5 sections navigate smoothly to their dedicated full-screen views!
    setActiveSection(section);
  };

  const handleSaveHospitalFromModal = (savedHosp: Hospital) => {
    let updated: Hospital[];
    const exists = hospitals.some((h) => h.id === savedHosp.id);
    if (exists) {
      updated = hospitals.map((h) => (h.id === savedHosp.id ? savedHosp : h));
      addNotification('success', 'Lugar actualizado', `Se guardó ${savedHosp.shortName}`);
    } else {
      updated = [...hospitals, savedHosp];
      addNotification('success', 'Lugar creado', `Se agregó ${savedHosp.shortName}`);
    }
    handleSaveHospitals(updated);
  };

  const handleSaveTemplateFromModal = (savedTpl: ShiftTemplate) => {
    let updated: ShiftTemplate[];
    const exists = templates.some((t) => t.id === savedTpl.id);
    if (exists) {
      updated = templates.map((t) => (t.id === savedTpl.id ? savedTpl : t));
      addNotification('success', 'Turno actualizado', `Se actualizó ${savedTpl.name}`);
    } else {
      updated = [...templates, savedTpl];
      addNotification('success', 'Turno creado', `Se agregó ${savedTpl.name}`);
    }
    handleSaveTemplates(updated);
  };

  // Google Login handler
  const handleLoginGoogle = async (email: string, personalName?: string, photoUrl?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setIsSyncingCloud(true);

    // 1. Immediately wipe previous session data from memory
    setShifts([]);
    setHospitals([]);

    // 2. Build fresh active user
    let activeUser: UserSession = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      titlePrefix: '',
      personalName: personalName || cleanEmail.split('@')[0],
      name: personalName || cleanEmail.split('@')[0],
      role: '',
      specialty: '',
      phone: '',
      photoBlob: photoUrl || '',
      isLoggedIn: true,
      isGoogleAuth: true,
    };

    // 3. Fetch THAT user's profile and shifts from Turso
    if (tursoConfig.databaseUrl && tursoConfig.authToken) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        const [remoteProfile, remoteShifts, remoteHospitals] = await Promise.all([
          fetchUserProfileFromTurso(client, cleanEmail),
          fetchShiftsFromTurso(client, cleanEmail),
          fetchHospitalsFromTurso(client, cleanEmail),
        ]);

        if (remoteProfile) {
          activeUser = {
            ...activeUser,
            titlePrefix: remoteProfile.titlePrefix || activeUser.titlePrefix,
            personalName: remoteProfile.personalName || activeUser.personalName,
            name: remoteProfile.name || activeUser.name,
            role: remoteProfile.role || activeUser.role,
            specialty: remoteProfile.specialty || activeUser.specialty,
            phone: remoteProfile.phone || activeUser.phone,
            photoBlob: remoteProfile.photoBlob || photoUrl || activeUser.photoBlob,
          };
        } else {
          // Register new Google user in Turso
          await client.execute({
            sql: `
              INSERT INTO usuarios (cliente_correo, nombre_personal, nombre_completo, foto_blob, creado_con_google, actualizado_en)
              VALUES (?, ?, ?, ?, 1, ?)
              ON CONFLICT(cliente_correo) DO UPDATE SET
                creado_con_google = 1,
                actualizado_en = excluded.actualizado_en
            `,
            args: [cleanEmail, activeUser.personalName, activeUser.name, photoUrl || null, new Date().toISOString()],
          });
        }

        // New users start with 0 hospitals (not forced 3!)
        const finalShifts = remoteShifts || [];
        const finalHospitals = (remoteHospitals && remoteHospitals.length > 0) ? remoteHospitals : [];

        setShifts(finalShifts);
        saveStoredShifts(finalShifts);

        setHospitals(finalHospitals);
        saveStoredHospitals(finalHospitals);

        addNotification('success', 'Sesión iniciada con Google', `Bienvenido/a, ${activeUser.name}`);
      } catch (err: any) {
        console.error('Error cargando datos de Turso:', err);
        addNotification('warning', 'Aviso de conexión', 'No se pudieron descargar turnos de Turso');
      } finally {
        setIsSyncingCloud(false);
      }
    } else {
      setIsSyncingCloud(false);
      addNotification('success', 'Sesión iniciada', `Bienvenido/a, ${activeUser.name}`);
    }

    setUser(activeUser);
    saveStoredUser(activeUser);
  };

  // Password Login Handler
  const handleLoginWithPassword = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!tursoConfig.databaseUrl || !tursoConfig.authToken) {
      return { success: false, message: 'La base de datos Turso no está configurada.' };
    }

    try {
      const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
      const authRes = await loginUserWithPassword(client, cleanEmail, password);
      if (!authRes.success || !authRes.user) {
        return { success: false, message: authRes.message || 'Error al autenticar.' };
      }

      setIsSyncingCloud(true);
      setShifts([]);
      setHospitals([]);

      const [remoteShifts, remoteHospitals] = await Promise.all([
        fetchShiftsFromTurso(client, cleanEmail),
        fetchHospitalsFromTurso(client, cleanEmail),
      ]);

      const activeUser: UserSession = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        titlePrefix: authRes.user.titlePrefix || '',
        personalName: authRes.user.personalName || cleanEmail.split('@')[0],
        name: authRes.user.name || cleanEmail.split('@')[0],
        role: authRes.user.role || '',
        specialty: authRes.user.specialty || '',
        phone: authRes.user.phone || '',
        photoBlob: authRes.user.photoBlob || '',
        isLoggedIn: true,
        isGoogleAuth: false,
      };

      const finalShifts = remoteShifts || [];
      const finalHospitals = (remoteHospitals && remoteHospitals.length > 0) ? remoteHospitals : [];

      setShifts(finalShifts);
      saveStoredShifts(finalShifts);

      setHospitals(finalHospitals);
      saveStoredHospitals(finalHospitals);

      setUser(activeUser);
      saveStoredUser(activeUser);

      addNotification('success', 'Sesión iniciada', `Bienvenido/a, ${activeUser.name}`);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al conectar con Turso.' };
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Register with Password Handler
  const handleRegisterWithPassword = async (email: string, password: string, name: string): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!tursoConfig.databaseUrl || !tursoConfig.authToken) {
      return { success: false, message: 'La base de datos Turso no está configurada.' };
    }

    try {
      const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
      const authRes = await registerUserWithPassword(client, cleanEmail, password, name);
      if (!authRes.success || !authRes.user) {
        return { success: false, message: authRes.message || 'Error al crear la cuenta.' };
      }

      // Brand new user starts with 0 shifts and 0 hospitals
      setShifts([]);
      saveStoredShifts([]);
      setHospitals([]);
      saveStoredHospitals([]);

      const activeUser: UserSession = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        titlePrefix: '',
        personalName: name,
        name: name,
        role: 'Personal de Salud',
        specialty: '',
        phone: '',
        photoBlob: '',
        isLoggedIn: true,
        isGoogleAuth: false,
      };

      setUser(activeUser);
      saveStoredUser(activeUser);

      addNotification('success', '¡Cuenta creada!', `Bienvenido/a al Calendario Médico, ${name}`);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al registrarse en Turso.' };
    }
  };

  // Optional: load reference hospitals for users with 0 hospitals
  const handleLoadDefaultHospitals = async () => {
    setHospitals(DEFAULT_HOSPITALS);
    saveStoredHospitals(DEFAULT_HOSPITALS);
    if (user.email && tursoConfig.databaseUrl && tursoConfig.authToken) {
      const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
      await syncLocalDataToTurso(client, user.email, shifts, DEFAULT_HOSPITALS, templates);
    }
    addNotification('success', 'Centros sugeridos cargados', 'Se agregaron Bendaña, Catarino y CEMESA a tu cuenta.');
  };

  // Logout handler
  const handleLogout = () => {
    const emptyUser: UserSession = {
      id: '',
      titlePrefix: '',
      personalName: '',
      name: '',
      email: '',
      role: '',
      specialty: '',
      phone: '',
      photoBlob: '',
      isLoggedIn: false,
      isGoogleAuth: false,
    };
    setUser(emptyUser);
    saveStoredUser(emptyUser);
    setShifts([]);
    saveStoredShifts([]);
    setHospitals([]);
    saveStoredHospitals([]);
    addNotification('info', 'Sesión cerrada', 'Ingresa con tu correo de Google o contraseña para ver tus turnos.');
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
        syncLocalDataToTurso(client, user.email, nextShifts, hospitals, templates)
          .then((res) => {
            if (res.success) {
              addNotification('success', 'Nube Turso actualizada', `Guardados ${res.syncedShiftsCount} turnos.`);
            } else {
              addNotification('warning', 'Aviso Turso', res.message);
            }
          })
          .catch((err) => {
            console.warn('Background Turso sync skipped:', err);
          });
      } catch (err) {
        console.warn('Background Turso sync skipped:', err);
      }
    }
  };

  const handleSaveHospitals = (updatedHospitals: Hospital[], deletedHospId?: string) => {
    setHospitals(updatedHospitals);
    saveStoredHospitals(updatedHospitals);

    // Auto-sync in background to Turso
    if (tursoConfig.databaseUrl && tursoConfig.authToken && user.email) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        if (deletedHospId) {
          deleteHospitalFromTurso(client, user.email, deletedHospId).catch(console.warn);
        }
        syncLocalDataToTurso(client, user.email, shifts, updatedHospitals, templates)
          .then((res) => {
            if (res.success) {
              addNotification('success', 'Nube Turso actualizada', `Guardados ${res.syncedHospitalsCount} centros.`);
            }
          })
          .catch((err) => {
            console.warn('Background Turso sync skipped:', err);
          });
      } catch (err) {
        console.warn('Background Turso sync skipped:', err);
      }
    }
  };

  const handleManualTursoSync = async () => {
    await handleSyncCloud(false);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-28 sm:pb-32">
      {/* Top Bar: Shows user title & name (Lic. Roger Adan) and cloud sync button */}
      <Header
        user={user}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onSyncCloud={() => handleSyncCloud(false)}
        isSyncingCloud={isSyncingCloud}
        onOpenStats={() => setIsStatsModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-5 pb-24">
        {/* VIEW 1: PRÓXIMOS (Página principal por defecto al entrar) */}
        {activeSection === 'proximos' && (
          <ProximosView
            shifts={shifts}
            hospitals={hospitals}
            user={user}
            onEditDay={(dateIso) => setSelectedDateForModal(dateIso)}
            onGoToCalendar={() => setActiveSection('calendario')}
            onOpenWorkplaces={() => setActiveSection('trabajos')}
          />
        )}

        {/* VIEW 2: TRABAJOS (Listado visual de centros sin popup) */}
        {activeSection === 'trabajos' && (
          <WorkplacesListView
            hospitals={hospitals}
            shifts={shifts}
            onOpenCreate={() => {
              setEditingHospital(null);
              setIsWorkplaceModalOpen(true);
            }}
            onOpenEdit={(hosp) => {
              setEditingHospital(hosp);
              setIsWorkplaceModalOpen(true);
            }}
            onDeleteHospital={(hospId) => {
              const updated = hospitals.filter((h) => h.id !== hospId);
              handleSaveHospitals(updated, hospId);
              addNotification('info', 'Lugar eliminado', 'Se quitó el centro de trabajo.');
            }}
            onLoadDefaultHospitals={handleLoadDefaultHospitals}
          />
        )}

        {/* VIEW 3: CALENDARIO (Vista completa de mes con su propio selector de mes) */}
        {activeSection === 'calendario' && (
          <div className="space-y-3 sm:space-y-4">
            {/* Dedicated Month Selector & View Mode Switcher for Calendar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
              {/* Month / Year Navigator */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-2xl p-1 self-start sm:self-auto shadow-inner">
                <button
                  onClick={handlePrevDate}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95"
                  title={currentView === 'week' ? 'Semana anterior' : 'Mes anterior'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={handleToday}
                  className="px-3 py-1.5 text-sm font-extrabold text-slate-100 hover:text-teal-300 transition-colors capitalize text-center min-w-[130px] sm:min-w-[160px] tracking-tight"
                  title="Ir al mes o semana actual (Hoy)"
                >
                  {currentView === 'week'
                    ? `Semana: ${weekDays[0]?.dayNumber} al ${weekDays[6]?.dayNumber} ${SPANISH_MONTHS[currentMonth]?.slice(0, 3)}`
                    : `${SPANISH_MONTHS[currentMonth]} ${currentYear}`}
                </button>

                <button
                  onClick={handleNextDate}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95"
                  title={currentView === 'week' ? 'Semana siguiente' : 'Mes siguiente'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleToday}
                  className="px-2.5 py-1 text-xs font-bold text-teal-400 hover:text-teal-300 bg-teal-950/60 border border-teal-800/40 rounded-xl hover:bg-teal-900/60 transition-colors ml-1"
                >
                  Hoy
                </button>
              </div>

              {/* View mode switcher: Mes / Semana / Lista */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-1 self-start sm:self-auto">
                <button
                  onClick={() => setCurrentView('month')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'month'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mes
                </button>
                <button
                  onClick={() => setCurrentView('week')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'week'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setCurrentView('list')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'list'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Lista
                </button>
              </div>
            </div>
            {/* Hospital Filter WrapPanel */}
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
                      setEditingHospital(null);
                      setIsWorkplaceModalOpen(true);
                    }}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-900/30 flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar centro</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* "Todos" pill */}
                  <button
                    onClick={() => setHospitalFilter('all')}
                    className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                      hospitalFilter === 'all'
                        ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20 ring-2 ring-teal-400'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span>Todos</span>
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

                  {/* Quick link to create workplace */}
                  <button
                    onClick={() => {
                      setEditingHospital(null);
                      setIsWorkplaceModalOpen(true);
                    }}
                    className="text-xs text-slate-400 hover:text-teal-300 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-700 hover:border-teal-500/50 min-h-[40px] flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo Centro</span>
                  </button>
                </div>
              )}
            </div>

            {/* Calendar Month View (Al darle clic a cualquier celda, se abre el modal para editar turnos) */}
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
                onPrevWeek={handlePrevDate}
                onNextWeek={handleNextDate}
                onToday={handleToday}
              />
            )}

            {currentView === 'list' && (
              <ShiftListView
                shifts={hospitalFilter === 'all' ? shifts : shifts.filter((s) => s.hospitalId === hospitalFilter)}
                hospitals={hospitals}
                onSelectDate={(date) => setSelectedDateForModal(date)}
              />
            )}
          </div>
        )}

        {/* VIEW 4: PERFIL (Ficha técnica y reporte del usuario en pantalla completa) */}
        {activeSection === 'perfil' && (
          <ProfileReportView
            user={user}
            hospitals={hospitals}
            shifts={shifts}
            onOpenEditModal={() => setIsProfileModalOpen(true)}
            onManualSync={handleManualTursoSync}
            onLoadSampleShifts={handleLoadSampleShifts}
            onLogout={handleLogout}
          />
        )}

        {/* VIEW 5: AJUSTES (Listado de horarios y turnos en pantalla completa) */}
        {activeSection === 'ajustes' && (
          <SettingsListView
            templates={templates}
            onOpenCreate={() => {
              setEditingTemplate(null);
              setIsTemplateModalOpen(true);
            }}
            onOpenEdit={(tpl) => {
              setEditingTemplate(tpl);
              setIsTemplateModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Unified 5-Item Bottom Navigation Bar (Trabajos, Calendario, Próximos, Perfil, Ajustes) */}
      <AppBottomNav
        activeSection={activeSection}
        user={user}
        onSelectSection={handleSelectSection}
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
            setEditingHospital(null);
            setIsWorkplaceModalOpen(true);
          }}
        />
      )}

      {/* POPUP: Workplace Modal (Opens ONLY when creating or editing a workplace) */}
      {isWorkplaceModalOpen && (
        <WorkplaceModal
          isOpen={isWorkplaceModalOpen}
          hospital={editingHospital}
          onClose={() => {
            setIsWorkplaceModalOpen(false);
            setEditingHospital(null);
          }}
          onSave={handleSaveHospitalFromModal}
        />
      )}

      {/* POPUP: Template Modal (Opens ONLY when creating or editing a shift template) */}
      {isTemplateModalOpen && (
        <TemplateModal
          isOpen={isTemplateModalOpen}
          template={editingTemplate}
          onClose={() => {
            setIsTemplateModalOpen(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveTemplateFromModal}
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
          onLoginGoogle={handleLoginGoogle}
          onLoginWithPassword={handleLoginWithPassword}
          onRegisterWithPassword={handleRegisterWithPassword}
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
