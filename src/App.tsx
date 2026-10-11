import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Plus, Building2, User, BarChart3, Database,
  Share2, ChevronLeft, ChevronRight, Moon, Sun, Sparkles, AlertTriangle,
  ShieldCheck, Filter, RefreshCw, Settings, LogOut
} from 'lucide-react';
import { Hospital, MedicalShift, ShiftTemplate, ShiftCode, UserSession, TursoConfig } from './types';
import {
  getStoredHospitals, saveStoredHospitals,
  getStoredShifts, saveStoredShifts,
  getStoredTemplates, saveStoredTemplates,
  getStoredUser, saveStoredUser,
  getStoredTursoConfig, saveStoredTursoConfig,
  DEFAULT_TEMPLATES, getHospitalForShift
} from './lib/storage';
import {
  getMonthMatrix, getWeekDays, formatDateToIso, SPANISH_MONTHS,
  getHondurasDate, getHondurasTodayIso, getHondurasTomorrowIso, isShiftLibre,
  getShiftDisplayCode
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
  fetchTemplatesFromTurso, initializeDefaultTemplatesForUser,
  mergeShifts, mergeHospitals,
  saveShiftToTurso, deleteShiftFromTurso,
  saveHospitalToTurso, deleteHospitalFromTurso,
  saveTemplateToTurso, deleteTemplateFromTurso,
  loginUserWithPassword, registerUserWithPassword,
  checkAppUpdateFromTurso
} from './lib/tursoClient';
import { generateSampleShifts, DEFAULT_HOSPITALS } from './lib/storage';
import { CURRENT_APP_VERSION } from './lib/appVersion';

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

  // Load data directly from Turso (authoritative remote source)
  const handleSyncCloud = async (isSilent = false) => {
    if (!user.email || !tursoConfig.databaseUrl || !tursoConfig.authToken) {
      if (!isSilent) addNotification('warning', 'Sin sesión', 'Inicia sesión con tu correo para cargar datos de Turso.');
      return;
    }

    setIsSyncingCloud(true);
    try {
      const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);

      // Fetch remote shifts, hospitals, templates and profile directly from Turso
      const [remoteShifts, remoteHospitals, remoteTemplates, remoteProfile] = await Promise.all([
        fetchShiftsFromTurso(client, user.email),
        fetchHospitalsFromTurso(client, user.email),
        initializeDefaultTemplatesForUser(client, user.email, DEFAULT_TEMPLATES),
        fetchUserProfileFromTurso(client, user.email),
      ]);

      setShifts(remoteShifts || []);
      setHospitals(remoteHospitals || []);

      let finalTemplates = remoteTemplates || DEFAULT_TEMPLATES;
      if (remoteTemplates && remoteTemplates.length > 0) {
        const orderedCodes: ShiftCode[] = [
          'TA', 'TB', 'TC', '24H',
          'CHOQUE',
          'LIBRE_A', 'LIBRE_B', 'LIBRE_C', 'LIBRE', 'L',
          'TA-TB', 'TB-TC', 'TC-TA',
        ];
        const sorted: ShiftTemplate[] = [];
        orderedCodes.forEach((code) => {
          const t = remoteTemplates.find((rt) => rt.code === code) || DEFAULT_TEMPLATES.find((dt) => dt.code === code);
          if (t) sorted.push(t);
        });
        remoteTemplates.forEach((rt) => {
          if (!orderedCodes.includes(rt.code) && !sorted.some((s) => s.id === rt.id)) {
            sorted.push(rt);
          }
        });
        finalTemplates = sorted;
      }
      setTemplates(finalTemplates);

      if (remoteProfile) {
        setUser((prev) => {
          const merged = { ...prev, ...remoteProfile, isLoggedIn: true };
          saveStoredUser(merged);
          return merged;
        });
      }

      if (!isSilent) {
        addNotification(
          'success',
          'Datos cargados de Turso',
          `Cargados ${(remoteShifts || []).length} turnos desde Turso.`
        );
      }
    } catch (err: any) {
      console.warn('Error al cargar datos desde Turso:', err);
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

  // Check for app updates silently on launch
  useEffect(() => {
    if (tursoConfig.databaseUrl && tursoConfig.authToken) {
      const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
      checkAppUpdateFromTurso(client, CURRENT_APP_VERSION)
        .then((res) => {
          if (res.hasUpdate && res.latest) {
            addNotification(
              'info',
              'Nueva actualización disponible',
              `Versión ${res.latest.version} lista para descargar en la pestaña de Perfil.`
            );
          }
        })
        .catch(() => {});
    }
  }, [tursoConfig.databaseUrl, tursoConfig.authToken]);

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

  const handleDeleteTemplateFromModal = async (templateId: string) => {
    const target = templates.find((t) => t.id === templateId);
    const updated = templates.filter((t) => t.id !== templateId);
    setTemplates(updated);
    addNotification('info', 'Turno eliminado', `Se eliminó "${target?.name || 'la plantilla'}"`);

    if (tursoConfig.databaseUrl && tursoConfig.authToken && user.email) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        await deleteTemplateFromTurso(client, user.email, templateId);
      } catch (err) {
        console.warn('Error deleting template from Turso:', err);
      }
    }
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
        const [remoteProfile, remoteShifts, remoteHospitals, remoteTemplates] = await Promise.all([
          fetchUserProfileFromTurso(client, cleanEmail),
          fetchShiftsFromTurso(client, cleanEmail),
          fetchHospitalsFromTurso(client, cleanEmail),
          initializeDefaultTemplatesForUser(client, cleanEmail, DEFAULT_TEMPLATES),
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
        const finalTemplates = (remoteTemplates && remoteTemplates.length > 0) ? remoteTemplates : DEFAULT_TEMPLATES;

        setShifts(finalShifts);
        setHospitals(finalHospitals);
        setTemplates(finalTemplates);

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

      const [remoteShifts, remoteHospitals, remoteTemplates] = await Promise.all([
        fetchShiftsFromTurso(client, cleanEmail),
        fetchHospitalsFromTurso(client, cleanEmail),
        initializeDefaultTemplatesForUser(client, cleanEmail, DEFAULT_TEMPLATES),
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
      const finalTemplates = (remoteTemplates && remoteTemplates.length > 0) ? remoteTemplates : DEFAULT_TEMPLATES;

      setShifts(finalShifts);
      setHospitals(finalHospitals);
      setTemplates(finalTemplates);

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

      // Brand new user starts with 0 shifts and 0 hospitals, and a fresh isolated copy of default templates in Turso
      setShifts([]);
      setHospitals([]);

      const userTemplates = await initializeDefaultTemplatesForUser(client, cleanEmail, DEFAULT_TEMPLATES);
      setTemplates(userTemplates);

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
    if (user.email && tursoConfig.databaseUrl && tursoConfig.authToken) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        for (const h of DEFAULT_HOSPITALS) {
          await saveHospitalToTurso(client, user.email, h);
        }
      } catch (err) {
        console.warn('Error saving default hospitals to Turso:', err);
      }
    }
    addNotification('success', 'Centros sugeridos cargados', 'Se agregaron Bendaña, Catarino y CEMESA a tu cuenta en Turso.');
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
    setHospitals([]);
    setTemplates(DEFAULT_TEMPLATES);
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

  // Handlers for data updates: DIRECT TURSO ONLY (No localStorage)
  const handleSaveDayShifts = async (date: string, updatedDayShifts: MedicalShift[]) => {
    const existingDayShifts = shifts.filter((s) => s.date === date);
    const filtered = shifts.filter((s) => s.date !== date);
    const nextShifts = [...filtered, ...updatedDayShifts];
    setShifts(nextShifts);

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
        'Turnos guardados',
        `${updatedDayShifts.length} turno(s) guardado(s) (${totalHours}h totales).`
      );
    } else {
      addNotification('info', 'Día actualizado', 'Se eliminaron los turnos asignados a esta fecha.');
    }

    // Direct mutation to Turso database
    if (tursoConfig.databaseUrl && tursoConfig.authToken && user.email) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        const removedShifts = existingDayShifts.filter(
          (oldS) => !updatedDayShifts.some((newS) => newS.id === oldS.id)
        );
        for (const rem of removedShifts) {
          await deleteShiftFromTurso(client, user.email, rem.id);
        }
        for (const s of updatedDayShifts) {
          await saveShiftToTurso(client, user.email, s);
        }
      } catch (err) {
        console.warn('Error saving shifts directly to Turso:', err);
        addNotification('warning', 'Aviso Turso', 'Error al sincronizar turnos con Turso.');
      }
    }
  };

  const handleSaveHospitals = async (updatedHospitals: Hospital[], deletedHospId?: string) => {
    setHospitals(updatedHospitals);

    if (tursoConfig.databaseUrl && tursoConfig.authToken && user.email) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        if (deletedHospId) {
          await deleteHospitalFromTurso(client, user.email, deletedHospId);
        }
        for (const h of updatedHospitals) {
          await saveHospitalToTurso(client, user.email, h);
        }
        addNotification('success', 'Centros guardados en Turso', 'Datos actualizados en la base de datos.');
      } catch (err) {
        console.warn('Error saving hospitals directly to Turso:', err);
        addNotification('warning', 'Aviso Turso', 'Error al guardar centros en Turso.');
      }
    }
  };

  const handleSaveTemplates = async (updatedTemplates: ShiftTemplate[], deletedTplId?: string) => {
    setTemplates(updatedTemplates);

    if (tursoConfig.databaseUrl && tursoConfig.authToken && user.email) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        if (deletedTplId) {
          await deleteTemplateFromTurso(client, user.email, deletedTplId);
        }
        for (const t of updatedTemplates) {
          await saveTemplateToTurso(client, user.email, t);
        }
        addNotification('success', 'Plantillas guardadas en Turso', 'Horarios actualizados en la base de datos.');
      } catch (err) {
        console.warn('Error saving templates directly to Turso:', err);
        addNotification('warning', 'Aviso Turso', 'Error al guardar plantillas en Turso.');
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
    if (data.shifts) setShifts(data.shifts);
    if (data.hospitals) setHospitals(data.hospitals);
    if (data.templates) setTemplates(data.templates);
    if (user.email && tursoConfig.databaseUrl && tursoConfig.authToken) {
      try {
        const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
        syncLocalDataToTurso(
          client,
          user.email,
          data.shifts || shifts,
          data.hospitals || hospitals,
          data.templates || templates
        ).catch(console.warn);
      } catch (err) {
        console.warn('Error syncing imported backup to Turso:', err);
      }
    }
    addNotification('success', 'Datos importados', 'Copia de seguridad restaurada directamente en Turso.');
  };

  const handleQuickAssignShift = (
    date: string,
    hospitalId: string,
    templateCode: ShiftCode,
    resolution: 'create' | 'replace' | 'keep_both' | 'mark_collision' = 'create',
    department?: string
  ) => {
    const tpl = templates.find((t) => t.code === templateCode) || DEFAULT_TEMPLATES.find((t) => t.code === templateCode);
    const hosp = hospitals.find((h) => h.id === hospitalId) || hospitals[0];
    if (!tpl || !hosp) return;

    const dayShifts = shifts.filter((s) => s.date === date);
    const isCollisionShift = templateCode === 'CHOQUE' || resolution === 'mark_collision';

    const newShift: MedicalShift = {
      id: `shift-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date,
      hospitalId: hosp.id,
      shiftCode: isCollisionShift ? 'CHOQUE' : tpl.code,
      title: isCollisionShift ? 'Choque de Turno' : tpl.name,
      startTime: tpl.defaultStartTime,
      endTime: tpl.defaultEndTime,
      hours: isShiftLibre(tpl.code) ? 0 : tpl.defaultHours,
      department: department?.trim() || '',
      color: isCollisionShift ? '#dc2626' : (tpl.color || '#f59e0b'),
      isNightShift: tpl.isNightShift,
      isCollision: isCollisionShift,
    };

    let nextDayShifts: MedicalShift[] = [];

    if (resolution === 'replace') {
      nextDayShifts = [newShift];
    } else if (resolution === 'mark_collision') {
      const flaggedExisting = dayShifts.map((s) => ({ ...s, isCollision: true }));
      nextDayShifts = [...flaggedExisting, newShift];
    } else if (resolution === 'keep_both') {
      nextDayShifts = [...dayShifts, newShift];
    } else {
      // Toggle if exact same shift already on this date
      const exactMatch = dayShifts.find((s) => {
        const sHosp = getHospitalForShift(s, hospitals);
        const sCode = getShiftDisplayCode(s.shiftCode);
        const tCode = getShiftDisplayCode(tpl.code);
        return sHosp.id === hosp.id && sCode === tCode;
      });
      if (exactMatch) {
        nextDayShifts = dayShifts.filter((s) => s.id !== exactMatch.id);
      } else {
        nextDayShifts = [...dayShifts, newShift];
      }
    }

    handleSaveDayShifts(date, nextDayShifts);
  };

  // Month matrix & week calculations
  const monthDays = getMonthMatrix(currentYear, currentMonth);
  const weekDays = getWeekDays(currentDate);

  // Month stats for quick banner
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const currentMonthShifts = shifts.filter((s) => s.date.startsWith(monthPrefix) && s.shiftCode !== 'L' && s.shiftCode !== 'LIBRE');
  const monthTotalHours = currentMonthShifts.reduce((acc, s) => acc + (s.hours || 0), 0);

  // 24H shifts count
  const hoursPerDayMap: Record<string, number> = {};
  currentMonthShifts.forEach((s) => {
    hoursPerDayMap[s.date] = (hoursPerDayMap[s.date] || 0) + (s.hours || 0);
  });
  const month24hDaysCount = Object.values(hoursPerDayMap).filter((h) => h >= 24).length;

  // GATEWAY SECURITY: If no active user session, show ONLY the Login modal / Gateway!
  if (!user.isLoggedIn || !user.email) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans">
        <LoginModal
          isOpen={true}
          onLoginGoogle={handleLoginGoogle}
          onLoginWithPassword={handleLoginWithPassword}
          onRegisterWithPassword={handleRegisterWithPassword}
        />
        <LedNotification
          notifications={notifications}
          onDismiss={dismissNotification}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-28 sm:pb-32">
      {/* Top Bar: Shows user title & name (Lic. Roger Adan) and cloud sync button */}
      <Header
        user={user}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenStats={() => setIsStatsModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-5 pb-24">
        {/* VIEW 1: PRÓXIMOS (Página principal por defecto al entrar) */}
        {activeSection === 'proximos' && (
          <ProximosView
            shifts={shifts}
            hospitals={hospitals}
            templates={templates}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
              {/* Month / Year Navigator */}
              <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 w-full sm:w-auto shadow-inner">
                <button
                  onClick={handlePrevDate}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                  title={currentView === 'week' ? 'Semana anterior' : 'Mes anterior'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={handleToday}
                  className="px-2 py-1 text-xs sm:text-sm font-extrabold text-slate-100 hover:text-teal-300 transition-colors capitalize text-center flex-1 sm:flex-none sm:min-w-[140px] tracking-tight"
                  title="Ir al mes o semana actual (Hoy)"
                >
                  {currentView === 'week'
                    ? `Semana: ${weekDays[0]?.dayNumber} al ${weekDays[6]?.dayNumber} ${SPANISH_MONTHS[currentMonth]?.slice(0, 3)}`
                    : `${SPANISH_MONTHS[currentMonth]} ${currentYear}`}
                </button>

                <button
                  onClick={handleNextDate}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                  title={currentView === 'week' ? 'Semana siguiente' : 'Mes siguiente'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleToday}
                  className="px-2 py-1 text-xs font-bold text-teal-400 hover:text-teal-300 bg-teal-950/60 border border-teal-800/40 rounded-lg hover:bg-teal-900/60 transition-colors ml-1"
                >
                  Hoy
                </button>
              </div>

              {/* View mode switcher: Mes / Semana / Lista (100% simétrico con grid-cols-3) */}
              <div className="grid grid-cols-3 bg-slate-950 border border-slate-800 rounded-xl p-1 w-full sm:w-64">
                <button
                  onClick={() => setCurrentView('month')}
                  className={`py-1.5 text-center rounded-lg text-xs font-bold transition-all ${
                    currentView === 'month'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mes
                </button>
                <button
                  onClick={() => setCurrentView('week')}
                  className={`py-1.5 text-center rounded-lg text-xs font-bold transition-all ${
                    currentView === 'week'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setCurrentView('list')}
                  className={`py-1.5 text-center rounded-lg text-xs font-bold transition-all ${
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
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
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
                  {/* "Todos" pill (sin contador de turnos para mayor limpieza) */}
                  <button
                    onClick={() => setHospitalFilter('all')}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center transition-all active:scale-95 ${
                      hospitalFilter === 'all'
                        ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20 ring-2 ring-teal-400'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
                    }`}
                  >
                    <span>Todos</span>
                  </button>

                  {/* Each hospital badge */}
                  {hospitals.map((hosp) => {
                    const isSelected = hospitalFilter === hosp.id;
                    const hospColor = hosp.color || hosp.gradientStart || '#0d9488';
                    const hospHours = currentMonthShifts
                      .filter((s) => s.hospitalId === hosp.id)
                      .reduce((acc, s) => acc + (s.hours || 0), 0);

                    return (
                      <button
                        key={hosp.id}
                        onClick={() => setHospitalFilter(isSelected ? 'all' : hosp.id)}
                        className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-all active:scale-95 shadow-sm border ${
                          isSelected
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-105 border-white font-bold'
                            : 'border-transparent opacity-85 hover:opacity-100 hover:scale-[1.02]'
                        }`}
                        style={{
                          backgroundColor: hospColor,
                        }}
                        title={isSelected ? 'Clic para mostrar todos' : `Filtrar solo turnos de ${hosp.name}`}
                      >
                        {hosp.emoji ? <span className="text-sm">{hosp.emoji}</span> : <Building2 className="w-3.5 h-3.5" />}
                        <span className="font-bold">{hosp.shortName}</span>
                        <span className="bg-black/25 px-1.5 py-0.2 rounded text-[10.5px] font-mono">
                          {hospHours}h
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Calendar Month View */}
            {currentView === 'month' && (
              <CalendarMonthView
                days={monthDays}
                shifts={shifts}
                hospitals={hospitals}
                templates={templates}
                filteredHospitalId={hospitalFilter}
                onSelectDate={(date) => setSelectedDateForModal(date)}
                onQuickAssignShift={handleQuickAssignShift}
              />
            )}

            {currentView === 'week' && (
              <CalendarWeekView
                days={weekDays}
                shifts={shifts}
                hospitals={hospitals}
                templates={templates}
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
                templates={templates}
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
            tursoConfig={tursoConfig}
            onOpenEditModal={() => setIsProfileModalOpen(true)}
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
          onDelete={handleDeleteTemplateFromModal}
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
