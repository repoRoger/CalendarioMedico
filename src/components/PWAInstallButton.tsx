import React, { useState } from 'react';
import { Download, Smartphone, Share2, Check, X, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'card' | 'inline' }> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running in standalone mode (already installed), no need to show install button
  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={handleAction}
          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 border border-teal-500/40 text-xs font-bold text-teal-300 hover:text-white transition-all flex items-center gap-1.5 min-h-[38px] shadow-sm shadow-teal-950/40 active:scale-95 animate-pulse hover:animate-none"
          title="Instalar aplicación en pantalla completa"
        >
          <Download className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="hidden sm:inline">Instalar App</span>
          <span className="sm:hidden text-[11px]">Instalar</span>
        </button>
      )}

      {variant === 'card' && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/40 border border-teal-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Instalar como App en tu teléfono
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800">
                  Pantalla Completa
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Ábrela sin barra de navegador, con icono propio y acceso instantáneo a tus turnos.
              </p>
            </div>
          </div>

          <button
            onClick={handleAction}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-900/50 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Instalar ahora</span>
          </button>
        </div>
      )}

      {/* Installation Guide Modal (for iOS or when beforeinstallprompt requires browser trigger) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 my-auto relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 mx-auto shadow-lg shadow-teal-950/50">
              <Smartphone className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-100 tracking-tight">
                Instalar Calendario Médico
              </h3>
              <p className="text-xs text-slate-400">
                Se instalará en tu pantalla de inicio y se abrirá en <strong className="text-teal-300">pantalla completa</strong> sin barras de navegador.
              </p>
            </div>

            {isInstallable ? (
              <div className="space-y-3 pt-2">
                <button
                  onClick={async () => {
                    await install();
                    setShowGuideModal(false);
                  }}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Presiona aquí para Instalar</span>
                </button>
              </div>
            ) : isIOS ? (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2.5">
                <p className="font-semibold text-teal-400 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4" /> Instrucciones para iPhone / iPad:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                  <li>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) en Safari.</li>
                  <li>Desliza hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong>.</li>
                  <li>Toca <strong>"Agregar"</strong> arriba a la derecha.</li>
                </ol>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  ¡Listo! Al abrirla desde tu pantalla de inicio funcionará como app nativa a pantalla completa.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2.5">
                <p className="font-semibold text-teal-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> En Android / Chrome:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                  <li>Toca el menú de los <strong>3 puntos verticales (⋮)</strong> en la esquina superior derecha del navegador.</li>
                  <li>Selecciona la opción <strong>"Instalar aplicación"</strong> (o "Instalar Calendario Médico").</li>
                  <li>Confirma en <strong>"Instalar"</strong>.</li>
                </ol>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  Ya no aparecerá como simple acceso directo web, sino como app oficial con ventana completa.
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Funciona offline con tus datos guardados</span>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
