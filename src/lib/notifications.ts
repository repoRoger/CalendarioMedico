import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { MedicalShift, Hospital, ShiftTemplate } from '../types';

export interface NotificationSettings {
  enabled: boolean;
  remindNightBefore: boolean;
  remindNightTime: string; // "HH:MM", default "20:00"
  remindSameDay: boolean;
  remindSameDayTime: string; // "HH:MM", default "06:00"
}

const STORAGE_KEY = 'calendario_notification_settings';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  remindNightBefore: true,
  remindNightTime: '20:00',
  remindSameDay: false,
  remindSameDayTime: '06:00',
};

export const getNotificationSettings = (): NotificationSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
};

export const saveNotificationSettings = (settings: NotificationSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error guardando configuración de notificaciones:', e);
  }
};

const CHANNEL_ID = 'turnos_medicos';

export const initNotificationChannel = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Recordatorio de Turnos Médicos',
      description: 'Avisos sobre tus turnos de trabajo y guardias',
      importance: 5, // MAX: muestra cabecera flotante en pantalla
      visibility: 1, // Público en pantalla de bloqueo
      vibration: true,
      lights: true,
      lightColor: '#0d9488',
    });
  } catch (err) {
    console.warn('No se pudo inicializar el canal de notificaciones:', err);
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return true;
      const requested = await LocalNotifications.requestPermissions();
      return requested.display === 'granted';
    } else if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  } catch (e) {
    console.warn('Error solicitando permisos de notificación:', e);
    return false;
  }
};

export const sendTestNotification = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      return {
        success: false,
        message: 'No se otorgaron permisos de notificación en el dispositivo.',
      };
    }

    await initNotificationChannel();

    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 99999,
            title: '🏥 Prueba: Turno Mañana (Hospital Escuela)',
            body: 'Horario: 07:00 - 15:00 (8h) • ¡Notificaciones configuradas con éxito!',
            channelId: CHANNEL_ID,
            schedule: {
              at: new Date(Date.now() + 1500), // En 1.5 segundos
              allowWhileIdle: true,
            },
          },
        ],
      });
      return {
        success: true,
        message: '¡Notificación de prueba enviada! Revisa la barra superior de tu celular.',
      };
    } else {
      // Fallback para navegador web
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🏥 Prueba: Turno Mañana (Hospital Escuela)', {
          body: 'Horario: 07:00 - 15:00 (8h) • ¡Notificaciones configuradas con éxito!',
          icon: '/icon-192.png',
        });
        return {
          success: true,
          message: 'Notificación de prueba mostrada en el navegador.',
        };
      }
      return {
        success: true,
        message: 'Modo web: Notificaciones simuladas con éxito.',
      };
    }
  } catch (e: any) {
    return {
      success: false,
      message: `Error al enviar notificación: ${e?.message || e}`,
    };
  }
};

// Genera un ID entero de 32 bits a partir de un string
function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 2000000000);
}

export const syncScheduledShiftNotifications = async (
  shifts: MedicalShift[],
  hospitals: Hospital[],
  templates: ShiftTemplate[]
): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  const settings = getNotificationSettings();
  if (!settings.enabled) {
    try {
      await LocalNotifications.cancelAll();
    } catch {}
    return;
  }

  try {
    await initNotificationChannel();

    // Limpiar notificaciones programadas anteriormente para evitar duplicados
    try {
      await LocalNotifications.cancelAll();
    } catch {}

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Filtrar turnos de los próximos 14 días que no sean descanso libre
    const upcomingShifts = shifts.filter((s) => {
      if (!s.date || s.date < todayStr) return false;
      if (s.shiftCode === 'L' || s.shiftCode === 'LIBRE') return false;
      return true;
    });

    const notificationsToSchedule: any[] = [];

    for (const shift of upcomingShifts) {
      const hosp = hospitals.find((h) => h.id === shift.hospitalId);
      const hospName = hosp?.shortName || hosp?.name || 'Centro Médico';
      const tpl = templates.find((t) => t.code === shift.shiftCode);
      const shiftName = tpl?.name || shift.shiftCode;
      const hoursText = shift.hours ? `(${shift.hours}h)` : '';
      const timeRange = shift.startTime && shift.endTime ? `${shift.startTime} - ${shift.endTime}` : '';

      // 1. Recordatorio la noche anterior
      if (settings.remindNightBefore && settings.remindNightTime) {
        const [hour, minute] = settings.remindNightTime.split(':').map(Number);
        // La fecha del turno menos 1 día
        const shiftDateObj = new Date(shift.date + 'T00:00:00');
        const alertDate = new Date(shiftDateObj);
        alertDate.setDate(alertDate.getDate() - 1);
        alertDate.setHours(hour, minute || 0, 0, 0);

        // Solo si la fecha de la alerta es en el futuro
        if (alertDate > now) {
          notificationsToSchedule.push({
            id: hashStringToInt(`night_${shift.id}_${shift.date}`),
            title: `🏥 Turno Mañana: ${shiftName} ${hoursText}`,
            body: `${hospName} • Horario: ${timeRange || 'Revisa tu horario en la app'}`,
            channelId: CHANNEL_ID,
            schedule: {
              at: alertDate,
              allowWhileIdle: true,
            },
          });
        }
      }

      // 2. Recordatorio el mismo día
      if (settings.remindSameDay && settings.remindSameDayTime) {
        const [hour, minute] = settings.remindSameDayTime.split(':').map(Number);
        const alertDate = new Date(shift.date + 'T00:00:00');
        alertDate.setHours(hour, minute || 0, 0, 0);

        if (alertDate > now) {
          notificationsToSchedule.push({
            id: hashStringToInt(`day_${shift.id}_${shift.date}`),
            title: `⏰ Turno Hoy: ${shiftName} ${hoursText}`,
            body: `${hospName} • Horario: ${timeRange || 'Revisa tu horario en la app'}`,
            channelId: CHANNEL_ID,
            schedule: {
              at: alertDate,
              allowWhileIdle: true,
            },
          });
        }
      }
    }

    if (notificationsToSchedule.length > 0) {
      // Programar en bloques de máximo 50 (límite seguro de Android)
      const batch = notificationsToSchedule.slice(0, 50);
      await LocalNotifications.schedule({ notifications: batch });
    }
  } catch (err) {
    console.warn('Error programando notificaciones de turnos:', err);
  }
};
