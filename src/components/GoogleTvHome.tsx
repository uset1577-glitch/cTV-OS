import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AppWindow,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Play,
  RefreshCw,
} from 'lucide-react';
import { FEATURED_GAME } from '../data/presets';
import { resolvePackageAlias } from '../data/suggestions';
import type { AppSuggestion, GoogleTvLiveCatalog, InstalledApp } from '../types/launcher';

interface GoogleTvHomeProps {
  allApps: InstalledApp[];
  favoriteApps: InstalledApp[];
  liveCatalog: GoogleTvLiveCatalog;
  isLoadingCatalog: boolean;
  isNative: boolean;
  showSuggestions: boolean;
  onRefreshCatalog: () => void;
  onLaunchFeatured: () => void;
  onLaunchApp: (app: InstalledApp) => void;
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
  onToggleFavorite: (app: InstalledApp) => void;
  onOpenAllApps: () => void;
}

const STREAMING_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'com.netflix.ninja', label: 'Netflix' },
  { id: 'com.wbd.stream', label: 'Max' },
  { id: 'com.amazon.amazonvideo.livingroom', label: 'Prime Video' },
  { id: 'com.disney.disneyplus', label: 'Disney+' },
  { id: 'com.google.android.youtube.tv', label: 'YouTube' },
];

function CircularAppShortcut({
  app,
  isInitial = false,
  onLaunch,
  onToggleFavorite,
}: {
  app: InstalledApp;
  isInitial?: boolean;
  onLaunch: (app: InstalledApp) => void;
  onToggleFavorite: (app: InstalledApp) => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => onToggleFavorite(app);
    el.addEventListener('tv-longpress', handler);
    return () => el.removeEventListener('tv-longpress', handler);
  }, [app, onToggleFavorite]);

  return (
    <button
      ref={ref}
      type="button"
      data-tv-focusable="true"
      data-tv-supports-longpress="true"
      data-tv-initial={isInitial ? 'true' : undefined}
      data-tv-id={`row-app-${app.packageName}`}
      onClick={() => onLaunch(app)}
      className="tv-focusable group w-[108px] shrink-0 flex flex-col items-center gap-2.5 py-2 focus:outline-none"
    >
      <div className="w-[84px] h-[84px] rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 border-2 border-zinc-900/10 dark:border-white/15 group-focus:scale-110 group-focus:border-zinc-900 dark:group-focus:border-white group-focus:ring-4 group-focus:ring-zinc-900/20 dark:group-focus:ring-white/25 transition-transform duration-150 flex items-center justify-center shadow-md">
        {app.icon && !imgErr ? (
          <img
            src={app.icon}
            alt={app.name}
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <AppWindow className="w-8 h-8 text-zinc-400" />
        )}
      </div>

      <span className="w-full text-[13px] font-medium text-zinc-700 dark:text-zinc-300 group-focus:text-zinc-950 dark:group-focus:text-white group-focus:font-semibold truncate text-center leading-tight">
        {app.name}
      </span>
    </button>
  );
}

