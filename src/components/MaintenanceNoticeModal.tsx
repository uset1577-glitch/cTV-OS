import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppWindow, ShieldAlert } from 'lucide-react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import type { LauncherRemoteStatus } from '../types/launcher';
import { BrandLogo } from './BrandLogo';

interface MaintenanceNoticeModalProps {
  isOpen: boolean;
  status: LauncherRemoteStatus;
  onAcknowledge: () => void;
}

export function MaintenanceNoticeModal({
  isOpen,
  status,
  onAcknowledge,
}: MaintenanceNoticeModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useSpatialNavigation({
    enabled: isOpen,
    onBack: onAcknowledge,
    scopeSelector: '#maintenance-notice-modal',
  });

  useEffect(() => {
    if (isOpen) {
      const id = window.requestAnimationFrame(() => {
        confirmBtnRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="maintenance-notice-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="maintenance-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 bg-black/82 flex items-center justify-center p-8"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="w-full max-w-xl rounded-3xl bg-[#E6ECF4] dark:bg-[#12151E] border border-slate-900/12 dark:border-white/15 p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <BrandLogo size="md" showWordmark />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Aviso obligatorio del sistema
              </span>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#0A0D14] border border-amber-500/40 p-6 space-y-4 mb-6">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2
                    id="maintenance-modal-title"
                    className="font-display text-2xl font-bold text-slate-900 dark:text-white leading-tight text-balance"
                  >
                    {status.title || 'Mantenimiento · Próxima actualización'}
                  </h2>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mt-1.5">
                    El modo solo apps será activado
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                {status.message ||
                  'El modo solo apps será activado mientras preparamos la próxima actualización de VORA TV OS.'}
              </p>

              <div className="rounded-xl bg-slate-100 dark:bg-white/[0.04] px-4 py-3 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Durante este periodo permanecerán visibles únicamente tus aplicaciones instaladas,
                búsqueda y ajustes. Cuando termine el mantenimiento, las recomendaciones volverán
                automáticamente.
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                ref={confirmBtnRef}
                type="button"
                data-tv-focusable="true"
                data-tv-initial="true"
                data-tv-id="maintenance-ack-btn"
                onClick={onAcknowledge}
                className="tv-focusable inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-amber-500 text-zinc-950 font-bold text-sm focus:bg-[#18202C] focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:ring-2 focus:ring-amber-400 focus:scale-105 shadow-md"
              >
                <AppWindow className="w-4 h-4 shrink-0" />
                <span>Entendido · Activar modo solo apps</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
