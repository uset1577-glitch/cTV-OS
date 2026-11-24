import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, RefreshCw, Tv } from 'lucide-react';
import { resolvePackageAlias } from '../data/suggestions';
import type { AppSuggestion, InstalledApp } from '../types/launcher';

interface LivePlatformsViewProps {
  allApps: InstalledApp[];
  series: AppSuggestion[];
  isLoading: boolean;
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
    <div className="flex-1 overflow-y-auto no-scrollbar px-12 pt-4 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-white">
            En vivo y emisiones de hoy
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Catálogo actualizado del día, separado por aplicación para abrirlo directo en tu TV
          </p>
        </div>

        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="live-refresh-btn"
          onClick={onRefreshFeed}
          className="tv-focusable inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-zinc-900/8 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar catálogo</span>
        </button>
      </div>

      {/* Selector por plataforma sin mezclar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
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
              className={`tv-focusable px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'bg-zinc-900/6 dark:bg-white/8 text-zinc-600 dark:text-zinc-300'
              } focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:scale-105`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-zinc-900/8 dark:border-white/10">
          <Tv className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
          <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">
            No hay emisiones cargadas para esta plataforma hoy.
          </p>
          <button
            type="button"
            data-tv-focusable="true"
            data-tv-id="live-show-all"
            onClick={() => setSelectedPlatform('all')}
            className="tv-focusable mt-4 px-5 py-2 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold focus:scale-105"
          >
            Ver todas las plataformas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredItems.map((item) => {
            const resolvedPkg = resolvePackageAlias(item.packageName, allApps);
            return (
              <motion.button
                key={item.id}
                type="button"
                data-tv-focusable="true"
                data-tv-id={`live-card-${item.id}`}
                onClick={() => onLaunchSuggestion({ ...item, packageName: resolvedPkg })}
                whileFocus={{ scale: 1.04 }}
                className="tv-focusable group text-left rounded-2xl focus:outline-none"
              >
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 border-2 border-transparent group-focus:border-zinc-900 dark:group-focus:border-white shadow-lg transition-colors">
                  {item.posterUrl && !failedUrls[item.posterUrl] ? (
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      onError={() => markFailed(item.posterUrl)}
                      className="w-full h-full object-cover"
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
                  <span className="opacity-0 group-focus:opacity-100 transition-opacity absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/75 text-white flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>

                <div className="mt-2.5 px-0.5">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {item.tag} · {item.subtitle}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