export function GoogleTvHome({
  allApps,
  favoriteApps,
  liveCatalog,
  isLoadingCatalog,
  isNative,
  showSuggestions,
  onRefreshCatalog,
  onLaunchFeatured,
  onLaunchApp,
  onLaunchSuggestion,
  onToggleFavorite,
  onOpenAllApps,
}: GoogleTvHomeProps) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const markImageFailed = (url: string) => {
    setFailedImages((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

  // Lista circular de apps estilo Google TV 2025 (CgamesTVPARTY primero + favoritos)
  const circularApps = useMemo(() => {
    const featuredFromList = allApps.find((a) => a.packageName === FEATURED_GAME.packageName);
    const featuredItem: InstalledApp = featuredFromList || {
      packageName: FEATURED_GAME.packageName,
      name: FEATURED_GAME.name,
      icon: '',
      isLeanback: true,
      isSystemApp: false,
      category: 'games',
    };

    const rest = favoriteApps.filter((a) => a.packageName !== FEATURED_GAME.packageName);
    return [featuredItem, ...rest];
  }, [allApps, favoriteApps]);

  const spotlightList = liveCatalog.spotlight;
  const activeHero = spotlightList[heroIdx % Math.max(1, spotlightList.length)] || spotlightList[0];

  const filteredSeries = useMemo(() => {
    if (platformFilter === 'all') return liveCatalog.series.slice(0, 14);
    return liveCatalog.series.filter((s) => s.packageName === platformFilter).slice(0, 14);
  }, [liveCatalog.series, platformFilter]);

  useEffect(() => {
    if (spotlightList.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % spotlightList.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [spotlightList.length]);

  const handleHeroLaunch = () => {
    if (!activeHero) return;
    if (activeHero.packageName === FEATURED_GAME.packageName) {
      onLaunchFeatured();
      return;
    }
    const resolvedPkg = resolvePackageAlias(activeHero.packageName, allApps);
    onLaunchSuggestion({ ...activeHero, packageName: resolvedPkg });
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-12 pb-12 space-y-8">
      {/* 1. Hero Spotlight Google TV 2025 (con cartelera real actual, sin imágenes IA) */}
      {activeHero && (
        <section
          aria-label="Destacado de hoy"
          className="relative w-full h-[290px] lg:h-[320px] rounded-3xl overflow-hidden border border-zinc-900/10 dark:border-white/10 bg-white dark:bg-[#141720]"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeHero.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              {activeHero.backdropUrl && !failedImages[activeHero.backdropUrl] ? (
                <img
                  src={activeHero.backdropUrl}
                  alt={activeHero.title}
                  referrerPolicy="no-referrer"
                  onError={() => markImageFailed(activeHero.backdropUrl!)}
                  className="absolute right-0 top-0 h-full w-[58%] object-cover object-center"
                />
              ) : (
                <div
                  className="absolute right-0 top-0 h-full w-[65%]"
                  style={{ background: activeHero.accentGradient }}
                />
              )}

              {/* Scrim cinemático Google TV para contraste limpio */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/92 to-white/10 dark:from-[#12151E] dark:via-[#12151E]/90 dark:to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-transparent dark:from-[#12151E]/75 dark:via-transparent dark:to-transparent" />
            </motion.div>
          </AnimatePresence>

          <div className="relative z-10 h-full flex flex-col justify-between p-8 lg:p-10 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <span>{activeHero.tag}</span>
              {activeHero.releaseDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{activeHero.releaseDate}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>Cartelera actualizada</span>
            </div>

            <div>
              <h1 className="font-display text-3xl lg:text-5xl font-bold tracking-tight text-zinc-950 dark:text-white text-balance line-clamp-2">
                {activeHero.title}
              </h1>
              <p className="mt-2.5 text-sm lg:text-base text-zinc-700 dark:text-zinc-300 line-clamp-2 max-w-xl leading-relaxed">
                {activeHero.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="hero-primary-cta"
                onClick={handleHeroLaunch}
                className="tv-focusable inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:scale-105 whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {activeHero.packageName === FEATURED_GAME.packageName
                    ? 'Jugar ahora'
                    : isNative
                      ? 'Ver en YouTube TV'
                      : 'Explorar título'}
                </span>
              </button>

              {spotlightList.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id="hero-prev"
                    aria-label="Destacado anterior"
                    onClick={() =>
                      setHeroIdx((prev) => (prev - 1 + spotlightList.length) % spotlightList.length)
                    }
                    className="tv-focusable w-9 h-9 rounded-full bg-zinc-900/10 dark:bg-white/12 text-zinc-800 dark:text-white flex items-center justify-center focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id="hero-next"
                    aria-label="Siguiente destacado"
                    onClick={() => setHeroIdx((prev) => (prev + 1) % spotlightList.length)}
                    className="tv-focusable w-9 h-9 rounded-full bg-zinc-900/10 dark:bg-white/12 text-zinc-800 dark:text-white flex items-center justify-center focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Indicadores limpios del carrusel */}
          {spotlightList.length > 1 && (
            <div className="absolute bottom-6 right-8 z-10 flex items-center gap-1.5">
              {spotlightList.map((item, idx) => (
                <span
                  key={item.id}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === heroIdx % spotlightList.length
                      ? 'w-6 bg-zinc-900 dark:bg-white'
                      : 'w-1.5 bg-zinc-900/25 dark:bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. Fila distintiva Google TV 2025: "Tus aplicaciones" con ICONOS CIRCULARES */}
      <section aria-label="Tus aplicaciones">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
            Tus aplicaciones
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Mantén OK o pulsa M para fijar o quitar de esta fila
          </span>
        </div>

        <div className="flex items-start gap-4 overflow-x-auto no-scrollbar py-2 px-1 -mx-1">
          {circularApps.map((app, index) => (
            <CircularAppShortcut
              key={app.packageName}
              app={app}
              isInitial={index === 0}
              onLaunch={(clicked) =>
                clicked.packageName === FEATURED_GAME.packageName
                  ? onLaunchFeatured()
                  : onLaunchApp(clicked)
              }
              onToggleFavorite={onToggleFavorite}
            />
          ))}

          {/* Botón circular Ver todas */}
          <button
            type="button"
            data-tv-focusable="true"
            data-tv-id="row-all-apps"
            onClick={onOpenAllApps}
            className="tv-focusable group w-[108px] shrink-0 flex flex-col items-center gap-2.5 py-2 focus:outline-none"
          >
            <div className="w-[84px] h-[84px] rounded-full bg-zinc-200/80 dark:bg-white/10 border-2 border-zinc-900/10 dark:border-white/15 group-focus:scale-110 group-focus:border-zinc-900 dark:group-focus:border-white group-focus:bg-zinc-900 group-focus:text-white dark:group-focus:bg-white dark:group-focus:text-zinc-950 transition-transform duration-150 flex items-center justify-center text-zinc-700 dark:text-zinc-200">
              <LayoutGrid className="w-7 h-7" />
            </div>
            <span className="w-full text-[13px] font-medium text-zinc-700 dark:text-zinc-300 group-focus:text-zinc-950 dark:group-focus:text-white group-focus:font-semibold truncate text-center leading-tight">
              Ver todas
            </span>
          </button>
        </div>
      </section>

      {/* 3. Películas reales actuales (Cartelera 2025/2026 con pósters oficiales 2:3) */}
      {showSuggestions && liveCatalog.movies.length > 0 && (
        <section aria-label="Estrenos y películas populares">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
              Estrenos y películas populares
            </h2>
            <button
              type="button"
              data-tv-focusable="true"
              data-tv-id="home-refresh-movies"
              onClick={onRefreshCatalog}
              className="tv-focusable inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 px-3 py-1 rounded-full focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          <div className="flex items-start gap-4 overflow-x-auto no-scrollbar py-2 px-1 -mx-1">
            {liveCatalog.movies.slice(0, 16).map((movie) => {
              const resolvedPkg = resolvePackageAlias(movie.packageName, allApps);
              return (
                <button
                  key={movie.id}
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id={`movie-${movie.id}`}
                  onClick={() => onLaunchSuggestion({ ...movie, packageName: resolvedPkg })}
                  className="tv-focusable group w-[148px] shrink-0 text-left focus:outline-none"
                >
                  <div className="w-[148px] h-[222px] rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 border-2 border-transparent group-focus:border-zinc-900 dark:group-focus:border-white group-focus:scale-[1.06] transition-transform duration-150 shadow-md">
                    {movie.posterUrl && !failedImages[movie.posterUrl] ? (
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed(movie.posterUrl)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-end p-3"
                        style={{ background: movie.accentGradient }}
                      >
                        <span className="font-display text-sm font-bold text-white line-clamp-3">
                          {movie.title}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 px-0.5">
                    <div className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">
                      {movie.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {movie.genre || movie.tag}
                      {movie.releaseDate ? ` · ${movie.releaseDate}` : ''}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Series y programas de hoy organizados sin mezclar plataformas */}
      {showSuggestions && liveCatalog.series.length > 0 && (
        <section aria-label="En tus plataformas">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-white">
              Series y emisiones en tus plataformas
            </h2>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {STREAMING_FILTERS.map((f) => {
                const active = platformFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id={`home-plat-${f.id}`}
                    onClick={() => setPlatformFilter(f.id)}
                    className={`tv-focusable px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                        : 'bg-zinc-900/6 dark:bg-white/8 text-zinc-600 dark:text-zinc-300'
                    } focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-start gap-4 overflow-x-auto no-scrollbar py-2 px-1 -mx-1">
            {filteredSeries.map((show) => {
              const resolvedPkg = resolvePackageAlias(show.packageName, allApps);
              return (
                <button
                  key={show.id}
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id={`series-${show.id}`}
                  onClick={() => onLaunchSuggestion({ ...show, packageName: resolvedPkg })}
                  className="tv-focusable group w-[224px] shrink-0 text-left focus:outline-none"
                >
                  <div className="w-[224px] h-[128px] rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 border-2 border-transparent group-focus:border-zinc-900 dark:group-focus:border-white group-focus:scale-[1.05] transition-transform duration-150 shadow-md">
                    {show.posterUrl && !failedImages[show.posterUrl] ? (
                      <img
                        src={show.posterUrl}
                        alt={show.title}
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed(show.posterUrl)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-end p-3.5"
                        style={{ background: show.accentGradient }}
                      >
                        <span className="font-display text-sm font-bold text-white line-clamp-2">
                          {show.title}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 px-0.5">
                    <div className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">
                      {show.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {show.tag} · {show.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
