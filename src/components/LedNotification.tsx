import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

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
  // Show only the latest notification to keep the UI clean and unobtrusive
  const latest = notifications.length > 0 ? notifications[notifications.length - 1] : null;

  if (!latest) return null;

  const isSuccess = latest.type === 'success';
  const isWarning = latest.type === 'warning';

  const dotColor = isSuccess
    ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
    : isWarning
    ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
    : 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]';

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-[90vw] sm:max-w-md w-max px-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={latest.id}
          initial={{ opacity: 0, y: 12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.94, transition: { duration: 0.15 } }}
          transition={{ type: 'spring', damping: 25, stiffness: 380 }}
          className="pointer-events-auto flex items-center gap-2.5 py-2 px-4 rounded-full bg-slate-900/95 border border-slate-700/80 backdrop-blur-md shadow-2xl text-xs"
        >
          {/* Subtle LED glow dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSuccess ? 'bg-emerald-400' : isWarning ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
            />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
          </span>

          {/* Clean concise message */}
          <span className="font-semibold text-slate-100 tracking-tight select-none truncate max-w-[270px] sm:max-w-sm">
            {latest.title}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
