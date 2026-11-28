import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppWindow, ShieldAlert } from 'lucide-react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { getTranslations } from '../i18n/translations';
import type { AppLanguage, LauncherRemoteStatus } from '../types/launcher';
import { BrandLogo } from './BrandLogo';

interface MaintenanceNoticeModalProps {
  isOpen: boolean;
  language: AppLanguage;
  status: LauncherRemoteStatus;
  onAcknowledge: () => void;
}

export function MaintenanceNoticeModal({
  isOpen,
  language,
  status,
  onAcknowledge,
}: MaintenanceNoticeModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const dismissedRef = useRef(false);

  const handleAck = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onAcknowledge();
  }, [onAcknowledge]);

  useSpatialNavigation({
    enabled: isOpen,
    onBack: handleAck,
    scopeSelector: '#maintenance-notice-modal',
  });

  useEffect(() => {
    if (isOpen) {
      dismissedRef.current = false;
      const id = window.requestAnimationFrame(() => {
        confirmBtnRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(id);
    }
    dismissedRef.current = false;
  }, [isOpen]);

  const t = getTranslations(language).maintenanceModal;

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
            className="w-full max-w-xl rounded-3xl bg-[#E5E7EB] dark:bg-[#111114] border border-zinc-900/12 dark:border-white/15 p-8 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 mb-6">
              <BrandLogo size="md" showWordmark />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {t.badge}
              </span>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#09090B] border border-zinc-900/15 dark:border-white/20 p-6 space-y-4 mb-6">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2
                    id="maintenance-modal-title"
                    className="font-display text-2xl font-bold text-zinc-900 dark:text-white leading-tight text-balance"
                  >
                    {status.title || t.defaultTitle}
                  </h2>
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mt-1.5">
                    {t.appsOnlyHeading}
                  </p>
                </div>
              </div>

              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {status.message || t.defaultMessage}
              </p>

              <div className="rounded-xl bg-zinc-100 dark:bg-white/[0.04] px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {t.explanation}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                ref={confirmBtnRef}
                type="button"
                data-tv-focusable="true"
                data-tv-initial="true"
                data-tv-id="maintenance-ack-btn"
                onClick={handleAck}
                className="tv-focusable inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-sm focus:scale-105 shadow-md"
              >
                <AppWindow className="w-4 h-4 shrink-0" />
                <span>{t.acknowledgeBtn}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
