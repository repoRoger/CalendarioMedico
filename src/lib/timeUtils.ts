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

  const todayIso = formatDateToIso(new Date());

  // In standard calendar starting on Monday (or Sunday):
  // Let's start on Monday (European / Latin American standard for nursing rosters: Lunes a Domingo)
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
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
  const dayOfWeek = (date.getDay() + 6) % 7; // 0 = Lunes
  date.setDate(date.getDate() - dayOfWeek); // Go to Monday

  const todayIso = formatDateToIso(new Date());
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
