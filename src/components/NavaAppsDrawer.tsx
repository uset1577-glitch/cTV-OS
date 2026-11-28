import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, Star, X } from 'lucide-react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import { getTranslations } from '../i18n/translations';
import type { AppCategoryFilter, AppLanguage, InstalledApp } from '../types/launcher';
import { AppTile } from './AppTile';

interface NavaAppsDrawerProps {
  isOpen: boolean;
  language: AppLanguage;
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
  language,
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
  const t = getTranslations(language).appsDrawer;
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
      if (app.isSystemApp) return false;
      if (filter === 'tv') {
        return app.isLeanback && app.category !== 'games';
      }
      if (filter === 'games') {
        return (
          app.category === 'games' ||
          app.packageName.includes('game')
        );
      }
      return true;
    });
  }, [apps, filter]);

  const filterOptions: Array<{ id: AppCategoryFilter; label: string }> = [
    { id: 'all', label: t.filterAll },
    { id: 'tv', label: t.filterTv },
    { id: 'games', label: t.filterGames },
  ];

  const handleTileAction = useCallback(
    (app: InstalledApp) => {
      if (pinMode) {
        onToggleFavorite(app);
      } else {
        onLaunchApp(app);
      }
    },
    [pinMode, onToggleFavorite, onLaunchApp]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="nava-apps-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={t.dialogAria}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-40 bg-[#E5E7EB] dark:bg-[#09090B] flex flex-col px-12 pt-8 pb-8"
        >
          <div data-tv-row="drawer-top" className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0">
            <div>
              <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-white">
                {t.title}
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {isNative ? t.countNative(apps.length) : t.countWeb(apps.length)}
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
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200'
                } focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105`}
              >
                <Star className={`w-4 h-4 ${pinMode ? 'fill-current' : ''}`} />
                <span>{pinMode ? t.pinModeActive : t.pinModeIdle}</span>
              </button>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="drawer-refresh"
                onClick={onRefresh}
                className="tv-focusable inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{t.reload}</span>
              </button>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="drawer-close"
                onClick={onClose}
                aria-label={t.closeAria}
                className="tv-focusable p-2.5 rounded-full bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div data-tv-row="drawer-filters" className="flex items-center gap-2 mb-5 shrink-0 py-1 px-1 -mx-1">
            {filterOptions.map((opt) => {
              const active = filter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id={`drawer-filter-${opt.id}`}
                  onClick={() => setFilter(opt.id)}
                  className={`tv-focusable px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                      : 'bg-zinc-900/10 dark:bg-white/8 text-zinc-700 dark:text-zinc-300'
                  } focus:scale-105`}
                >
                  {opt.label}
                </button>
              );
            })}

            {pinMode && (
              <span className="ml-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t.pinInstruction}
              </span>
            )}
          </div>

          <div
            data-tv-scroll-container="true"
            className="flex-1 overflow-y-auto no-scrollbar py-2 px-1 -mx-1"
          >
            {isLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-5">
                {Array.from({ length: 14 }).map((_, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-3 py-3">
                    <div className="w-24 h-24 rounded-[22px] bg-zinc-900/10 dark:bg-white/8 animate-pulse" />
                    <div className="w-20 h-3 rounded bg-zinc-900/10 dark:bg-white/8 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filteredApps.length === 0 ? (
              <div data-tv-row="drawer-empty" className="py-16 text-center">
                <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {t.emptyCategory}
                </p>
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-initial="true"
                  data-tv-id="drawer-reset-filter"
                  onClick={() => setFilter('all')}
                  className="tv-focusable mt-4 px-5 py-2.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold focus:scale-105"
                >
                  {t.seeAll}
                </button>
              </div>
            ) : (
              <div
                data-tv-row="drawer-grid"
                data-tv-row-type="grid"
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4 px-2 pb-10"
              >
                {filteredApps.map((app, index) => (
                  <div
                    key={app.packageName}
                    data-tv-initial={index === 0 ? 'true' : undefined}
                  >
                    <AppTile
                      app={app}
                      isFavorite={favoritePackages.includes(app.packageName)}
                      showPackageName={showPackageNames}
                      pinnedLabel={t.pinnedBadgeAria}
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
