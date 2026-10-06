import { ShiftTemplate } from '../types';

export const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const SPANISH_WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const SPANISH_WEEKDAYS_FULL = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

/**
 * Calculates duration in hours between startTime ('HH:mm') and endTime ('HH:mm').
 * Correctly accounts for overnight shifts that cross midnight (e.g. 23:00 to 07:00 = 8h).
 */
export function calculateShiftHours(start: string, end: string): number {
  if (!start || !end) return 0;

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return 0;
  }

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  let diffMinutes = endMinutes - startMinutes;

  if (diffMinutes < 0) {
    // Crosses midnight (e.g. 23:00 to 07:00 -> -960 + 1440 = 480 min = 8h)
    diffMinutes += 24 * 60;
  } else if (diffMinutes === 0 && start === end) {
    // 24 hour shift (e.g. 07:00 to 07:00)
    return 24;
  }

  const hours = diffMinutes / 60;
  return Math.round(hours * 10) / 10;
}

/**
 * Returns current Date object in Honduras time (America/Tegucigalpa, UTC-6).
 * Ensures "Hoy" and "Mañana" and shift calculations strictly match local Honduras time,
 * preventing UTC from jumping ahead by 6 hours.
 */
export function getHondurasDate(): Date {
  const now = new Date();
  try {
    const hnString = now.toLocaleString('en-US', { timeZone: 'America/Tegucigalpa' });
    return new Date(hnString);
  } catch {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const hnMs = utcMs - 6 * 3600000;
    return new Date(hnMs);
  }
}

export function getHondurasTodayIso(): string {
  return formatDateToIso(getHondurasDate());
}

export function getHondurasTomorrowIso(): string {
  const d = getHondurasDate();
  d.setDate(d.getDate() + 1);
  return formatDateToIso(d);
}

