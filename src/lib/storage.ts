import { Hospital, MedicalShift, ShiftTemplate, UserSession, TursoConfig } from '../types';
import { formatDateToIso, calculateShiftHours } from './timeUtils';

const STORAGE_KEYS = {
  HOSPITALS: 'calendariomedico_hospitals_v1',
  SHIFTS: 'calendariomedico_shifts_v1',
  TEMPLATES: 'calendariomedico_templates_v1',
  USER: 'calendariomedico_user_v1',
  TURSO: 'calendariomedico_turso_v1',
};

export const DEFAULT_HOSPITALS: Hospital[] = [
  {
    id: 'hosp-bendana',
    name: 'Hospital Bendaña',
    shortName: 'Bendaña',
    city: 'San Pedro Sula',
    color: '#0d9488', // Teal 600
    gradientStart: '#0d9488',
    gradientEnd: '#059669',
    badgeIcon: 'hospital',
    address: 'Bo. Guamilito, 8 Calle, 14 Avenida NO',
    isCustom: false,
  },
  {
    id: 'hosp-catarino',
    name: 'Hospital Mario Catarino Rivas',
    shortName: 'Catarino',
    city: 'San Pedro Sula',
    color: '#4f46e5', // Indigo 600
    gradientStart: '#4f46e5',
    gradientEnd: '#0284c7',
    badgeIcon: 'cross',
    address: 'Col. Universidad, Boulevard del Norte',
    isCustom: false,
  },
  {
    id: 'hosp-cemesa',
    name: 'Hospital CEMESA',
    shortName: 'CEMESA',
    city: 'San Pedro Sula',
    color: '#ea580c', // Orange 600
    gradientStart: '#ea580c',
    gradientEnd: '#e11d48',
    badgeIcon: 'heart',
    address: 'Col. Altamira, Blvd. del Sur',
    isCustom: false,
  },
];

export const DEFAULT_TEMPLATES: ShiftTemplate[] = [
  {
    id: 'tpl-m',
    code: 'M',
    name: 'Mañana',
    defaultStartTime: '07:00',
    defaultEndTime: '15:00',
    defaultHours: 8,
    description: 'Turno matutino estándar de enfermería',
    colorBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    isNightShift: false,
  },
  {
    id: 'tpl-t',
    code: 'T',
    name: 'Tarde',
    defaultStartTime: '15:00',
    defaultEndTime: '23:00',
    defaultHours: 8,
    description: 'Turno vespertino continuo',
    colorBadge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    isNightShift: false,
  },
  {
    id: 'tpl-n',
    code: 'N',
    name: 'Noche',
    defaultStartTime: '23:00',
    defaultEndTime: '07:00',
    defaultHours: 8,
    description: 'Turno nocturno (cruza medianoche)',
    colorBadge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    isNightShift: true,
  },
  {
    id: 'tpl-24h',
    code: '24H',
    name: 'Guardia 24H',
    defaultStartTime: '07:00',
    defaultEndTime: '07:00',
    defaultHours: 24,
    description: 'Guardia completa de 24 horas continuas',
    colorBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    isNightShift: true,
  },
  {
    id: 'tpl-d',
    code: 'D',
    name: 'Doble Turno',
    defaultStartTime: '07:00',
    defaultEndTime: '23:00',
    defaultHours: 16,
    description: 'Turno extendido Mañana + Tarde (16h)',
    colorBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    isNightShift: false,
  },
  {
    id: 'tpl-c',
    code: 'C',
    name: 'Cubrir',
    defaultStartTime: '07:00',
    defaultEndTime: '15:00',
    defaultHours: 8,
    description: 'Reemplazo o cambio de turno cubriendo a un compañero/a',
    colorBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    isNightShift: false,
  },
  {
    id: 'tpl-l',
    code: 'L',
    name: 'Libre / Post-Turno',
    defaultStartTime: '00:00',
    defaultEndTime: '00:00',
    defaultHours: 0,
    description: 'Día de descanso reglamentario o compensatorio',
    colorBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    isNightShift: false,
  },
];

