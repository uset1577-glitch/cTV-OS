import { useMemo, useState } from 'react';
import { ArrowUpRight, RefreshCw, Tv } from 'lucide-react';
import { resolvePackageAlias } from '../data/suggestions';
import type { AppSuggestion, InstalledApp } from '../types/launcher';

interface LivePlatformsViewProps {
  allApps: InstalledApp[];
  series: AppSuggestion[];
  isLoading: boolean;
  onScrollTopChange: (atTop: boolean) => void;
  onRefreshFeed: () => void;
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
}

const PLATFORM_TABS = [
  { id: 'all', label: 'Todas las plataformas' },
  { id: 'com.netflix.ninja', label: 'Netflix' },
  { id: 'com.wbd.stream', label: 'Max' },
  { id: 'com.amazon.amazonvideo.livingroom', label: 'Prime Video' },
  { id: 'com.disney.disneyplus', label: 'Disney+' },
  { id: 'com.google.android.youtube.tv', label: 'YouTube' },
];

export function LivePlatformsView({
  allApps,
  series,
  isLoading,
  onScrollTopChange,
  onRefreshFeed,
  onLaunchSuggestion,
}: LivePlatformsViewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const filteredItems = useMemo(() => {
    if (selectedPlatform === 'all') return series;
    return series.filter((item) => item.packageName === selectedPlatform);
  }, [series, selectedPlatform]);

  const markFailed = (url: string) => {
    setFailedUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

  return (
    <div
      data-tv-scroll-container="true"
      onScroll={(e) => onScrollTopChange(e.currentTarget.scrollTop <= 18)}
      className="flex-1 overflow-y-auto no-scrollbar px-12 pt-[82px] pb-14"
    >
      <div
        data-tv-row="live-header"
        data-tv-scroll-top="true"
        className="flex flex-wrap items-center justify-between gap-4 mb-6 scroll-mt-[82px]"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
            En vivo y emisiones de hoy
          </h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
            Catálogo actualizado en vivo, separado por plataforma para abrir directo en tu TV
          </p>
        </div>

        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="live-refresh-btn"
          onClick={onRefreshFeed}
          className="tv-focusable inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-slate-900/10 dark:bg-white/10 text-slate-800 dark:text-zinc-200 focus:bg-[#18202C] focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:ring-2 focus:ring-amber-500 focus:scale-105 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar catálogo</span>
        </button>
      </div>

      {/* Selector por plataforma */}
      <div
        data-tv-row="live-filters"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1.5 px-1 -mx-1 mb-6"
      >
        {PLATFORM_TABS.map((tab, idx) => {
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
                  ? 'bg-[#18202C] text-white dark:bg-white dark:text-zinc-950'
                  : 'bg-slate-900/10 dark:bg-white/10 text-slate-700 dark:text-zinc-300'
              } focus:ring-2 focus:ring-amber-500 focus:scale-105`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {filteredItems.length === 0 ? (
        <div
          data-tv-row="live-empty"
          className="py-16 text-center rounded-3xl border border-slate-900/12 dark:border-white/10 bg-slate-900/[0.04] dark:bg-white/[0.03]"
        >
          <Tv className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-base font-medium text-slate-700 dark:text-zinc-300">
            No hay emisiones cargadas para esta plataforma en este momento.
          </p>
          <button
            type="button"
            data-tv-focusable="true"
            data-tv-id="live-show-all"
            onClick={() => setSelectedPlatform('all')}
            className="tv-focusable mt-4 px-5 py-2.5 rounded-full bg-[#18202C] text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:scale-105"
          >
            Ver todas las plataformas
          </button>
        </div>
      ) : (
        <div
          data-tv-row="live-grid"
          data-tv-row-type="grid"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5"
        >
          {filteredItems.map((item) => {
            const resolvedPkg = resolvePackageAlias(item.packageName, allApps);
            const landscapeImage = item.backdropUrl || item.posterUrl;
            return (
              <button
                key={item.id}
                type="button"
                data-tv-focusable="true"
                data-tv-id={`live-card-${item.id}`}
                onClick={() => onLaunchSuggestion({ ...item, packageName: resolvedPkg })}
                className="tv-focusable group text-left rounded-2xl focus:outline-none focus:scale-[1.04] scroll-my-12"
              >
                <div
                  data-tv-focus-box="true"
                  className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-300 dark:bg-zinc-900 border-2 border-transparent group-focus:border-amber-500 dark:group-focus:border-white shadow-md"
                >
                  {landscapeImage && !failedUrls[landscapeImage] ? (
                    <img
                      src={landscapeImage}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={() => markFailed(landscapeImage)}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center p-4"
                      style={{ background: item.accentGradient }}
                    >
                      <span className="font-display text-sm font-bold text-white text-center line-clamp-2">
                        {item.title}
                      </span>
                    </div>
                  )}
                  <span className="opacity-0 group-focus:opacity-100 absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/75 text-white flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>

                <div className="mt-2.5 px-0.5">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-zinc-400 truncate mt-0.5">
                    {item.tag} · {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
