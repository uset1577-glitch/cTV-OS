import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Database, RefreshCw, Tv } from 'lucide-react';
import {
  deduplicateSuggestions,
  filterSeriesByPlatform,
  getCatalogPlatforms,
  isValidImageUrl,
  resolvePackageAlias,
} from '../data/suggestions';
import type { AppSuggestion, InstalledApp } from '../types/launcher';

interface LivePlatformsViewProps {
  allApps: InstalledApp[];
  favoritePackages?: string[];
  series: AppSuggestion[];
  catalogFeedUrl?: string;
  isLoading: boolean;
  onScrollTopChange: (atTop: boolean) => void;
  onRefreshFeed: () => void;
  onOpenFeedSettings?: () => void;
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
}

export function LivePlatformsView({
  allApps,
  favoritePackages = [],
  series,
  catalogFeedUrl = '',
  isLoading,
  onScrollTopChange,
  onRefreshFeed,
  onOpenFeedSettings,
  onLaunchSuggestion,
}: LivePlatformsViewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFailedIds({});
  }, [series]);

  const validSeries = useMemo(() => {
    return deduplicateSuggestions(series).filter((item) => {
      if (failedIds[item.id]) return false;
      return isValidImageUrl(item.backdropUrl || item.posterUrl);
    });
  }, [series, failedIds]);

  const platformTabs = useMemo(() => {
    const active = getCatalogPlatforms(validSeries, allApps, favoritePackages);
    if (active.length === 0) return [];
    return [
      { id: 'all', label: 'Todas las plataformas' },
      ...active.map((p) => ({ id: p.id, label: p.appName })),
    ];
  }, [validSeries, allApps, favoritePackages]);

  useEffect(() => {
    if (
      selectedPlatform !== 'all' &&
      !platformTabs.some((tab) => tab.id === selectedPlatform)
    ) {
      setSelectedPlatform('all');
    }
  }, [platformTabs, selectedPlatform]);

  const filteredItems = useMemo(
    () => filterSeriesByPlatform(validSeries, selectedPlatform, allApps),
    [validSeries, selectedPlatform, allApps]
  );

  const markFailed = (id: string) => {
    setFailedIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  };

  return (
    <div
      data-tv-scroll-container="true"
      data-tv-has-topbar="true"
      onScroll={(e) => onScrollTopChange(e.currentTarget.scrollTop <= 18)}
      className="flex-1 overflow-y-auto no-scrollbar px-12 pt-[82px] pb-14"
    >
      <div
        data-tv-row="live-header"
        data-tv-scroll-top="true"
        className="flex flex-wrap items-center justify-between gap-4 mb-6 scroll-mt-[82px]"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-white">
            En vivo y emisiones
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Catálogo conectado a tu fuente externa o puente nativo para abrir directo en la app
          </p>
        </div>

        <button
          type="button"
          data-tv-focusable="true"
          data-tv-initial={platformTabs.length === 0 && filteredItems.length === 0 ? 'true' : undefined}
          data-tv-id="live-refresh-btn"
          onClick={onRefreshFeed}
          className="tv-focusable inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:scale-105 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar catálogo</span>
        </button>
      </div>

      {platformTabs.length > 1 && (
        <div
          data-tv-row="live-filters"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1.5 px-1 -mx-1 mb-6"
        >
          {platformTabs.map((tab, idx) => {
            const active = selectedPlatform === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-tv-focusable="true"
                data-tv-initial={idx === 0 ? 'true' : undefined}
                data-tv-id={`live-filter-${tab.id}`}
                onClick={() => setSelectedPlatform(tab.id)}
                className={`tv-focusable px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'bg-zinc-900/10 dark:bg-white/10 text-zinc-700 dark:text-zinc-300'
                } focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:scale-105`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div
          data-tv-row="live-empty"
          className="py-16 px-6 text-center rounded-3xl border border-zinc-900/12 dark:border-white/10 bg-zinc-900/[0.04] dark:bg-white/[0.03]"
        >
          {selectedPlatform !== 'all' ? (
            <>
              <Tv className="w-8 h-8 text-zinc-500 dark:text-zinc-400 mx-auto mb-3" />
              <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">
                No hay emisiones válidas para esta plataforma en este momento.
              </p>
              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="live-show-all"
                onClick={() => setSelectedPlatform('all')}
                className="tv-focusable mt-4 px-5 py-2.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:scale-105"
              >
                Ver todas las plataformas
              </button>
            </>
          ) : (
            <>
              <Database className="w-8 h-8 text-zinc-500 dark:text-zinc-400 mx-auto mb-3" />
              <p className="text-base font-semibold text-zinc-900 dark:text-white">
                {catalogFeedUrl
                  ? 'Sin emisiones válidas en la fuente externa'
                  : 'Fuente de emisiones sin configurar'}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-md mx-auto">
                {catalogFeedUrl
                  ? 'No se recibieron elementos con imagen válida desde la URL configurada.'
                  : 'Conecta una URL JSON/API o el puente nativo en Ajustes para mostrar emisiones aquí.'}
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                {onOpenFeedSettings && (
                  <button
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id="live-configure-feed"
                    onClick={onOpenFeedSettings}
                    className="tv-focusable px-5 py-2.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold focus:scale-105"
                  >
                    Configurar fuente
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div
          data-tv-row="live-grid"
          data-tv-row-type="grid"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
        >
          {filteredItems.map((item, idx) => {
            const resolvedPkg = resolvePackageAlias(item.packageName, allApps);
            const landscapeImage = item.backdropUrl || item.posterUrl || '';
            if (!isValidImageUrl(landscapeImage)) return null;

            return (
              <button
                key={item.id}
                type="button"
                data-tv-focusable="true"
                data-tv-initial={platformTabs.length <= 1 && idx === 0 ? 'true' : undefined}
                data-tv-id={`live-card-${item.id}`}
                onClick={() => onLaunchSuggestion({ ...item, packageName: resolvedPkg })}
                className="tv-focusable group text-left rounded-2xl focus:outline-none focus:scale-[1.04] scroll-my-12"
              >
                <div
                  data-tv-focus-box="true"
                  className="relative aspect-video w-full rounded-2xl overflow-hidden bg-zinc-300 dark:bg-zinc-900 border-2 border-transparent group-focus:border-zinc-900 dark:group-focus:border-white shadow-md"
                >
                  <img
                    src={landscapeImage}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => markFailed(item.id)}
                    className="w-full h-full object-cover object-center"
                  />
                  <span className="opacity-0 group-focus:opacity-100 absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/80 text-white flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>

                <div className="mt-2.5 px-0.5">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {item.title}
                  </div>
                  {(item.appName || item.tag || item.subtitle) && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                      {[item.appName || item.tag, item.subtitle].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
