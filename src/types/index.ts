export interface Hospital {
  id: string;
  name: string;
  shortName: string;
  city: string;
  color: string; // Base accent color
  gradientStart: string; // e.g. '#0d9488'
  gradientEnd: string;   // e.g. '#059669'
  badgeIcon: 'hospital' | 'cross' | 'stethoscope' | 'heart' | 'activity' | 'shield' | 'briefcase' | 'factory' | 'building' | 'star';
  logoUrl?: string; // Optional custom image or data URL
  businessType?: string; // Custom type e.g. 'Hospital', 'Fábrica', 'Call Center', 'Seguridad'
  address?: string;
  isCustom?: boolean;
}

export type ShiftCode = 'TA' | 'TB' | 'TC' | 'M' | 'T' | 'N' | '24H' | 'D' | 'C' | 'E' | 'L' | 'CUSTOM';

export interface ShiftTemplate {
  id: string;
  code: ShiftCode;
  name: string;
  defaultStartTime: string;
  defaultEndTime: string;
  defaultHours: number;
  description: string;
  colorBadge: string;
  isNightShift?: boolean;
}

export interface MedicalShift {
  id: string;
  date: string; // Format 'YYYY-MM-DD'
  hospitalId: string;
  shiftCode: ShiftCode;
  title: string;
  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  hours: number;     // e.g. 8 or 24
  department?: string; // e.g. 'UCI', 'Emergencias', 'Maternidad'
  color?: string;    // Custom override or hospital gradient
  notes?: string;
  isNightShift?: boolean;
  isSubstitute?: boolean; // Turno cubierto o cambio con colega
}

export interface UserSession {
  id: string;
  titlePrefix: string; // e.g. 'Licda.', 'Lic.', 'Dr.', 'Dra.', 'Téc.', 'Enf.'
  personalName: string; // e.g. 'Karen Rodríguez'
  name: string; // Full displayed name e.g. 'Licda. Karen Rodríguez'
  email: string;
  role: string;
  specialty?: string;
  phone?: string;
  avatarUrl?: string;
  photoBlob?: string; // Stored in Turso as base64 text/blob
  isGoogleAuth: boolean;
  isLoggedIn: boolean;
  defaultHospitalId?: string;
}

export interface DayShiftSummary {
  date: string;
  shifts: MedicalShift[];
  totalHours: number;
  has24HourShift: boolean;
  hospitalIds: string[];
}

export interface TursoConfig {
  databaseUrl: string;
  authToken: string;
  useCloudflareR2: boolean;
  r2BucketName?: string;
  connected: boolean;
}
