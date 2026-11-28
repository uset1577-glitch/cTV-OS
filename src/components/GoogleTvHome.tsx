import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppWindow,
  LayoutGrid,
  Play,
  ShieldAlert,
} from 'lucide-react';
import {
  deduplicateCatalog,
  filterSeriesByPlatform,
  getActiveStreamingPlatforms,
  resolvePackageAlias,
} from '../data/suggestions';
import type {
  AppSuggestion,
  GoogleTvLiveCatalog,
  InstalledApp,
  LauncherRemoteStatus,
} from '../types/launcher';

interface StreamingFilterOption {
  id: string;
  label: string;
}

interface GoogleTvHomeProps {
  allApps: InstalledApp[];
  favoriteApps: InstalledApp[];
  favoritePackages?: string[];
  liveCatalog: GoogleTvLiveCatalog;
  isNative: boolean;
  showSuggestions: boolean;
  appsOnlyMode?: boolean;
  maintenanceNotice?: LauncherRemoteStatus | null;
  heroFadeColor: string;
  onScrollTopChange: (atTop: boolean) => void;
  onLaunchApp: (app: InstalledApp) => void;
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
  onToggleFavorite: (app: InstalledApp) => void;
  onOpenAllApps: () => void;
  onOpenMaintenanceInfo?: () => void;
  onRefreshCatalog?: () => void;
}

const HeroBackdropImage = memo(function HeroBackdropImage({
  backdropUrl,
  accentGradient,
}: {
  backdropUrl?: string;
  accentGradient?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(backdropUrl && failedUrl !== backdropUrl);

  return (
    <div
      className="w-full h-full"
      style={{ background: accentGradient || 'linear-gradient(135deg, #141923 0%, #273244 100%)' }}
    >
      {showImage && (
        <img
          src={backdropUrl}
          alt=""
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(backdropUrl || null)}
          className="w-full h-full object-cover object-center"
        />
      )}
    </div>
  );
});

const HeroLogoOrTitle = memo(function HeroLogoOrTitle({
  logoUrl,
  title,
}: {
  logoUrl?: string;
  title: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showLogo = Boolean(logoUrl && failedUrl !== logoUrl);

  if (showLogo) {
    return (
      <img
        src={logoUrl}
        alt={title}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(logoUrl || null)}
        className="max-h-14 lg:max-h-20 w-auto object-contain object-left mb-1"
      />
    );
  }

  return (
    <h1 className="font-display text-3xl lg:text-5xl font-bold tracking-tight text-white text-balance line-clamp-2 [text-shadow:0_2px_6px_rgba(0,0,0,0.75)]">
      {title}
    </h1>
  );
});

const CircularAppShortcut = memo(function CircularAppShortcut({
  app,
  isInitial = false,
  onLaunch,
}: {
  app: InstalledApp;
  isInitial?: boolean;
  onLaunch: (app: InstalledApp) => void;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      type="button"
      data-tv-focusable="true"
      data-tv-supports-longpress="true"
      data-tv-initial={isInitial ? 'true' : undefined}
      data-tv-id={`row-app-${app.packageName}`}
      data-tv-pkg={app.packageName}
      onClick={() => onLaunch(app)}
      className="group w-[108px] shrink-0 flex flex-col items-center gap-2 py-2 focus:outline-none"
    >
      <div
        data-tv-focus-box="true"
        className="tv-focusable w-[84px] h-[84px] lg:w-[88px] lg:h-[88px] rounded-[22px] overflow-hidden bg-slate-200/85 dark:bg-zinc-800/90 border-2 border-white/25 group-focus:scale-110 group-focus:border-amber-400 dark:group-focus:border-white p-1.5 flex items-center justify-center shadow-sm"
      >
        {app.icon && !imgErr ? (
          <img
            src={app.icon}
            alt={app.name}
            width={88}
            height={88}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
            className="w-full h-full object-contain rounded-[16px]"
          />
        ) : (
          <AppWindow className="w-8 h-8 text-slate-400" />
        )}
      </div>

      <span className="apps-label w-full text-[13px] font-medium truncate text-center leading-tight text-slate-800 dark:text-zinc-200 group-focus:font-bold">
        {app.name}
      </span>
    </button>
  );
});

