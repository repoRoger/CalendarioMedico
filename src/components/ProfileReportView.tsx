import React, { useState } from 'react';
import {
  User, Edit2, Mail, Phone, Award, ShieldCheck, Database,
  Building2, Calendar, Clock, LogOut, CheckCircle2, MapPin, RefreshCw, Plus,
  Download, Sparkles, AlertCircle
} from 'lucide-react';
import { UserSession, Hospital, MedicalShift, TursoConfig, AppUpdateInfo } from '../types';
import { CURRENT_APP_VERSION } from '../lib/appVersion';
import { getTursoClient, checkAppUpdateFromTurso } from '../lib/tursoClient';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

interface ProfileReportViewProps {
  user: UserSession;
  hospitals: Hospital[];
  shifts: MedicalShift[];
  tursoConfig?: TursoConfig;
  onOpenEditModal: () => void;
  onLoadSampleShifts?: () => void;
  onLogout: () => void;
}

export const ProfileReportView: React.FC<ProfileReportViewProps> = ({
  user,
  hospitals,
  shifts,
  tursoConfig,
  onOpenEditModal,
  onLoadSampleShifts,
  onLogout,
}) => {
  const activeShifts = shifts.filter((s) => s.shiftCode !== 'L');
  const totalHours = activeShifts.reduce((acc, s) => acc + (s.hours || 0), 0);
  const total24H = activeShifts.filter((s) => s.shiftCode === '24H' || (s.hours || 0) >= 24).length;

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [updateChecked, setUpdateChecked] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // OTA Live Update state
  const [isApplyingOta, setIsApplyingOta] = useState(false);
  const [otaStatus, setOtaStatus] = useState<string | null>(null);

  const handleCheckUpdate = async () => {
    if (!tursoConfig?.databaseUrl || !tursoConfig?.authToken) {
      setUpdateError('Configuración de base de datos no disponible.');
      return;
    }
    setIsCheckingUpdate(true);
    setUpdateError(null);
    try {
      const client = getTursoClient(tursoConfig.databaseUrl, tursoConfig.authToken);
      const res = await checkAppUpdateFromTurso(client, CURRENT_APP_VERSION);
      setUpdateInfo(res.latest);
      setUpdateAvailable(res.hasUpdate);
      setUpdateChecked(true);
    } catch (err: any) {
      setUpdateError(err?.message || 'Error al conectar para verificar actualizaciones.');
      setUpdateChecked(true);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleApplyOta = async () => {
    if (!updateInfo) return;
    setIsApplyingOta(true);
    setOtaStatus('Preparando verificación de actualización...');
    try {
      if (Capacitor.isNativePlatform()) {
        const zipUrl = updateInfo.downloadUrl.replace(/CalendarioMedico\.apk$/i, 'dist.zip');
        let checksum = updateInfo.checksum?.trim() || '';

        if (!checksum) {
          try {
            const shaRes = await fetch(`${zipUrl}.sha256`);
            if (shaRes.ok) {
              const text = await shaRes.text();
              checksum = text.trim().split(/\s+/)[0];
            }
          } catch (e) {
            console.warn('No se pudo obtener .sha256 remoto:', e);
          }
        }

        if (!checksum) {
          throw new Error('Checksum SHA-256 no disponible para esta versión.');
        }

        setOtaStatus('Descargando actualización en segundo plano (2-3s)...');
        const bundle = await CapacitorUpdater.download({
          url: zipUrl,
          version: updateInfo.version,
          checksum: checksum,
        });
        setOtaStatus('¡Instalación completada! Reiniciando app...');
        await CapacitorUpdater.set(bundle);
        // CapacitorUpdater.set automatically triggers an immediate WebView reload!
      } else {
        setOtaStatus('Actualizando aplicación web...');
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Error aplicando actualización OTA:', err);
      setOtaStatus(`Error en actualización rápida: ${err?.message || 'Fallo de descarga'}. Puedes usar la opción de Descargar APK.`);
      setIsApplyingOta(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Perfil Profesional
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Informe de datos del profesional, centros asignados y actividad de turnos.
          </p>
        </div>

        {/* Action Button: Opens the Popup */}
        <button
          onClick={onOpenEditModal}
          className="self-start sm:self-center px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-900/40 transition-all active:scale-95"
        >
          <Edit2 className="w-4 h-4" />
          <span>Editar Mis Datos</span>
        </button>
      </div>

      {/* Main Profile Info Card (Tipo Informe) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar Photo */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-slate-950 border-2 border-teal-500/50 shadow-2xl flex items-center justify-center text-teal-300 font-black text-3xl">
              {user.photoBlob ? (
                <img
                  src={user.photoBlob}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user.personalName ? user.personalName.charAt(0) : user.name.charAt(0)}</span>
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow" title="Cuenta activa" />
          </div>

          {/* Details */}
          <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                {user.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold inline-block self-center sm:self-auto">
                {user.titlePrefix || 'Lic.'}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-300">
              {user.specialty || 'Profesional de la Salud'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-slate-300">{user.email || 'Sin correo registrado'}</span>
              </span>

              {user.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-slate-300">{user.phone}</span>
                </span>
              )}

              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>Honduras (UTC-6)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Metric tiles (Informe de Actividad) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>Centros</span>
            </div>
            <p className="text-xl font-black text-slate-100 font-mono">
              {hospitals.length}
            </p>
            <p className="text-[10px] text-slate-400">lugares de trabajo</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Turnos</span>
            </div>
            <p className="text-xl font-black text-slate-100 font-mono">
              {activeShifts.length}
            </p>
            <p className="text-[10px] text-slate-400">registrados en total</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Horas</span>
            </div>
            <p className="text-xl font-black text-teal-400 font-mono">
              {totalHours}h
            </p>
            <p className="text-[10px] text-slate-400">acumuladas de labor</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Award className="w-4 h-4 text-rose-400" />
              <span>Guardias</span>
            </div>
            <p className="text-xl font-black text-rose-300 font-mono">
              {total24H}
            </p>
            <p className="text-[10px] text-slate-400">turnos de 24 horas</p>
          </div>
        </div>

        {/* Oculto temporalmente: Carga de turnos de muestra para adaptar a multiples áreas de trabajo en el futuro */}
        {false && (
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">
                  Base de Datos en la Nube (Turso LibSQL)
                </p>
                <p className="text-[11px] text-slate-400">
                  BD: <span className="font-mono text-teal-400">calendariomedico-rogerappfinanzas</span> ({user.email})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {onLoadSampleShifts && (
                <button
                  onClick={onLoadSampleShifts}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95 min-h-[38px]"
                  title="Cargar y combinar turnos de muestra de Octubre"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-400" />
                  <span>+ Turnos de Muestra</span>
                </button>
              )}

              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-800/40 min-h-[38px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Conectado</span>
              </div>
            </div>
          </div>
        )}

        {/* Actualizaciones de la Aplicación */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-200">
                    Actualizaciones de la App
                  </p>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 border border-slate-700 text-[10px] font-mono font-bold">
                    v{CURRENT_APP_VERSION}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Comprueba si existe una versión más reciente disponible para tu dispositivo Android.
                </p>
              </div>
            </div>

            <button
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all active:scale-95 disabled:opacity-50 min-h-[38px] self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? 'Comprobando...' : 'Buscar Actualización'}</span>
            </button>
          </div>

          {/* Update Available Box */}
          {updateAvailable && updateInfo && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-teal-950/60 to-emerald-950/40 border border-teal-600/40 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[11px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                      ¡Nueva versión disponible!
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      v{updateInfo.version}
                    </span>
                  </div>
                  {updateInfo.notes && (
                    <p className="text-xs text-slate-300 pt-1 leading-relaxed">
                      {updateInfo.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Status message during OTA */}
              {otaStatus && (
                <div className="p-2.5 rounded-lg bg-teal-950/60 border border-teal-500/40 text-xs text-teal-200 flex items-center gap-2">
                  <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isApplyingOta ? 'animate-spin' : ''}`} />
                  <span>{otaStatus}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-teal-800/30">
                <p className="text-[10px] text-slate-400 leading-tight">
                  Actualiza en 2 segundos sin salir de la app ni descargar APK manual.
                </p>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Botón Principal: Actualización en vivo OTA */}
                  <button
                    type="button"
                    onClick={handleApplyOta}
                    disabled={isApplyingOta}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-950/50 active:scale-95 transition-all cursor-pointer min-h-[42px] disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isApplyingOta ? 'animate-spin' : ''}`} />
                    <span>{isApplyingOta ? 'Instalando...' : '⚡ Actualizar al Instante'}</span>
                  </button>

                  {/* Botón Secundario: Descargar APK manual */}
                  <a
                    href={updateInfo.downloadUrl}
                    target="_system"
                    rel="noopener noreferrer"
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 min-h-[42px] transition-colors"
                    title="Descargar archivo APK si prefieres instalarlo manualmente"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Descargar APK</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Up to date notice */}
          {updateChecked && !updateAvailable && !updateError && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/30 px-3 py-2 rounded-xl border border-emerald-800/30">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Tu aplicación ya tiene la versión más reciente (v{CURRENT_APP_VERSION}).</span>
            </div>
          )}

          {/* Error notice */}
          {updateError && (
            <div className="flex items-center gap-2 text-xs font-medium text-rose-400 bg-rose-950/30 px-3 py-2 rounded-xl border border-rose-800/30">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{updateError}</span>
            </div>
          )}
        </div>

        {/* Logout button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-rose-100 text-xs font-bold border border-rose-800/50 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión de esta cuenta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
