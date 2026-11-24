import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppWindow, Search, X } from 'lucide-react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import type { InstalledApp } from '../types/launcher';

interface NavaSearchOverlayProps {
  isOpen: boolean;
  apps: InstalledApp[];
  onLaunchApp: (app: InstalledApp) => void;
  onClose: () => void;
}

export function NavaSearchOverlay({
  isOpen,
  apps,
  onLaunchApp,
  onClose,
}: NavaSearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useSpatialNavigation({
    enabled: isOpen,
    onBack: onClose,
    scopeSelector: '#nava-search-root',
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apps.slice(0, 12);
    return apps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q)
    );
  }, [apps, query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="nava-search-root"
          role="dialog"
          aria-modal="true"
          aria-label="Buscador universal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-[#DCE3EE]/97 dark:bg-[#090B10]/96 flex flex-col px-12 pt-10 pb-8"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="max-w-5xl w-full mx-auto flex flex-col flex-1 min-h-0"
          >
            {/* Barra de búsqueda estilo TV Spotlight */}
            <div data-tv-row="search-bar" className="flex items-center gap-4 pb-5 border-b border-slate-900/12 dark:border-white/12">
              <Search className="w-6 h-6 text-slate-600 dark:text-zinc-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                data-tv-focusable="true"
                data-tv-initial="true"
                data-tv-id="search-input"
                placeholder="Escribe para buscar aplicaciones o juegos en tu TV..."
                className="flex-1 bg-transparent font-display text-2xl font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="search-close"
                onClick={onClose}
                aria-label="Cerrar buscador"
                className="tv-focusable p-2.5 rounded-full bg-slate-900/10 dark:bg-white/10 text-slate-800 dark:text-zinc-200 focus:bg-[#18202C] focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:ring-2 focus:ring-amber-500 focus:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resultados inmediatos */}
            <div className="mt-8 flex-1 overflow-y-auto no-scrollbar">
              {results.length === 0 ? (
                <div className="py-16 text-center text-slate-600 dark:text-zinc-400 text-lg">
                  No se encontró ninguna aplicación con &ldquo;{query}&rdquo;
                </div>
              ) : (
                <div
                  data-tv-row="search-grid"
                  data-tv-row-type="grid"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-6"
                >
                  {results.map((app) => (
                    <button
                      key={app.packageName}
                      type="button"
                      data-tv-focusable="true"
                      data-tv-id={`search-res-${app.packageName}`}
                      onClick={() => onLaunchApp(app)}
                      className="tv-focusable flex items-center gap-4 p-4 rounded-2xl bg-[#EEF2F7] dark:bg-white/[0.06] border border-slate-900/10 dark:border-white/10 text-left focus:bg-[#18202C] focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:ring-2 focus:ring-amber-500 focus:scale-[1.04] group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                        {app.icon ? (
                          <img
                            src={app.icon}
                            alt={app.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <AppWindow className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-base truncate">{app.name}</div>
                        <div className="text-xs font-mono-tabular text-slate-500 dark:text-zinc-400 group-focus:text-zinc-300 dark:group-focus:text-zinc-600 truncate">
                          {app.packageName}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