export const SOFIA_USER: UserSession = {
  id: 'usr-sofia',
  titlePrefix: 'Téc.',
  personalName: 'Sofía Hernández',
  name: 'Téc. Sofía Hernández',
  email: 'sofiahernandez02311@gmail.com',
  role: 'Técnico Instrumentista Quirúrgico',
  specialty: 'Sala de Operaciones',
  phone: '95103405',
  photoBlob: 'https://lh3.googleusercontent.com/a/ACg8ocLVZm5ifvnrt8XYv1B2o5tsKXPy2G5a3GkrP8ZOtmFpwNHXBqF9=s96-c',
  isGoogleAuth: true,
  isLoggedIn: true,
};

export const ROGER_USER: UserSession = {
  id: 'usr-roger',
  titlePrefix: 'Lic.',
  personalName: 'Roger Adan',
  name: 'Lic. Roger Adan',
  email: 'rogradan@gmail.com',
  role: 'Licenciado en Enfermería',
  specialty: 'Urgencias y Cuidados Críticos',
  phone: '',
  photoBlob: '',
  isGoogleAuth: true,
  isLoggedIn: true,
};

export const DEFAULT_USER: UserSession = ROGER_USER;

// Generates sample shifts (available on demand)
export function generateSampleShifts(): MedicalShift[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const shifts: MedicalShift[] = [];

  const addShift = (
    day: number,
    hospId: string,
    code: 'M' | 'T' | 'N' | '24H' | 'D' | 'E' | 'L',
    start: string,
    end: string,
    title: string,
    dept: string,
    notes?: string
  ) => {
    const d = new Date(year, month, day);
    const dateStr = formatDateToIso(d);
    const hours = calculateShiftHours(start, end);
    shifts.push({
      id: `shift-${dateStr}-${shifts.length + 1}`,
      date: dateStr,
      hospitalId: hospId,
      shiftCode: code,
      title,
      startTime: start,
      endTime: end,
      hours,
      department: dept,
      notes: notes || '',
      isNightShift: code === 'N' || code === '24H',
    });
  };

  // Day 2: Turno Mañana en Bendaña
  addShift(2, 'hosp-bendana', 'M', '07:00', '15:00', 'Mañana', 'UCI Adultos');

  // Day 3: TRIPLE TURNO (24 HORAS REALES TRABAJADAS - caso exacto de la amiga enfermera!)
  // Turno 1: Mañana en Bendaña
  addShift(3, 'hosp-bendana', 'M', '07:00', '15:00', 'Mañana (T1)', 'Emergencias', 'Rotación 1 de 3');
  // Turno 2: Tarde en Catarino
  addShift(3, 'hosp-catarino', 'T', '15:00', '23:00', 'Tarde (T2)', 'Cirugía Hombres', 'Continuo con Catarino');
  // Turno 3: Noche en Catarino
  addShift(3, 'hosp-catarino', 'N', '23:00', '07:00', 'Noche (T3)', 'Cirugía Hombres', 'Cierre de 24h continuas!');

  // Day 4: Libre post-guardia
  addShift(4, 'hosp-bendana', 'L', '00:00', '00:00', 'Libre', 'Post-Guardia', 'Descanso merecido');

  // Day 6: Turno 24H directo en Catarino
  addShift(6, 'hosp-catarino', '24H', '07:00', '07:00', 'Guardia 24H', 'Cuidados Intensivos');

  // Day 7: Libre
  addShift(7, 'hosp-catarino', 'L', '00:00', '00:00', 'Libre', 'Descanso');

  // Day 9: Doble turno (Mañana Bendaña + Tarde Bendaña)
  addShift(9, 'hosp-bendana', 'M', '07:00', '15:00', 'Mañana', 'Maternidad');
  addShift(9, 'hosp-bendana', 'T', '15:00', '23:00', 'Tarde Extra', 'Maternidad', 'Cubre a colega');

  // Day 11: Noche en Catarino
  addShift(11, 'hosp-catarino', 'N', '23:00', '07:00', 'Noche', 'UCI Pediátrica');

  // Day 14: Mañana Bendaña
  addShift(14, 'hosp-bendana', 'M', '07:00', '15:00', 'Mañana', 'UCI Adultos');

  // Day 16: Tarde Catarino
  addShift(16, 'hosp-catarino', 'T', '15:00', '23:00', 'Tarde', 'Urgencias');

  // Day 18: Triple turno (24H combinadas)
  addShift(18, 'hosp-bendana', 'M', '07:00', '15:00', 'Mañana', 'Pediatría');
  addShift(18, 'hosp-catarino', 'T', '15:00', '23:00', 'Tarde', 'Traumatología');
  addShift(18, 'hosp-catarino', 'N', '23:00', '07:00', 'Noche', 'Traumatología');

  // Day 21: Guardia 24H Catarino
  addShift(21, 'hosp-catarino', '24H', '07:00', '07:00', 'Guardia Completa', 'Emergencias');

  // Day 24: Mañana en Bendaña y Noche en CEMESA
  addShift(24, 'hosp-bendana', 'M', '07:00', '15:00', 'Mañana', 'Piso 4');
  addShift(24, 'hosp-cemesa', 'N', '23:00', '07:00', 'Noche Extra', 'Quirófano');

  return shifts;
}

