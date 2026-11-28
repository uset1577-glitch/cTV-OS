import { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Globe } from 'lucide-react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { getTranslations, SUPPORTED_LANGUAGES } from '../i18n/translations';
import type { AppLanguage } from '../types/launcher';
import { BrandLogo } from './BrandLogo';

interface LanguageSetupScreenProps {
  isOpen: boolean;
  initialLanguage: AppLanguage;
  onSelectLanguage: (lang: AppLanguage) => void;
}

export function LanguageSetupScreen({
  isOpen,
  initialLanguage,
  onSelectLanguage,
}: LanguageSetupScreenProps) {
  const [previewLang, setPreviewLang] = useState<AppLanguage>(initialLanguage);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      submittedRef.current = false;
      return;
    }
    submittedRef.current = false;
    setPreviewLang(initialLanguage);
    const rafId = window.requestAnimationFrame(() => {
      const initialBtn = document.querySelector<HTMLElement>(
        '#vora-language-setup [data-tv-initial="true"]'
      );
      initialBtn?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [isOpen, initialLanguage]);

  const handleConfirmLanguage = (lang: AppLanguage) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSelectLanguage(lang);
  };

  useSpatialNavigation({
    enabled: isOpen,
    onBack: () => {
      // Primera configuración obligatoria antes de entrar al launcher
    },
    scopeSelector: '#vora-language-setup',
  });

  if (!isOpen) return null;

  const t = getTranslations(previewLang).languageSetup;

  return (
    <div
      id="vora-language-setup"
      data-tv-over-dark="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vora-language-setup-title"
      className="fixed inset-0 z-50 bg-[#08090C] text-white flex flex-col justify-between px-12 py-10 select-none overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(90% 70% at 50% 15%, rgba(255, 255, 255, 0.05) 0%, rgba(8, 9, 12, 0.98) 65%, #050608 100%)',
      }}
    >
      {/* Cabecera minimalista */}
      <header className="flex items-center justify-between gap-6">
        <BrandLogo size="md" showWordmark forceLightText />
        <div className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] uppercase text-zinc-400">
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.eyebrow}</span>
        </div>
      </header>

      {/* Selector central limpio y directo para control remoto */}
      <main className="w-full max-w-4xl mx-auto flex flex-col items-center text-center my-auto">
        <h1
          id="vora-language-setup-title"
          className="font-display text-4xl lg:text-5xl font-bold tracking-tight text-white text-balance"
        >
          {t.title}
        </h1>
        <p className="mt-3 text-base text-zinc-400 max-w-xl leading-relaxed">
          {t.subtitle}
        </p>

        <div
          data-tv-row="language-setup-grid"
          data-tv-row-type="grid"
          className="mt-10 w-full grid grid-cols-2 gap-4"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSuggested = lang.code === initialLanguage;
            const isPreviewed = lang.code === previewLang;
            return (
              <button
                key={lang.code}
                type="button"
                data-tv-focusable="true"
                data-tv-initial={isSuggested ? 'true' : undefined}
                data-tv-id={`setup-lang-${lang.code}`}
                onFocus={() => setPreviewLang(lang.code)}
                onMouseEnter={() => setPreviewLang(lang.code)}
                onClick={() => handleConfirmLanguage(lang.code)}
                className="tv-focusable group relative flex items-center justify-between gap-4 px-6 py-5 rounded-2xl bg-white/[0.06] border border-white/14 text-left text-white hover:bg-white/[0.12] focus:bg-white focus:text-zinc-950 focus:border-white focus:scale-[1.03] shadow-lg"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="w-12 h-12 rounded-xl bg-white/10 group-focus:bg-zinc-950/10 flex items-center justify-center font-mono-tabular text-sm font-bold tracking-wider shrink-0">
                    {lang.shortCode}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-xl font-bold tracking-tight truncate">
                      {lang.nativeName}
                    </div>
                    <div className="text-xs text-zinc-400 group-focus:text-zinc-600 truncate mt-0.5">
                      {lang.regionHint}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isPreviewed && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-amber-400 group-focus:text-zinc-900">
                      <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-zinc-500 group-focus:text-zinc-950" />
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Pie con indicación simple para control remoto */}
      <footer className="flex items-center justify-between gap-4 text-xs text-zinc-400">
        <span>{t.remoteHint}</span>
        <span className="font-medium text-zinc-300">{t.selectCta}</span>
      </footer>
    </div>
  );
}
