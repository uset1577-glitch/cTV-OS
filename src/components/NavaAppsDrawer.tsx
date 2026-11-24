import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, Star, X } from 'lucide-react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import type { AppCategoryFilter, InstalledApp } from '../types/launcher';
import { AppTile } from './AppTile';

interface NavaAppsDrawerProps {
  isOpen: boolean;
  apps: InstalledApp[];
  favoritePackages: string[];
  showPackageNames: boolean;
  isLoading: boolean;
  isNative: boolean;
  onRefresh: () => void;
  onLaunchApp: (app: InstalledApp) => void;
  onToggleFavorite: (app: InstalledApp) => void;
  onClose: () => void;
}

export function NavaAppsDrawer({
  isOpen,
  apps,
  favoritePackages,
  showPackageNames,
  isLoading,
  isNative,
  onRefresh,
  onLaunchApp,
  onToggleFavorite,
  onClose,
}: NavaAppsDrawerProps) {
  const [filter, setFilter] = useState<AppCategoryFilter>('all');
  const [pinMode, setPinMode] = useState(false);

  useSpatialNavigation({
    enabled: isOpen,
    onBack: onClose,
    scopeSelector: '#nava-apps-drawer',
  });

  useEffect(() => {
    if (isOpen) {
      setPinMode(false);
    }
  }, [isOpen]);

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      if (filter === 'tv') {
        return app.isLeanback && !app.isSystemApp && app.category !== 'games';
      }
      if (filter === 'games') {
        return (
          app.category === 'games' ||
          app.packageName.includes('game') ||
          app.packageName.includes('party') ||
          app.packageName.includes('retro')
        );
      }
      if (filter === 'other') {
        return app.isSystemApp || !app.isLeanback || app.category === 'other';
      }
      return true;
    });
  }, [apps, filter]);

  const filterOptions: Array<{ id: AppCategoryFilter; label: string }> = [
    { id: 'all', label: 'Todas' },
    { id: 'tv', label: 'TV y Streaming' },
    { id: 'games', label: 'Juegos' },
    { id: 'other', label: 'Sistema' },
  ];

  const handleTileAction = (app: InstalledApp) => {
    if (pinMode) {
      onToggleFavorite(app);
    } else {
      onLaunchApp(app);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="nava-apps-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Todas las aplicaciones"
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed inset-0 z-40 bg-[#ECEEF2]/98 dark:bg-[#090B10]/98 flex flex-col px-12 pt-9 pb-8"
        >
          {/* Cabecera limpia */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
            <div>
              <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-white">
                Aplicaciones instaladas
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {apps.length} aplicaciones ·{' '}
                {isNative
                  ? 'Leídas con PackageManager'
                  : 'Vista previa web · En Android TV lee tus apps reales'}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="drawer-pin-mode"
                onClick={() => setPinMode((prev) => !prev)}
                className={`tv-focusable inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 ${
                  pinMode
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-900/8 dark:bg-white/10 text-zinc-800 dark:text-zinc-200'
                } focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105`}
              >
                <Star className={`w-4 h-4 ${pinMode ? 'fill-zinc-950' : ''}`} />
                <span>{pinMode ? 'Terminar de fijar' : 'Fijar en fila'}</span>
              </button>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="drawer-refresh"
                onClick={onRefresh}
                className="tv-focusable inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-zinc-900/8 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Recargar</span>
              </button>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="drawer-close"
                onClick={onClose}
                aria-label="Volver al inicio"
                className="tv-focusable p-2.5 rounded-full bg-zinc-900/8 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filtros de una sola línea */}
          <div className="flex items-center gap-2 mb-6 shrink-0">
            {filterOptions.map((opt) => {
              const active = filter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id={`drawer-filter-${opt.id}`}
                  onClick={() => setFilter(opt.id)}
                  className={`tv-focusable px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                      : 'bg-zinc-900/6 dark:bg-white/8 text-zinc-600 dark:text-zinc-300'
                  } focus:ring-2 focus:ring-amber-500 focus:scale-105`}
                >
                  {opt.label}
                </button>
              );
            })}

            {pinMode && (
              <span className="ml-3 text-sm font-medium text-amber-600 dark:text-amber-400">
                Pulsa OK en cualquier app para fijarla o quitarla de tu fila principal
              </span>
            )}
          </div>

          {/* Grilla espaciosa */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-2 px-1 -mx-1">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-[156px] rounded-3xl bg-zinc-900/6 dark:bg-white/6 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                  No hay aplicaciones en esta categoría
                </p>
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-initial="true"
                  onClick={() => setFilter('all')}
                  className="tv-focusable mt-4 px-5 py-2.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold focus:scale-105"
                >
                  Ver todas
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-8">
                {filteredApps.map((app, index) => (
                  <div
                    key={app.packageName}
                    data-tv-initial={index === 0 ? 'true' : undefined}
                  >
                    <AppTile
                      app={app}
                      isFavorite={favoritePackages.includes(app.packageName)}
                      showPackageName={showPackageNames}
                      focusId={`drawer-app-${app.packageName}`}
                      onLaunch={handleTileAction}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