export function getStoredHospitals(): Hospital[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HOSPITALS);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(DEFAULT_HOSPITALS));
      return DEFAULT_HOSPITALS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_HOSPITALS;
    }
    return parsed;
  } catch {
    return DEFAULT_HOSPITALS;
  }
}

/**
 * Resilient hospital resolver for any shift.
 * Guarantees a matching hospital object with valid name and shortName.
 */
export function getHospitalForShift(shift: MedicalShift, hospitals: Hospital[]): Hospital {
  // 1. Direct ID match in user's hospitals
  let found = hospitals.find((h) => h.id === shift.hospitalId);
  if (found) return found;

  // 2. Name or substring match against user's actual hospitals
  if (shift.hospitalId && hospitals.length > 0) {
    const rawId = shift.hospitalId.toLowerCase();
    found = hospitals.find((h) => {
      const hText = `${h.name} ${h.shortName}`.toLowerCase();
      if ((rawId.includes('bendana') || rawId.includes('bandana')) && (hText.includes('benda') || hText.includes('banda'))) return true;
      if (rawId.includes('ihss') && hText.includes('ihss')) return true;
      if (rawId.includes('util') && hText.includes('util')) return true;
      if (rawId.includes('invio') && hText.includes('invio')) return true;
      return false;
    });
    if (found) return found;
  }

  // 3. Fallback to user's first workplace if available
  if (hospitals.length > 0) {
    return hospitals[0];
  }

  // 4. Direct ID match in default presets only if user has 0 workplaces
  found = DEFAULT_HOSPITALS.find((h) => h.id === shift.hospitalId);
  if (found) return found;

  // 5. Ultimate fallback
  return DEFAULT_HOSPITALS[0];
}

export function saveStoredHospitals(hospitals: Hospital[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(hospitals));
  } catch (err) {
    console.error('Error saving hospitals:', err);
  }
}

export function getStoredShifts(): MedicalShift[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredShifts(shifts: MedicalShift[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
  } catch (err) {
    console.error('Error saving shifts:', err);
  }
}

export function getStoredTemplates(): ShiftTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveStoredTemplates(templates: ShiftTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  } catch (err) {
    console.error('Error saving templates:', err);
  }
}

export function getStoredUser(): UserSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEFAULT_USER));
      return DEFAULT_USER;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USER;
  }
}

export function saveStoredUser(user: UserSession): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (err) {
    console.error('Error saving user:', err);
  }
}

export const DEFAULT_TURSO_CONFIG: TursoConfig = {
  databaseUrl: 'libsql://calendariomedico-rogerappfinanzas.aws-us-east-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTEwMDcwNzAsImlkIjoiMDFhMTAwNTYtN2QwMS03NmJlLWFhZGQtNzQ5ZmJlYzU4YjQ1Iiwia2lkIjoia0U4N0VVY25kcFdCZmFtWm1ySVo4UFpzWndIUTRoOFl4SHpIaUdOT0pGayIsInJpZCI6IjdhNDU3NTJkLTI2MmEtNDI2ZC1iNTMwLWVlOGQyYTU0YTYxNSJ9.9ea6JbiNF0i9watvJdcIAVQhAeRI0HhPC-wKT-AdUmsWjTaKa7Uu2Rg5XO06f1b76sULR-vcFboNmxlZO2XLBw',
  useCloudflareR2: false,
  r2BucketName: 'calendariomedico-fotos',
  connected: true,
};

export function getStoredTursoConfig(): TursoConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TURSO);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TURSO, JSON.stringify(DEFAULT_TURSO_CONFIG));
      return DEFAULT_TURSO_CONFIG;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_TURSO_CONFIG;
  }
}

export function saveStoredTursoConfig(config: TursoConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TURSO, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving Turso config:', err);
  }
}