export function formatDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatFriendlyDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  const dayName = SPANISH_WEEKDAYS_FULL[date.getDay()];
  const day = date.getDate();
  const monthName = SPANISH_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${day} de ${monthName} ${year}`;
}

export interface CalendarDayItem {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export function getMonthMatrix(year: number, month: number): CalendarDayItem[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const todayIso = getHondurasTodayIso();

  // In standard Honduras & Latin America calendar starting on Sunday (Dom, Lun, Mar, Mié, Jue, Vie, Sáb)
  // firstDay.getDay(): 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const firstDayOfWeek = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: CalendarDayItem[] = [];

  // Padding days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prevDayNum = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 1, prevDayNum);
    const iso = formatDateToIso(prevDate);
    const dayOfWeek = prevDate.getDay();
    days.push({
      date: iso,
      dayNumber: prevDayNum,
      isCurrentMonth: false,
      isToday: iso === todayIso,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Days of current month
  for (let i = 1; i <= totalDays; i++) {
    const currDate = new Date(year, month, i);
    const iso = formatDateToIso(currDate);
    const dayOfWeek = currDate.getDay();
    days.push({
      date: iso,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: iso === todayIso,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Padding days for next month (fill up to complete 35 or 42 grid cells)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, month + 1, i);
    const iso = formatDateToIso(nextDate);
    const dayOfWeek = nextDate.getDay();
    days.push({
      date: iso,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: iso === todayIso,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  return days;
}

export function getWeekDays(currentDate: Date): CalendarDayItem[] {
  const date = new Date(currentDate);
  const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  date.setDate(date.getDate() - dayOfWeek); // Go back to Sunday (Dom)

  const todayIso = getHondurasTodayIso();
  const days: CalendarDayItem[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(date);
    d.setDate(date.getDate() + i);
    const iso = formatDateToIso(d);
    const dow = d.getDay();
    days.push({
      date: iso,
      dayNumber: d.getDate(),
      isCurrentMonth: true,
      isToday: iso === todayIso,
      isWeekend: dow === 0 || dow === 6,
    });
  }

  return days;
}

/**
 * Maps shift codes to modern standard:
 * Mañana -> TA
 * Tarde -> TB
 * Noche -> TC
 */
export function getShiftDisplayCode(code: string, templates?: ShiftTemplate[]): string {
  if (templates && templates.length > 0) {
    const found = templates.find((t) => t.code === code);
    if (found?.name) return found.name;
  }
  switch (code) {
    case 'M':
    case 'TA':
      return 'TA';
    case 'T':
    case 'TB':
      return 'TB';
    case 'N':
    case 'TC':
      return 'TC';
    case 'TA-TB':
      return 'TA-TB';
    case 'TB-TC':
      return 'TB-TC';
    case 'TC-TA':
      return 'TC-TA';
    case '24H':
      return '24H';
    case 'CHOQUE':
      return 'Choque';
    case 'LIBRE_A':
      return 'Libre A';
    case 'LIBRE_B':
      return 'Libre B';
    case 'LIBRE_C':
      return 'Libre C';
    case 'LIBRE':
      return 'Libre';
    case 'L':
      return 'Libre';
    case 'D':
      return 'TA-TB';
    case 'C':
      return 'C';
    default:
      return code || 'TA';
  }
}

export function isShiftCollision(codeOrTitle: string): boolean {
  if (!codeOrTitle) return false;
  const upper = codeOrTitle.trim().toUpperCase();
  return upper === 'CHOQUE' || upper === 'COLIS' || upper === 'COLISION' || upper === 'CONFLICTO';
}

export function isShiftLibre(codeOrTitle: string): boolean {
  if (!codeOrTitle) return false;
  const upper = codeOrTitle.trim().toUpperCase();
  return (
    upper === 'L' ||
    upper === 'LIBRE' ||
    upper === 'LIBRE_A' ||
    upper === 'LIBRE_B' ||
    upper === 'LIBRE_C' ||
    upper === 'LIBRE-A' ||
    upper === 'LIBRE-B' ||
    upper === 'LIBRE-C' ||
    upper.startsWith('LIBRE')
  );
}

export function getShiftDisplayName(codeOrTitle: string): string {
  const normalized = (codeOrTitle || '').trim();
  const upper = normalized.toUpperCase();
  if (upper === 'CHOQUE' || upper === 'COLIS' || upper === 'COLISION') return 'Choque de Turno';
  if (upper === 'M' || upper === 'TA' || normalized.toLowerCase() === 'mañana') return 'TA';
  if (upper === 'T' || upper === 'TB' || normalized.toLowerCase() === 'tarde') return 'TB';
  if (upper === 'N' || upper === 'TC' || normalized.toLowerCase() === 'noche') return 'TC';
  if (upper === 'TA-TB' || upper === 'TA - TB' || upper === 'D') return 'TA-TB';
  if (upper === 'TB-TC' || upper === 'TB - TC') return 'TB-TC';
  if (upper === 'TC-TA' || upper === 'TC - TA') return 'TC-TA';
  if (upper === '24H' || normalized.toLowerCase().includes('guardia 24')) return '24H';
  if (upper === 'LIBRE_A' || upper === 'LIBRE-A' || normalized.toLowerCase() === 'libre a') return 'Libre A';
  if (upper === 'LIBRE_B' || upper === 'LIBRE-B' || normalized.toLowerCase() === 'libre b') return 'Libre B';
  if (upper === 'LIBRE_C' || upper === 'LIBRE-C' || normalized.toLowerCase() === 'libre c') return 'Libre C';
  if (upper === 'LIBRE') return 'Libre turno';
  if (upper === 'L' || normalized.toLowerCase() === 'libre') return 'Libre total';
  if (upper === 'C' || normalized.toLowerCase() === 'cubrir') return 'Cubrir';
  return normalized;
}

export interface ShiftTimeSpan {
  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  hours?: number;
  shiftCode?: string;
}

/**
 * Determines whether two shifts have an overlapping working time interval on the same day.
 * Returns false if either shift is a rest/free shift (Libre),
 * or if they are contiguous without overlapping hours (e.g. 07:00-15:00 and 15:00-21:00).
 */
export function doShiftsOverlap(shiftA: ShiftTimeSpan, shiftB: ShiftTimeSpan): boolean {
  if (isShiftLibre(shiftA.shiftCode || '') || isShiftLibre(shiftB.shiftCode || '')) {
    return false;
  }

  // If either is 24H or has >= 24h, it occupies the entire day cycle
  if (
    (shiftA.hours && shiftA.hours >= 24) ||
    shiftA.shiftCode === '24H' ||
    (shiftB.hours && shiftB.hours >= 24) ||
    shiftB.shiftCode === '24H'
  ) {
    return true;
  }

  const [s1H, s1M] = (shiftA.startTime || '07:00').split(':').map(Number);
  const [e1H, e1M] = (shiftA.endTime || '15:00').split(':').map(Number);
  const [s2H, s2M] = (shiftB.startTime || '07:00').split(':').map(Number);
  const [e2H, e2M] = (shiftB.endTime || '15:00').split(':').map(Number);

  const startMin1 = (s1H || 0) * 60 + (s1M || 0);
  let durMin1 = ((e1H || 0) * 60 + (e1M || 0)) - startMin1;
  if (durMin1 < 0) durMin1 += 24 * 60;
  if (durMin1 === 0 && shiftA.startTime === shiftA.endTime) durMin1 = 24 * 60;
  const endMin1 = startMin1 + durMin1;

  const startMin2 = (s2H || 0) * 60 + (s2M || 0);
  let durMin2 = ((e2H || 0) * 60 + (e2M || 0)) - startMin2;
  if (durMin2 < 0) durMin2 += 24 * 60;
  if (durMin2 === 0 && shiftB.startTime === shiftB.endTime) durMin2 = 24 * 60;
  const endMin2 = startMin2 + durMin2;

  // Overlap condition: max(start1, start2) < min(end1, end2)
  return Math.max(startMin1, startMin2) < Math.min(endMin1, endMin2);
}

/**
 * Calculates optimal text color (#ffffff or #020617) based on background hex luminance.
 */
export function getContrastTextColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return '#ffffff';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#020617' : '#ffffff';
}

/**
 * Returns the 4-letter workplace abbreviation + shift code for mobile calendar cells
 * Example: 'Bendaña' + 'TA' => 'Bend TA'
 * 'Catarino' + 'TB' => 'Cata TB'
 */
export function getShiftMobileLabel(workplaceName: string, shiftCode: string): string {
  const cleanName = (workplaceName || 'Hosp').trim();
  const short4 = cleanName.slice(0, 4);
  const code = getShiftDisplayCode(shiftCode);
  return `${code} - ${short4}`;
}

/**
 * Returns dynamic Tailwind font classes for shift names based on character length.
 * Short names (<= 4 chars like 'TA', '24H', 'Libre') get prominent, punchy text (13-16px).
 * Longer names (e.g. 'Libre C', 'Guardia') get smoothly adjusted font size to fit without truncation.
 */
export function getDynamicShiftTextClass(text: string): string {
  const len = (text || '').trim().length;
  if (len <= 2) {
    // e.g. TA, TB, TC, 24, L, C, M, T, N
    return 'text-[15px] sm:text-[16px] font-black tracking-tight leading-none';
  }
  if (len <= 4) {
    // e.g. 24H, TC-A, NOCH
    return 'text-[13.5px] sm:text-[14.5px] font-black tracking-tight leading-none';
  }
  if (len <= 6) {
    // e.g. LibreC, Choque, Mañana
    return 'text-[12px] sm:text-[13px] font-extrabold tracking-tight leading-none';
  }
  if (len <= 9) {
    // e.g. Libre C, Guardia, Turno B
    return 'text-[10.5px] sm:text-[11.5px] font-bold tracking-tight leading-tight';
  }
  // > 9 chars (e.g. Libre Turno, Guardia 24H, Emergencias)
  return 'text-[9.5px] sm:text-[10px] font-bold tracking-tighter leading-tight';
}

/**
 * Calculates a precise automatic font size in pixels for text to fit within a target container width.
 * Analyzes character glyph weights (narrow letters like 'i', 'l', '1' vs wide like 'M', 'W', 'Ñ').
 * Ensures short text (e.g. 'TA', 'IHSS', '24H') expands up to maxPx,
 * and longer text (e.g. 'Bendaña', 'Catarino') smoothly scales down so it never gets clipped.
 */
export function getAutoFitFontSize(text: string, maxPx = 15, minPx = 7.5, targetWidth = 38): number {
  if (!text) return maxPx;
  const clean = text.trim();
  if (clean.length === 0) return maxPx;

  let totalUnits = 0;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if ('ijlI1!:;.,|/\''.includes(char)) {
      totalUnits += 0.28;
    } else if ('mwMWÑñ%@&'.includes(char)) {
      totalUnits += 0.74;
    } else if ('tfjkr- ()'.includes(char)) {
      totalUnits += 0.38;
    } else {
      totalUnits += 0.52;
    }
  }

  // Calculate proportional font size in pixels
  const calculated = Math.floor((targetWidth / Math.max(totalUnits, 1)) * 10) / 10;
  return Math.min(maxPx, Math.max(minPx, calculated));
}

