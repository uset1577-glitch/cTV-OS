import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppWindow, ArrowLeft, Home, Settings } from 'lucide-react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { getTranslations } from '../i18n/translations';
import type { AppLanguage } from '../types/launcher';
import { BrandLogo } from './BrandLogo';

interface DefaultLauncherGuideModalProps {
  isOpen: boolean;
  language: AppLanguage;
  currentHomePackage?: string;
  currentHomeLabel?: string;
  onOpenCurrentLauncherDetails: () => void;
  onOpenTvAppsSettings: () => void;
  onClose: () => void;
}

export function DefaultLauncherGuideModal({
  isOpen,
  language,
  currentHomePackage,
  currentHomeLabel,
  onOpenCurrentLauncherDetails,
  onOpenTvAppsSettings,
  onClose,
}: DefaultLauncherGuideModalProps) {
  const initialBtnRef = useRef<HTMLButtonElement | null>(null);
  const t = getTranslations(language).defaultLauncherModal;

  useSpatialNavigation({
    enabled: isOpen,
    onBack: onClose,
    scopeSelector: '#vora-default-launcher-modal',
  });

  useEffect(() => {
    if (!isOpen) return;
    const rafId = window.requestAnimationFrame(() => {
      initialBtnRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="vora-default-launcher-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="default-launcher-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="fixed inset-0 z-50 bg-black/82 flex items-center justify-center p-8"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
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
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="default-launcher-modal-title"
                    className="font-display text-2xl font-bold text-zinc-900 dark:text-white leading-tight text-balance"
                  >
                    {t.title}
                  </h2>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1.5 leading-relaxed">
                    {t.subtitle(currentHomeLabel)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-zinc-100 dark:bg-white/[0.04] px-4 py-3.5 space-y-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {t.steps.map((step) => (
                  <p key={step}>{step}</p>
                ))}
              </div>
            </div>

            <div
              data-tv-row="default-launcher-actions"
              className="flex flex-wrap items-center justify-end gap-3"
            >
              {currentHomePackage && (
                <button
                  ref={initialBtnRef}
                  type="button"
                  data-tv-focusable="true"
                  data-tv-initial="true"
                  data-tv-id="launcher-guide-details"
                  onClick={onOpenCurrentLauncherDetails}
                  className="tv-focusable inline-flex items-center gap-2 px-5 py-3 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-sm focus:scale-105 shadow-md"
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>{t.openCurrentLauncherDetails(currentHomeLabel)}</span>
                </button>
              )}

              <button
                ref={!currentHomePackage ? initialBtnRef : undefined}
                type="button"
                data-tv-focusable="true"
                data-tv-initial={!currentHomePackage ? 'true' : undefined}
                data-tv-id="launcher-guide-apps"
                onClick={onOpenTvAppsSettings}
                className="tv-focusable inline-flex items-center gap-2 px-5 py-3 rounded-full bg-zinc-900/10 dark:bg-white/10 text-zinc-900 dark:text-white font-semibold text-sm focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
              >
                <AppWindow className="w-4 h-4 shrink-0" />
                <span>{t.openTvAppsSettings}</span>
              </button>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="launcher-guide-close"
                onClick={onClose}
                className="tv-focusable inline-flex items-center gap-2 px-5 py-3 rounded-full bg-zinc-900/6 dark:bg-white/8 text-zinc-700 dark:text-zinc-300 font-semibold text-sm focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>{t.closeBtn}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