const AppsOnlyGridTile = memo(function AppsOnlyGridTile({
  app,
  onLaunch,
}: {
  app: InstalledApp;
  onLaunch: (app: InstalledApp) => void;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      type="button"
      data-tv-focusable="true"
      data-tv-supports-longpress="true"
      data-tv-id={`apps-only-${app.packageName}`}
      data-tv-pkg={app.packageName}
      onClick={() => onLaunch(app)}
      className="tv-focusable group rounded-2xl bg-[#EEF2F7]/85 dark:bg-white/[0.06] border border-slate-900/10 dark:border-white/10 p-3.5 flex flex-col items-center gap-2.5 text-center focus:bg-[#18202C] focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:border-amber-500 focus:scale-[1.05] shadow-sm"
    >
      <div
        data-tv-focus-box="true"
        className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200/85 dark:bg-zinc-800/90 p-1.5 flex items-center justify-center shrink-0"
      >
        {app.icon && !imgErr ? (
          <img
            src={app.icon}
            alt={app.name}
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
            className="w-full h-full object-contain rounded-[10px]"
          />
        ) : (
          <AppWindow className="w-7 h-7 text-slate-400" />
        )}
      </div>
      <span className="w-full text-[13px] font-semibold truncate text-slate-900 dark:text-zinc-100 group-focus:text-white dark:group-focus:text-zinc-950">
        {app.name}
      </span>
    </button>
  );
});

