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
export function getShiftDisplayCode(code: string): string {
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
    case 'LIBRE':
    case 'L':
      return 'LIBRE';
    case 'D':
      return 'TA-TB';
    case 'C':
      return 'C';
    default:
      return code || 'TA';
  }
}

export function getShiftDisplayName(codeOrTitle: string): string {
  const normalized = (codeOrTitle || '').trim();
  const upper = normalized.toUpperCase();
  if (upper === 'M' || upper === 'TA' || normalized.toLowerCase() === 'mañana') return 'TA';
  if (upper === 'T' || upper === 'TB' || normalized.toLowerCase() === 'tarde') return 'TB';
  if (upper === 'N' || upper === 'TC' || normalized.toLowerCase() === 'noche') return 'TC';
  if (upper === 'TA-TB' || upper === 'TA - TB' || upper === 'D') return 'Mixto TA-TB';
  if (upper === 'TB-TC' || upper === 'TB - TC') return 'Mixto TB-TC';
  if (upper === 'TC-TA' || upper === 'TC - TA') return 'Mixto TC-TA';
  if (upper === '24H' || normalized.toLowerCase().includes('guardia 24')) return 'Guardia 24H';
  if (upper === 'LIBRE' || upper === 'L' || normalized.toLowerCase() === 'libre') return 'Libre';
  if (upper === 'C' || normalized.toLowerCase() === 'cubrir') return 'Cubrir';
  return normalized;
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
