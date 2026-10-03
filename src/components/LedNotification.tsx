import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface LedMessage {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  detail?: string;
}

interface LedNotificationProps {
  notifications: LedMessage[];
  onDismiss: (id: string) => void;
}

export const LedNotification: React.FC<LedNotificationProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => {
          const isSuccess = notif.type === 'success';
          const isWarning = notif.type === 'warning';

          const ledColor = isSuccess
            ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
            : isWarning
            ? 'bg-amber-400 shadow-[0_0_12px_#fbbf24]'
            : 'bg-cyan-400 shadow-[0_0_12px_#22d3ee]';

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 15, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/95 border border-slate-800 backdrop-blur-md shadow-2xl text-xs"
            >
              {/* LED hardware indicator */}
              <div className="pt-1 flex items-center justify-center shrink-0">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isSuccess
                        ? 'bg-emerald-400'
                        : isWarning
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                    }`}
                  />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ledColor}`} />
                </span>
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <p className="font-semibold text-slate-100">{notif.title}</p>
                {notif.detail && (
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">{notif.detail}</p>
                )}
              </div>

              <button
                onClick={() => onDismiss(notif.id)}
                className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors rounded"
                title="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
