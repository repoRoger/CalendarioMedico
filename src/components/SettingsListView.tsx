import React, { useState, useEffect } from 'react';
import {
  Clock, Plus, Edit2, Bell, BellRing, Volume2, Smartphone,
  Check, Info, Sparkles
} from 'lucide-react';
import { ShiftTemplate } from '../types';
import {
  getNotificationSettings,
  saveNotificationSettings,
  sendTestNotification,
  NotificationSettings
} from '../lib/notifications';

interface SettingsListViewProps {
  templates: ShiftTemplate[];
  onOpenCreate: () => void;
  onOpenEdit: (template: ShiftTemplate) => void;
  onNotify?: (type: 'success' | 'warning' | 'info', title: string, detail?: string) => void;
  onSettingsChanged?: () => void;
}

export const SettingsListView: React.FC<SettingsListViewProps> = ({
  templates,
  onOpenCreate,
  onOpenEdit,
  onNotify,
  onSettingsChanged,
}) => {
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(getNotificationSettings);
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [showAndroidTip, setShowAndroidTip] = useState(false);

  const handleUpdateSetting = (partial: Partial<NotificationSettings>) => {
    const updated = { ...notifSettings, ...partial };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
    if (onSettingsChanged) {
      onSettingsChanged();
    }
  };

  const handleSendTest = async () => {
    setIsTestingNotif(true);
    try {
      const res = await sendTestNotification();
      if (res.success) {
        onNotify?.('success', '🔔 Notificación de prueba enviada', res.message);
      } else {
        onNotify?.('warning', 'Aviso de notificación', res.message);
      }
    } catch (err: any) {
      onNotify?.('warning', 'Error de notificación', err?.message || 'No se pudo enviar la alerta');
    } finally {
      setIsTestingNotif(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-6">
      {/* CARD 1: NOTIFICACIONES Y RECORDATORIOS */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        {/* Header de la tarjeta */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Recordatorios de Turnos</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800/40">
                  Android
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Avisos automáticos en tu celular para tus próximas guardias y turnos.
              </p>
            </div>
          </div>

          {/* Switch principal ON / OFF */}
          <button
            onClick={() => handleUpdateSetting({ enabled: !notifSettings.enabled })}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors flex items-center shrink-0 ${
              notifSettings.enabled ? 'bg-teal-500 justify-end' : 'bg-slate-800 justify-start'
            }`}
            title={notifSettings.enabled ? 'Desactivar recordatorios' : 'Activar recordatorios'}
          >
            <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform" />
          </button>
        </div>

        {/* Configuración de horas si están activadas */}
        {notifSettings.enabled && (
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            {/* Opción 1: Noche anterior */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="nightBeforeCheck"
                  checked={notifSettings.remindNightBefore}
                  onChange={(e) => handleUpdateSetting({ remindNightBefore: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="nightBeforeCheck" className="text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer">
                  Avisar la noche previa al turno
                </label>
              </div>

              {notifSettings.remindNightBefore && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-[11px] text-slate-400">Hora del aviso:</span>
                  <input
                    type="time"
                    value={notifSettings.remindNightTime}
                    onChange={(e) => handleUpdateSetting({ remindNightTime: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>

            {/* Opción 2: Mismo día del turno */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="sameDayCheck"
                  checked={notifSettings.remindSameDay}
                  onChange={(e) => handleUpdateSetting({ remindSameDay: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="sameDayCheck" className="text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer">
                  Avisar la mañana del turno
                </label>
              </div>

              {notifSettings.remindSameDay && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-[11px] text-slate-400">Hora del aviso:</span>
                  <input
                    type="time"
                    value={notifSettings.remindSameDayTime}
                    onChange={(e) => handleUpdateSetting({ remindSameDayTime: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>

            {/* Acciones: Botón de probar y tip de sonido/vibración */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <button
                onClick={handleSendTest}
                disabled={isTestingNotif}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/40 text-teal-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <BellRing className={`w-4 h-4 text-teal-400 ${isTestingNotif ? 'animate-bounce' : ''}`} />
                <span>{isTestingNotif ? 'Enviando prueba...' : '🔔 Probar notificación en celular'}</span>
              </button>

              <button
                onClick={() => setShowAndroidTip(!showAndroidTip)}
                className="text-[11px] text-slate-400 hover:text-teal-300 flex items-center gap-1 self-center underline underline-offset-4"
              >
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                <span>¿Cómo cambiar el sonido o vibración?</span>
              </button>
            </div>

            {/* Tip expandible sobre sonido y vibración en Android */}
            {showAndroidTip && (
              <div className="p-3 rounded-2xl bg-teal-950/30 border border-teal-900/50 text-[11px] text-slate-300 space-y-1.5 animate-fadeIn">
                <div className="font-bold text-teal-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Personalizar tono y vibración en Android / Samsung:</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Las notificaciones usan el canal exclusivo <strong>"Recordatorio de Turnos Médicos"</strong> con vibración y prioridad alta. Para asignarle un tono o canción específica de tu teléfono:
                </p>
                <ol className="list-decimal list-inside text-slate-300 space-y-0.5 pl-1 font-mono text-[10.5px]">
                  <li>Ve a <strong>Ajustes del teléfono</strong> &gt; <strong>Aplicaciones</strong>.</li>
                  <li>Selecciona <strong>Calendario Médico</strong> &gt; <strong>Notificaciones</strong>.</li>
                  <li>Toca en <strong>Categorías de notificación</strong> &gt; <strong>Recordatorio de Turnos Médicos</strong>.</li>
                  <li>Allí podrás elegir <strong>Sonido</strong> (cualquier archivo o tono) y tu estilo de <strong>Vibración</strong> preferido.</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CARD 2: HORARIOS Y TIPOS DE TURNOS */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Horarios y Tipos de Turnos
            </h1>
            <span className="px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 font-mono text-xs font-bold border border-teal-500/30">
              {templates.length}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Listado de plantillas de turnos para editar rápidamente sus horas de entrada, salida y duración.
          </p>
        </div>

        {/* Action Button: Opens the Popup */}
        <button
          onClick={onOpenCreate}
          className="self-start sm:self-center px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-900/40 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Tipo de Turno</span>
        </button>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 gap-3">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="p-4 sm:p-5 rounded-2xl bg-slate-900/85 border border-slate-800/90 shadow-lg hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            {/* Left: Code badge, Name & Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md shrink-0 border border-white/20"
                style={{
                  backgroundColor: tpl.color || '#0d9488',
                }}
              >
                {tpl.code}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base text-slate-100 truncate">
                    {tpl.name}
                  </h3>
                  <span className="text-xs font-mono font-bold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-800/40">
                    {tpl.defaultHours} horas
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap font-mono">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>{tpl.defaultStartTime} - {tpl.defaultEndTime}</span>
                  </span>
                  {tpl.description && (
                    <span className="font-sans text-slate-500 hidden sm:inline truncate max-w-xs">
                      · {tpl.description}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => onOpenEdit(tpl)}
                className="min-h-[40px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95 shadow-sm"
                title={`Editar horario de ${tpl.name}`}
              >
                <Edit2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Editar turno</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