const MoviePosterCard = memo(function MoviePosterCard({
  movie,
  eager,
  onLaunchSuggestion,
}: {
  movie: AppSuggestion;
  eager: boolean;
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      type="button"
      data-tv-focusable="true"
      data-tv-id={`movie-${movie.id}`}
      onClick={() => onLaunchSuggestion(movie)}
      className="group w-[152px] shrink-0 text-left focus:outline-none"
    >
      <div
        data-tv-focus-box="true"
        style={{ background: movie.accentGradient }}
        className="tv-focusable relative w-[152px] h-[228px] rounded-2xl overflow-hidden bg-slate-300 dark:bg-zinc-900 border-2 border-transparent group-focus:border-amber-500 dark:group-focus:border-white group-focus:scale-[1.06]"
      >
        {movie.posterUrl && !imgErr ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            width={152}
            height={228}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-end p-3.5">
            <span className="font-display text-sm font-bold text-white line-clamp-3">
              {movie.title}
            </span>
          </div>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <div className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
          {movie.title}
        </div>
        <div className="text-[11px] text-slate-600 dark:text-zinc-400 truncate mt-0.5 tabular-nums">
          {[movie.appName, movie.releaseDate, movie.genre || movie.tag]
            .filter(Boolean)
            .slice(0, 2)
            .join(' · ')}
        </div>
      </div>
    </button>
  );
});

const SeriesLandscapeCard = memo(function SeriesLandscapeCard({
  show,
  eager,
  onLaunchSuggestion,
}: {
  show: AppSuggestion;
  eager: boolean;
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const landscapeImage = show.backdropUrl || show.posterUrl;

  return (
    <button
      type="button"
      data-tv-focusable="true"
      data-tv-id={`series-${show.id}`}
      onClick={() => onLaunchSuggestion(show)}
      className="group w-[248px] shrink-0 text-left focus:outline-none"
    >
      <div
        data-tv-focus-box="true"
        style={{ background: show.accentGradient }}
        className="tv-focusable relative w-[248px] h-[140px] rounded-2xl overflow-hidden bg-slate-300 dark:bg-zinc-900 border-2 border-transparent group-focus:border-amber-500 dark:group-focus:border-white group-focus:scale-[1.05]"
      >
        {landscapeImage && !imgErr ? (
          <img
            src={landscapeImage}
            alt={show.title}
            width={248}
            height={140}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full flex items-end p-3.5">
            <span className="font-display text-sm font-bold text-white line-clamp-2">
              {show.title}
            </span>
          </div>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        <div className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
          {show.title}
        </div>
        <div className="text-[11px] text-slate-600 dark:text-zinc-400 truncate mt-0.5">
          {show.appName || show.tag} · {show.subtitle}
        </div>
      </div>
    </button>
  );
});

const MoviesSection = memo(function MoviesSection({
  movies,
  formattedUpdatedTime,
  onLaunchSuggestion,
}: {
  movies: AppSuggestion[];
  formattedUpdatedTime: string;
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
}) {
  const visibleMovies = useMemo(() => movies.slice(0, 14), [movies]);
  if (visibleMovies.length === 0) return null;

  return (
    <section className="tv-row-offscreen" aria-label="Estrenos y películas populares">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Estrenos y películas populares
        </h2>
        <span className="text-xs text-slate-600 dark:text-zinc-400">
          Actualizado hoy · {formattedUpdatedTime}
        </span>
      </div>

      <div
        data-tv-row="movies"
        className="flex items-start gap-4 overflow-x-auto no-scrollbar py-3.5 px-3 -mx-3"
      >
        {visibleMovies.map((movie, index) => (
          <MoviePosterCard
            key={movie.id}
            movie={movie}
            eager={index < 7}
            onLaunchSuggestion={onLaunchSuggestion}
          />
        ))}
      </div>
    </section>
  );
});

const SeriesSection = memo(function SeriesSection({
  filteredSeries,
  streamingFilters,
  platformFilter,
  onSelectFilter,
  onLaunchSuggestion,
}: {
  filteredSeries: AppSuggestion[];
  streamingFilters: StreamingFilterOption[];
  platformFilter: string;
  onSelectFilter: (id: string) => void;
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
}) {
  if (filteredSeries.length === 0 && platformFilter === 'all') return null;

  return (
    <section className="tv-row-offscreen" aria-label="En tus plataformas">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Series y emisiones en tus plataformas
        </h2>

        <div
          data-tv-row="series-filters"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1"
        >
          {streamingFilters.map((f) => {
            const active = platformFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                data-tv-focusable="true"
                data-tv-id={`home-plat-${f.id}`}
                onClick={() => onSelectFilter(f.id)}
                className={`tv-focusable px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#18202C] text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                    : 'bg-slate-900/10 dark:bg-white/10 text-slate-700 dark:text-zinc-300'
                } focus:scale-105`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        data-tv-row="series"
        className="flex items-start gap-4 overflow-x-auto no-scrollbar py-3.5 px-3 -mx-3"
      >
        {filteredSeries.length === 0 ? (
          <button
            type="button"
            data-tv-focusable="true"
            data-tv-id="series-reset-filter"
            onClick={() => onSelectFilter('all')}
            className="tv-focusable px-5 py-3.5 rounded-2xl bg-slate-900/10 dark:bg-white/10 text-sm font-semibold text-slate-800 dark:text-zinc-200 focus:bg-[#18202C] focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
          >
            Sin emisiones para esta plataforma · Ver todas
          </button>
        ) : (
          filteredSeries.map((show, index) => (
            <SeriesLandscapeCard
              key={show.id}
              show={show}
              eager={index < 6}
              onLaunchSuggestion={onLaunchSuggestion}
            />
          ))
        )}
      </div>
    </section>
  );
});

export const GoogleTvHome = memo(function GoogleTvHome({
  allApps,
  favoriteApps,
  favoritePackages = [],
  liveCatalog,
  isNative,
  showSuggestions,
  appsOnlyMode = false,
  maintenanceNotice = null,
  heroFadeColor,
  onScrollTopChange,
  onLaunchApp,
  onLaunchSuggestion,
  onToggleFavorite,
  onOpenAllApps,
  onOpenMaintenanceInfo,
}: GoogleTvHomeProps) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const backdropLayerRef = useRef<HTMLDivElement | null>(null);
  const heroBannerRef = useRef<HTMLElement | null>(null);
  const fadeVeilRef = useRef<HTMLDivElement | null>(null);
  const appsSectionRef = useRef<HTMLElement | null>(null);
  const appsRowRef = useRef<HTMLDivElement | null>(null);
  const appsGridRef = useRef<HTMLDivElement | null>(null);
  const atTopRef = useRef(true);
  const appsOverHeroRef = useRef(true);
  const maxTopRef = useRef<number>(0);
  const heroAnimRafRef = useRef<number>(0);
  const heroAnimLastTimeRef = useRef<number>(0);
  const heroCollapseCurrentRef = useRef<number>(0);
  const heroCollapseTargetRef = useRef<number>(0);
  const rowMinProgressRef = useRef<number>(0);
  const hasActiveHeroRef = useRef<boolean>(false);

  // Fila de apps estilo Google TV: favoritos fijados y todas las apps instaladas
  const circularApps = useMemo(() => {
    const seen = new Set<string>();
    const result: InstalledApp[] = [];

    // 1. Apps marcadas como favoritas en el orden seleccionado
    for (const app of favoriteApps) {
      if (!seen.has(app.packageName)) {
        seen.add(app.packageName);
        result.push(app);
      }
    }

    // 2. Todas las demás aplicaciones disponibles e instaladas leídas del sistema
    for (const app of allApps) {
      if (!seen.has(app.packageName)) {
        seen.add(app.packageName);
        result.push(app);
      }
    }

    return result;
  }, [allApps, favoriteApps]);

  // Todas las apps ordenadas para la cuadrícula limpia de Modo Solo Apps
  const allAppsForGrid = useMemo(() => {
    const seen = new Set<string>();
    const combined: InstalledApp[] = [];
    for (const app of [...circularApps, ...allApps]) {
      if (!seen.has(app.packageName)) {
        seen.add(app.packageName);
        combined.push(app);
      }
    }
    return combined;
  }, [circularApps, allApps]);

  const appsByPackage = useMemo(() => {
    const map = new Map<string, InstalledApp>();
    for (const app of allAppsForGrid) {
      map.set(app.packageName, app);
    }
    return map;
  }, [allAppsForGrid]);

  const appsByPackageRef = useRef(appsByPackage);
  appsByPackageRef.current = appsByPackage;
  const onToggleFavoriteRef = useRef(onToggleFavorite);
  onToggleFavoriteRef.current = onToggleFavorite;

  // Delegación única de tv-longpress para evitar N listeners por tarjeta
  useEffect(() => {
    const handleDelegatedLongPress = (e: Event) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tv-pkg]');
      const pkg = target?.dataset.tvPkg;
      if (!pkg) return;
      const app = appsByPackageRef.current.get(pkg);
      if (app) {
        onToggleFavoriteRef.current(app);
      }
    };

    const rowEl = appsRowRef.current;
    const gridEl = appsGridRef.current;
    rowEl?.addEventListener('tv-longpress', handleDelegatedLongPress);
    gridEl?.addEventListener('tv-longpress', handleDelegatedLongPress);
    return () => {
      rowEl?.removeEventListener('tv-longpress', handleDelegatedLongPress);
      gridEl?.removeEventListener('tv-longpress', handleDelegatedLongPress);
    };
  }, [appsOnlyMode]);

  // Plataformas activas dinámicas según apps instaladas y fijadas en el launcher
  const streamingFilters = useMemo<StreamingFilterOption[]>(() => {
    const active = getActiveStreamingPlatforms(allApps, favoritePackages);
    return [
      { id: 'all', label: 'Todas' },
      ...active.map((p) => ({ id: p.packageName, label: p.appName })),
    ];
  }, [allApps, favoritePackages]);

  useEffect(() => {
    if (
      platformFilter !== 'all' &&
      !streamingFilters.some((f) => f.id === platformFilter)
    ) {
      setPlatformFilter('all');
    }
  }, [platformFilter, streamingFilters]);

  // Catálogo estrictamente deduplicado entre filas (Spotlight <-> Películas <-> Series)
  const dedupedCatalog = useMemo(
    () => deduplicateCatalog(liveCatalog, allApps, favoritePackages),
    [liveCatalog, allApps, favoritePackages]
  );

  const spotlightList = appsOnlyMode ? [] : dedupedCatalog.spotlight;
  const activeHero =
    !appsOnlyMode && spotlightList.length > 0
      ? spotlightList[heroIdx % spotlightList.length] || spotlightList[0]
      : undefined;

  const filteredSeries = useMemo(() => {
    if (appsOnlyMode) return [];
    if (platformFilter === 'all') {
      return dedupedCatalog.series.slice(0, 14);
    }
    return filterSeriesByPlatform(dedupedCatalog.series, platformFilter, allApps).slice(
      0,
      14
    );
  }, [appsOnlyMode, dedupedCatalog.series, platformFilter, allApps]);

  // Cambio instantáneo en memoria sin disparar peticiones de red ni pausas al cambiar filtro
  const handleSelectPlatformFilter = useCallback((nextFilter: string) => {
    setPlatformFilter(nextFilter);
  }, []);

  useEffect(() => {
    if (appsOnlyMode || spotlightList.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % spotlightList.length);
    }, 10500);
    return () => window.clearInterval(timer);
  }, [appsOnlyMode, spotlightList.length]);

  hasActiveHeroRef.current = Boolean(activeHero);

  // Cachear maxTop fuera del evento onScroll para evitar forced reflows frame a frame
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measureMaxTop = () => {
      maxTopRef.current = Math.max(0, el.scrollHeight - el.clientHeight);
    };

    measureMaxTop();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measureMaxTop);
    ro.observe(el);
    return () => ro.disconnect();
  }, [appsOnlyMode, showSuggestions, dedupedCatalog.movies.length, filteredSeries.length]);

  useEffect(() => {
    if (appsOnlyMode) {
      rowMinProgressRef.current = 0;
      heroCollapseCurrentRef.current = 0;
      heroCollapseTargetRef.current = 0;
    }
  }, [appsOnlyMode]);

  useEffect(() => {
    return () => {
      if (heroAnimRafRef.current) {
        window.cancelAnimationFrame(heroAnimRafRef.current);
      }
    };
  }, []);

  const heroResolvedPkg = activeHero ? resolvePackageAlias(activeHero.packageName, allApps) : '';
  const heroMatchedApp = heroResolvedPkg
    ? allApps.find((a) => a.packageName === heroResolvedPkg)
    : undefined;
  const heroAppName = heroMatchedApp?.name || activeHero?.appName || 'App';

  const handleHeroLaunch = useCallback(() => {
    if (!activeHero) return;
    onLaunchSuggestion({ ...activeHero, packageName: heroResolvedPkg });
  }, [activeHero, heroResolvedPkg, onLaunchSuggestion]);


  const handleCircleLaunch = useCallback(
    (clicked: InstalledApp) => {
      onLaunchApp(clicked);
    },
    [onLaunchApp]
  );

  // Solo propiedades compositor (opacity, transform) sin toggling de visibility ni layout reads
  const applyHeroVisualProgress = useCallback((p: number) => {
    const clamped = Math.min(1, Math.max(0, p));

    if (backdropLayerRef.current) {
      backdropLayerRef.current.style.opacity = (1 - clamped).toFixed(3);
      backdropLayerRef.current.style.transform = `translate3d(0, ${(-clamped * 56).toFixed(1)}px, 0) scale(${(1 - clamped * 0.05).toFixed(4)})`;
    }

    if (heroBannerRef.current) {
      const fg = Math.min(1, clamped * 1.25);
      heroBannerRef.current.style.opacity = (1 - fg).toFixed(3);
      heroBannerRef.current.style.transform = `translate3d(0, ${(-fg * 38).toFixed(1)}px, 0) scale(${(1 - fg * 0.04).toFixed(4)})`;
    }

    if (fadeVeilRef.current) {
      fadeVeilRef.current.style.opacity = Math.min(1, clamped * 1.05).toFixed(3);
    }

    const overHero = Boolean(hasActiveHeroRef.current && clamped < 0.42);
    if (overHero !== appsOverHeroRef.current && appsSectionRef.current) {
      appsOverHeroRef.current = overHero;
      appsSectionRef.current.setAttribute('data-apps-over-hero', overHero ? 'true' : 'false');
    }
  }, []);

  const scheduleHeroCollapseUpdate = useCallback(
    (targetProgress: number) => {
      heroCollapseTargetRef.current = Math.min(1, Math.max(0, targetProgress));

      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        if (heroAnimRafRef.current) {
          window.cancelAnimationFrame(heroAnimRafRef.current);
          heroAnimRafRef.current = 0;
        }
        heroCollapseCurrentRef.current = heroCollapseTargetRef.current;
        applyHeroVisualProgress(heroCollapseCurrentRef.current);
        return;
      }

      if (heroAnimRafRef.current) return;
      heroAnimLastTimeRef.current = performance.now();

      const step = (now: number) => {
        const dt = Math.min(48, Math.max(4, now - heroAnimLastTimeRef.current));
        heroAnimLastTimeRef.current = now;
        const target = heroCollapseTargetRef.current;
        const curr = heroCollapseCurrentRef.current;
        const diff = target - curr;

        if (Math.abs(diff) < 0.008) {
          heroCollapseCurrentRef.current = target;
          applyHeroVisualProgress(target);
          heroAnimRafRef.current = 0;
          return;
        }

        const factor = 1 - Math.exp(-dt / 42);
        heroCollapseCurrentRef.current = curr + diff * factor;
        applyHeroVisualProgress(heroCollapseCurrentRef.current);
        heroAnimRafRef.current = window.requestAnimationFrame(step);
      };

      heroAnimRafRef.current = window.requestAnimationFrame(step);
    },
    [applyHeroVisualProgress]
  );

  // Sincronía directa 1:1 usando maxTop cacheado (cero forced reflow en scroll)
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const top = e.currentTarget.scrollTop;
      const atTop = top <= 18;
      if (atTop !== atTopRef.current) {
        atTopRef.current = atTop;
        onScrollTopChange(atTop);
      }

      if (!appsOnlyMode) {
        const maxTop = maxTopRef.current;
        if (maxTop >= 120) {
          if (heroAnimRafRef.current) {
            window.cancelAnimationFrame(heroAnimRafRef.current);
            heroAnimRafRef.current = 0;
          }
          const span = Math.min(300, Math.max(160, maxTop * 0.8));
          const scrollProgress = Math.min(1, Math.max(0, (top - 24) / span));
          heroCollapseCurrentRef.current = scrollProgress;
          heroCollapseTargetRef.current = scrollProgress;
          applyHeroVisualProgress(scrollProgress);
        } else {
          const scrollProgress = Math.min(1, Math.max(0, (top - 24) / 340));
          scheduleHeroCollapseUpdate(Math.max(scrollProgress, rowMinProgressRef.current));
        }
      }
    },
    [appsOnlyMode, applyHeroVisualProgress, onScrollTopChange, scheduleHeroCollapseUpdate]
  );

  const handleFocusCapture = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (appsOnlyMode || maxTopRef.current >= 120) return;

      const rowEl = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tv-row]');
      const rowKey = rowEl?.dataset.tvRow;
      if (!rowKey) return;

      if (rowKey === 'hero' || rowKey === 'apps') {
        rowMinProgressRef.current = 0;
      } else if (rowKey === 'movies') {
        rowMinProgressRef.current = 0.72;
      } else if (rowKey === 'series-filters' || rowKey === 'series') {
        rowMinProgressRef.current = 1;
      }

      const top = scrollRef.current?.scrollTop ?? 0;
      const scrollProgress = Math.min(1, Math.max(0, (top - 24) / 340));
      scheduleHeroCollapseUpdate(Math.max(scrollProgress, rowMinProgressRef.current));
    },
    [appsOnlyMode, scheduleHeroCollapseUpdate]
  );

  const formattedUpdatedTime = useMemo(() => {
    try {
      const dt = new Date(liveCatalog.updatedAt);
      if (Number.isNaN(dt.getTime())) return 'Hoy';
      return dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Hoy';
    }
  }, [liveCatalog.updatedAt]);

  // MODO SOLO APPS: Sin recomendaciones ni fondos pesados, máxima fluidez en TV
  if (appsOnlyMode) {
    const isMaintenance = Boolean(maintenanceNotice?.maintenanceMode);
    return (
      <div
        ref={scrollRef}
        data-tv-scroll-container="true"
        data-tv-has-topbar="true"
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto no-scrollbar pb-14 pt-24 px-12 space-y-7"
      >
        {isMaintenance && (
          <div
            data-tv-row="maintenance-banner"
            data-tv-scroll-top="true"
            className="rounded-2xl bg-[#EEF2F7] dark:bg-white/[0.07] border border-amber-500/40 px-5 py-4 flex items-center justify-between gap-6"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {maintenanceNotice?.title || 'Mantenimiento · Próxima actualización'}
                </div>
                <div className="text-xs text-slate-600 dark:text-zinc-300 truncate mt-0.5">
                  El modo solo apps está activado ·{' '}
                  {maintenanceNotice?.message ||
                    'Preparando la próxima actualización de VORA TV OS.'}
                </div>
              </div>
            </div>
            {onOpenMaintenanceInfo && (
              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="home-maintenance-info"
                onClick={onOpenMaintenanceInfo}
                className="tv-focusable px-4 py-2 rounded-full bg-amber-500 text-zinc-950 text-xs font-bold whitespace-nowrap shrink-0 focus:bg-[#18202C] focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
              >
                Ver aviso
              </button>
            )}
          </div>
        )}

        {/* Fila rápida de favoritas */}
        <section aria-label="Tus aplicaciones fijadas" data-apps-over-hero="false">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Modo solo apps
              </h1>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                Acceso directo a tus aplicaciones · Mantén pulsado OK con el mando para fijar favoritas
              </p>
            </div>
          </div>

          <div
            ref={appsRowRef}
            data-tv-row="apps"
            data-tv-scroll-top="true"
            className="flex items-start gap-4 overflow-x-auto no-scrollbar py-3 px-3 -mx-3"
          >
            {circularApps.map((app, index) => (
              <CircularAppShortcut
                key={app.packageName}
                app={app}
                isInitial={index === 0}
                onLaunch={handleCircleLaunch}
              />
            ))}

            <button
              type="button"
              data-tv-focusable="true"
              data-tv-id="row-all-apps"
              onClick={onOpenAllApps}
              className="group w-[108px] shrink-0 flex flex-col items-center gap-2 py-2 focus:outline-none scroll-my-12"
            >
              <div
                data-tv-focus-box="true"
                className="apps-all-circle tv-focusable w-[84px] h-[84px] lg:w-[88px] lg:h-[88px] rounded-[22px] border-2 bg-slate-900/10 dark:bg-white/10 border-slate-900/12 dark:border-white/15 text-slate-700 dark:text-zinc-200 group-focus:scale-110 group-focus:border-amber-400 dark:group-focus:border-white group-focus:bg-[#18202C] group-focus:text-white dark:group-focus:bg-white dark:group-focus:text-zinc-950 flex items-center justify-center shadow-md"
              >
                <LayoutGrid className="w-7 h-7" />
              </div>
              <span className="apps-label w-full text-[13px] font-medium truncate text-center leading-tight text-slate-800 dark:text-zinc-200 group-focus:font-bold">
                Ver todas
              </span>
            </button>
          </div>
        </section>

        {/* Cuadrícula completa de aplicaciones instaladas */}
        <section aria-label="Todas tus aplicaciones">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Todas tus aplicaciones ({allAppsForGrid.length})
            </h2>
          </div>

          <div
            ref={appsGridRef}
            data-tv-row="apps-only-grid"
            data-tv-row-type="grid"
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4"
          >
            {allAppsForGrid.map((app) => (
              <AppsOnlyGridTile
                key={app.packageName}
                app={app}
                onLaunch={handleCircleLaunch}
              />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      data-tv-scroll-container="true"
      data-tv-has-topbar="true"
      onScroll={handleScroll}
      onFocusCapture={handleFocusCapture}
      data-tv-native={isNative ? 'true' : 'false'}
      className="relative flex-1 overflow-y-auto no-scrollbar pb-14"
    >
      {/* Fondo ambiental a PANTALLA COMPLETA optimizado por GPU (solo opacity y transform) */}
      {activeHero && (
        <div
          aria-hidden="true"
          className="sticky top-0 left-0 right-0 h-screen w-full -mb-[100vh] pointer-events-none overflow-hidden z-0 bg-[#0E1015] contain-layout"
        >
          <div
            ref={backdropLayerRef}
            className="absolute inset-0 will-change-[opacity,transform] origin-top"
          >
            <HeroBackdropImage
              backdropUrl={activeHero.backdropUrl}
              accentGradient={activeHero.accentGradient}
            />

            {/* Difuminado ligero superior para la barra flotante */}
            <div
              className="absolute inset-x-0 top-0 h-24"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(8, 11, 18, 0.58) 0%, rgba(8, 11, 18, 0.2) 55%, transparent 100%)',
              }}
            />

            {/* Difuminado izquierdo sutil detrás del título */}
            <div
              className="absolute inset-y-0 left-0 w-[50%]"
              style={{
                background:
                  'linear-gradient(to right, rgba(8, 11, 18, 0.72) 0%, rgba(8, 11, 18, 0.28) 55%, transparent 100%)',
              }}
            />

            {/* Difuminado inferior mínimo al estar arriba */}
            <div
              className="absolute inset-x-0 bottom-0 h-28"
              style={{
                background:
                  'linear-gradient(to top, rgba(8, 11, 18, 0.68) 0%, rgba(8, 11, 18, 0.22) 52%, transparent 100%)',
              }}
            />
          </div>

          {/* Velo progresivo al hacer scroll */}
          <div
            ref={fadeVeilRef}
            className="absolute inset-0 will-change-[opacity]"
            style={{ backgroundColor: heroFadeColor, opacity: 0 }}
          />
        </div>
      )}

      {/* Primer plano: Hero + Fila de Aplicaciones */}
      <div
        className={`relative z-10 px-12 ${
          activeHero
            ? showSuggestions && dedupedCatalog.movies.length > 0
              ? 'min-h-[86vh] flex flex-col justify-end gap-5 pt-20 pb-5'
              : 'min-h-screen flex flex-col justify-end gap-5 pt-20 pb-6'
            : 'pt-24 space-y-8'
        }`}
      >
        {/* 1. Contenido de recomendaciones Hero */}
        {activeHero && (
          <section
            ref={heroBannerRef}
            aria-label="Destacado de hoy"
            data-tv-row="hero"
            data-tv-scroll-top="true"
            tabIndex={0}
            onKeyDown={(e) => {
              if (spotlightList.length > 1) {
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setHeroIdx((prev) => (prev - 1 + spotlightList.length) % spotlightList.length);
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setHeroIdx((prev) => (prev + 1) % spotlightList.length);
                }
              }
            }}
            className="flex items-end justify-between gap-8 max-w-full scroll-mt-24 will-change-[opacity,transform] origin-top-left outline-none"
          >
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-200/90 mb-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                <span className="font-semibold text-white">{heroAppName}</span>
                {(activeHero.genre || (activeHero.tag && activeHero.tag !== heroAppName)) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{activeHero.genre || activeHero.tag}</span>
                  </>
                )}
                {activeHero.releaseDate && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{activeHero.releaseDate}</span>
                  </>
                )}
                {activeHero.imdbRating && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums text-amber-400 font-semibold">
                      ★ {activeHero.imdbRating}
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>Actualizado {formattedUpdatedTime}</span>
              </div>

              <div>
                <HeroLogoOrTitle logoUrl={activeHero.logoUrl} title={activeHero.title} />
                <p className="mt-1.5 text-sm lg:text-base text-zinc-100/95 line-clamp-2 max-w-xl leading-relaxed [text-shadow:0_1px_4px_rgba(0,0,0,0.85)]">
                  {activeHero.subtitle}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="hero-primary-cta"
                  onClick={handleHeroLaunch}
                  className="tv-focusable inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-zinc-950 text-sm font-bold focus:bg-amber-400 focus:text-zinc-950 focus:scale-105 whitespace-nowrap shrink-0 shadow-md"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Ver en {heroAppName}</span>
                </button>

              </div>
            </div>
          </section>
        )}

        {/* 2. Fila distintiva Google TV: "Tus aplicaciones" */}
        <section
          ref={appsSectionRef}
          data-apps-over-hero={activeHero ? 'true' : 'false'}
          aria-label="Tus aplicaciones"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="apps-heading font-display text-lg font-semibold text-slate-900 dark:text-white">
              Tus aplicaciones
            </h2>
            <span className="apps-hint text-xs text-slate-600 dark:text-zinc-400">
              Mantén pulsado OK con el mando para fijar o quitar de esta fila
            </span>
          </div>

          <div
            ref={appsRowRef}
            data-tv-row="apps"
            data-tv-scroll-top="true"
            className="flex items-start gap-4 overflow-x-auto no-scrollbar py-2.5 px-3 -mx-3"
          >
            {circularApps.map((app, index) => (
              <CircularAppShortcut
                key={app.packageName}
                app={app}
                isInitial={index === 0}
                onLaunch={handleCircleLaunch}
              />
            ))}

            <button
              type="button"
              data-tv-focusable="true"
              data-tv-id="row-all-apps"
              onClick={onOpenAllApps}
              className="group w-[108px] shrink-0 flex flex-col items-center gap-2 py-2 focus:outline-none scroll-my-12"
            >
              <div
                data-tv-focus-box="true"
                className="apps-all-circle tv-focusable w-[84px] h-[84px] lg:w-[88px] lg:h-[88px] rounded-[22px] border-2 bg-slate-900/10 dark:bg-white/10 border-slate-900/12 dark:border-white/15 text-slate-700 dark:text-zinc-200 group-focus:scale-110 group-focus:border-amber-400 dark:group-focus:border-white group-focus:bg-[#18202C] group-focus:text-white dark:group-focus:bg-white dark:group-focus:text-zinc-950 flex items-center justify-center shadow-md"
              >
                <LayoutGrid className="w-7 h-7" />
              </div>
              <span className="apps-label w-full text-[13px] font-medium truncate text-center leading-tight text-slate-800 dark:text-zinc-200 group-focus:font-bold">
                Ver todas
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* Filas inferiores con memoización por tarjeta e imágenes ligeras */}
      <div className="relative z-10 px-12 pt-4 space-y-8">
        {showSuggestions && (
          <MoviesSection
            movies={dedupedCatalog.movies}
            formattedUpdatedTime={formattedUpdatedTime}
            onLaunchSuggestion={onLaunchSuggestion}
          />
        )}

        {showSuggestions && (
          <SeriesSection
            filteredSeries={filteredSeries}
            streamingFilters={streamingFilters}
            platformFilter={platformFilter}
            onSelectFilter={handleSelectPlatformFilter}
            onLaunchSuggestion={onLaunchSuggestion}
          />
        )}
      </div>
    </div>
  );
});
