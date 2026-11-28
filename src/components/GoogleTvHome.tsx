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
import { getDateLocale, getTranslations, type LauncherTranslations } from '../i18n/translations';
import type {
  AppLanguage,
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
  language: AppLanguage;
  isNative: boolean;
  showSuggestions: boolean;
  appsOnlyMode?: boolean;
  oledMode?: boolean;
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

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
    const r = parseInt(clean.slice(1, 3), 16);
    const g = parseInt(clean.slice(3, 5), 16);
    const b = parseInt(clean.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return alpha >= 1 ? clean : `rgba(14, 16, 21, ${alpha})`;
}

const HeroBackdropImage = memo(function HeroBackdropImage({
  backdropUrl,
  accentGradient,
  oledMode = false,
}: {
  backdropUrl?: string;
  accentGradient?: string;
  oledMode?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(backdropUrl && failedUrl !== backdropUrl);

  return (
    <div
      className="relative w-full h-full"
      style={{
        background: oledMode
          ? '#000000'
          : accentGradient || 'linear-gradient(135deg, #141923 0%, #273244 100%)',
      }}
    >
      {showImage && (
        <>
          <img
            src={backdropUrl}
            alt=""
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(backdropUrl || null)}
            className="w-full h-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 48%, rgba(0, 0, 0, 0.72) 72%, #000 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 48%, rgba(0, 0, 0, 0.72) 72%, #000 100%)',
            }}
            className="absolute inset-0 pointer-events-none overflow-hidden"
          >
            <img
              src={backdropUrl}
              alt=""
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center blur-[3.5px] scale-[1.02]"
            />
          </div>
        </>
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
      data-tv-focus-wrapper="true"
      data-tv-supports-longpress="true"
      data-tv-initial={isInitial ? 'true' : undefined}
      data-tv-id={`row-app-${app.packageName}`}
      data-tv-pkg={app.packageName}
      onClick={() => onLaunch(app)}
      className="group w-[108px] shrink-0 flex flex-col items-center gap-2 py-2 focus:outline-none"
    >
      <div
        data-tv-focus-box="true"
        className="tv-focusable w-[84px] h-[84px] lg:w-[88px] lg:h-[88px] rounded-[22px] overflow-hidden bg-slate-200/85 dark:bg-zinc-800/90 border-2 border-white/30 group-focus:scale-110 group-focus:border-white p-1.5 flex items-center justify-center shadow-sm"
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
      className="tv-focusable group rounded-2xl bg-[#EEF2F7]/85 dark:bg-white/[0.06] border border-slate-900/10 dark:border-white/10 p-3.5 flex flex-col items-center gap-2.5 text-center focus:bg-[#18202C] focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.05] shadow-sm"
    >
      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200/85 dark:bg-zinc-800/90 p-1.5 flex items-center justify-center shrink-0">
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
      data-tv-focus-wrapper="true"
      data-tv-id={`movie-${movie.id}`}
      onClick={() => onLaunchSuggestion(movie)}
      className="tv-card-contain group w-[152px] shrink-0 text-left focus:outline-none"
    >
      <div
        data-tv-focus-box="true"
        style={{ background: movie.accentGradient }}
        className="tv-focusable transform-gpu relative w-[152px] h-[228px] rounded-2xl overflow-hidden bg-slate-300 dark:bg-zinc-900 border border-black/15 dark:border-white/15 group-focus:scale-[1.06]"
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
      data-tv-focus-wrapper="true"
      data-tv-id={`series-${show.id}`}
      onClick={() => onLaunchSuggestion(show)}
      className="tv-card-contain group w-[248px] shrink-0 text-left focus:outline-none"
    >
      <div
        data-tv-focus-box="true"
        style={{ background: show.accentGradient }}
        className="tv-focusable transform-gpu relative w-[248px] h-[140px] rounded-2xl overflow-hidden bg-slate-300 dark:bg-zinc-900 border border-black/15 dark:border-white/15 group-focus:scale-[1.05]"
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
  tHome,
  onLaunchSuggestion,
}: {
  movies: AppSuggestion[];
  formattedUpdatedTime: string;
  tHome: LauncherTranslations['home'];
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
}) {
  const visibleMovies = useMemo(() => movies.slice(0, 14), [movies]);
  if (visibleMovies.length === 0) return null;

  return (
    <section className="tv-row-offscreen" aria-label={tHome.moviesTitle}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          {tHome.moviesTitle}
        </h2>
        <span className="text-xs text-slate-600 dark:text-zinc-400">
          {tHome.updatedToday(formattedUpdatedTime)}
        </span>
      </div>

      <div
        data-tv-row="movies"
        className="flex items-start gap-4 overflow-x-auto no-scrollbar py-4 px-4 -mx-4"
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
  tHome,
  onSelectFilter,
  onLaunchSuggestion,
}: {
  filteredSeries: AppSuggestion[];
  streamingFilters: StreamingFilterOption[];
  platformFilter: string;
  tHome: LauncherTranslations['home'];
  onSelectFilter: (id: string) => void;
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
}) {
  if (filteredSeries.length === 0 && platformFilter === 'all') return null;

  return (
    <section className="tv-row-offscreen" aria-label={tHome.seriesSectionAria}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1.5">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          {tHome.seriesTitle}
        </h2>

        <div
          data-tv-row="series-filters"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2.5 px-3 -mx-3"
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
        className="flex items-start gap-4 overflow-x-auto no-scrollbar py-4 px-4 -mx-4"
      >
        {filteredSeries.length === 0 ? (
          <button
            type="button"
            data-tv-focusable="true"
            data-tv-id="series-reset-filter"
            onClick={() => onSelectFilter('all')}
            className="tv-focusable px-5 py-3.5 rounded-2xl bg-slate-900/10 dark:bg-white/10 text-sm font-semibold text-slate-800 dark:text-zinc-200 focus:bg-[#18202C] focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
          >
            {tHome.noSeriesForPlatform}
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
  language,
  isNative,
  showSuggestions,
  appsOnlyMode = false,
  oledMode = false,
  maintenanceNotice = null,
  heroFadeColor,
  onScrollTopChange,
  onLaunchApp,
  onLaunchSuggestion,
  onToggleFavorite,
  onOpenAllApps,
  onOpenMaintenanceInfo,
}: GoogleTvHomeProps) {
  const tHome = getTranslations(language).home;
  const [heroIdx, setHeroIdx] = useState(0);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const appsRowRef = useRef<HTMLDivElement | null>(null);
  const appsGridRef = useRef<HTMLDivElement | null>(null);
  const heroBgRef = useRef<HTMLDivElement | null>(null);
  const heroContentRef = useRef<HTMLElement | null>(null);
  const appsSectionRef = useRef<HTMLElement | null>(null);
  const lowerSectionRef = useRef<HTMLDivElement | null>(null);
  const topVeilRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number>(0);
  const atTopRef = useRef(true);
  const onScrollTopChangeRef = useRef(onScrollTopChange);
  onScrollTopChangeRef.current = onScrollTopChange;

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
      { id: 'all', label: tHome.allPlatformsShort },
      ...active.map((p) => ({ id: p.packageName, label: p.appName })),
    ];
  }, [allApps, favoritePackages, tHome.allPlatformsShort]);

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

  const hasMoviesBelow = Boolean(!appsOnlyMode && showSuggestions && dedupedCatalog.movies.length > 0);
  const hasActiveHero = Boolean(activeHero);

  // Listener pasivo nativo + fade GPU ligero (solo opacity y translate3d, cero blur/reflow)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const applyScrollVisuals = (top: number) => {
      if (topVeilRef.current) {
        const veilOpacity = Math.min(1, Math.max(0, top / 80));
        topVeilRef.current.style.opacity = veilOpacity.toFixed(3);
      }

      if (appsOnlyMode || !hasActiveHero) return;

      if (reducedMotion) {
        if (heroBgRef.current) {
          heroBgRef.current.style.opacity = '1';
        }
        if (heroContentRef.current) {
          heroContentRef.current.style.opacity = '1';
        }
        if (appsSectionRef.current) {
          appsSectionRef.current.style.opacity = '1';
        }
        if (lowerSectionRef.current) {
          lowerSectionRef.current.style.opacity = '1';
        }
        return;
      }

      if (heroBgRef.current) {
        heroBgRef.current.style.opacity = Math.max(0, 1 - top / 250).toFixed(3);
      }
      if (heroContentRef.current) {
        heroContentRef.current.style.opacity = Math.max(0, 1 - top / 180).toFixed(3);
      }
      if (appsSectionRef.current) {
        appsSectionRef.current.style.opacity = Math.max(0, 1 - top / 260).toFixed(3);
      }
      if (lowerSectionRef.current && hasMoviesBelow) {
        const reveal = 0.9 + Math.min(1, top / 90) * 0.1;
        lowerSectionRef.current.style.opacity = reveal.toFixed(3);
      }
    };

    const syncAtTop = () => {
      const top = el.scrollTop;
      const atTop = top <= 32;
      if (atTop !== atTopRef.current) {
        atTopRef.current = atTop;
        onScrollTopChangeRef.current(atTop);
      }
      return top;
    };

    const onNativeScroll = () => {
      syncAtTop();
      if (scrollRafRef.current) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = 0;
        if (el.isConnected) {
          applyScrollVisuals(el.scrollTop);
        }
      });
    };

    const initialTop = syncAtTop();
    applyScrollVisuals(initialTop);
    el.addEventListener('scroll', onNativeScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onNativeScroll);
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = 0;
      }
    };
  }, [appsOnlyMode, hasActiveHero, hasMoviesBelow]);

  // Pre-decodificar las primeras carátulas de Estrenos y Series en segundo plano
  // para que al bajar desde "Tus aplicaciones" aparezcan al instante sin pausas
  useEffect(() => {
    if (appsOnlyMode || !showSuggestions) return;
    const urls = [
      ...dedupedCatalog.movies.slice(0, 8).map((m) => m.posterUrl),
      ...filteredSeries.slice(0, 6).map((s) => s.backdropUrl || s.posterUrl),
    ].filter((u): u is string => Boolean(u));
    if (urls.length === 0) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      for (const src of urls) {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.decoding = 'async';
        img.src = src;
        if (typeof img.decode === 'function') {
          void img.decode().catch(() => {});
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [appsOnlyMode, showSuggestions, dedupedCatalog.movies, filteredSeries]);

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

  const formattedUpdatedTime = useMemo(() => {
    try {
      const dt = new Date(liveCatalog.updatedAt);
      if (Number.isNaN(dt.getTime())) return tHome.today;
      return dt.toLocaleTimeString(getDateLocale(language), { hour: '2-digit', minute: '2-digit' });
    } catch {
      return tHome.today;
    }
  }, [liveCatalog.updatedAt, language, tHome.today]);

  const topVeilGradient = useMemo(
    () =>
      `linear-gradient(to bottom, ${hexToRgba(heroFadeColor, 0.94)} 0%, ${hexToRgba(
        heroFadeColor,
        0.56
      )} 42%, ${hexToRgba(heroFadeColor, 0.16)} 76%, ${hexToRgba(heroFadeColor, 0)} 100%)`,
    [heroFadeColor]
  );

  // MODO SOLO APPS: Sin recomendaciones ni fondos pesados, máxima fluidez en TV
  if (appsOnlyMode) {
    const isMaintenance = Boolean(maintenanceNotice?.maintenanceMode);
    return (
      <div
        ref={scrollRef}
        data-tv-scroll-container="true"
        data-tv-has-topbar="true"
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
                    {maintenanceNotice?.title || tHome.maintenanceTitleFallback}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-zinc-300 truncate mt-0.5">
                    {tHome.maintenanceStatusPrefix}{' '}
                    {maintenanceNotice?.message || tHome.maintenanceMsgFallback}
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
                  {tHome.viewNotice}
                </button>
              )}
            </div>
          )}

          {/* Fila rápida de favoritas */}
          <section aria-label={tHome.appsOnlySectionAria} data-apps-over-hero="false">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {tHome.appsOnlyTitle}
                </h1>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
                  {tHome.appsOnlyHint}
                </p>
              </div>
            </div>

            <div
              ref={appsRowRef}
              data-tv-row="apps"
              data-tv-scroll-top="true"
              className="flex items-start gap-4 overflow-x-auto no-scrollbar py-4 px-4 -mx-4"
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
                data-tv-focus-wrapper="true"
                data-tv-id="row-all-apps"
                onClick={onOpenAllApps}
                className="group w-[108px] shrink-0 flex flex-col items-center gap-2 py-2 focus:outline-none scroll-my-12"
              >
                <div
                  data-tv-focus-box="true"
                  className="apps-all-circle tv-focusable w-[84px] h-[84px] lg:w-[88px] lg:h-[88px] rounded-[22px] border-2 bg-slate-900/10 dark:bg-white/10 border-slate-900/15 dark:border-white/20 text-slate-700 dark:text-zinc-200 group-focus:scale-110 group-focus:border-white group-focus:bg-[#18202C] group-focus:text-white dark:group-focus:bg-white dark:group-focus:text-zinc-950 flex items-center justify-center shadow-md"
                >
                  <LayoutGrid className="w-7 h-7" />
                </div>
                <span className="apps-label w-full text-[13px] font-medium truncate text-center leading-tight text-slate-800 dark:text-zinc-200 group-focus:font-bold">
                  {tHome.seeAll}
                </span>
              </button>
            </div>
          </section>

          {/* Cuadrícula completa de aplicaciones instaladas */}
          <section aria-label={tHome.allAppsHeading(allAppsForGrid.length)}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                {tHome.allAppsHeading(allAppsForGrid.length)}
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

  const heroMaskGradient = hasMoviesBelow
    ? 'linear-gradient(to bottom, #000 0%, #000 36%, rgba(0, 0, 0, 0.86) 54%, rgba(0, 0, 0, 0.50) 70%, rgba(0, 0, 0, 0.18) 84%, rgba(0, 0, 0, 0.04) 94%, transparent 100%)'
    : 'linear-gradient(to bottom, #000 0%, #000 68%, rgba(0, 0, 0, 0.58) 86%, transparent 100%)';

  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Velo superior ligero al desplazarse: suaviza la salida en el borde superior sin tapar el título de Estrenos */}
      <div
        ref={topVeilRef}
        aria-hidden="true"
        style={{ opacity: 0, backgroundImage: topVeilGradient }}
        className="pointer-events-none absolute top-0 left-0 right-0 h-16 z-20 will-change-[opacity]"
      />

      <div
        ref={scrollRef}
        data-tv-scroll-container="true"
        data-tv-has-topbar="true"
        data-tv-native={isNative ? 'true' : 'false'}
        className="relative z-10 flex-1 overflow-y-auto no-scrollbar pb-14"
      >
        {/* Fondo ambiental Hero a pantalla completa (100vh) dentro del scroll: ocupa todo el fondo, se desvanece suavemente y acompaña la bajada */}
        {activeHero && (
          <div
            ref={heroBgRef}
            aria-hidden="true"
            style={{
              maskImage: heroMaskGradient,
              WebkitMaskImage: heroMaskGradient,
            }}
            className="absolute top-0 left-0 right-0 h-screen pointer-events-none overflow-hidden z-0 [contain:strict] will-change-[opacity]"
          >
            <HeroBackdropImage
              backdropUrl={activeHero.backdropUrl}
              accentGradient={activeHero.accentGradient}
              oledMode={oledMode}
            />

            {/* Scrim translúcido puro: sin franjas opacas para evitar cortes visibles */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: oledMode
                  ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0.62) 0%, rgba(0, 0, 0, 0.16) 18%, transparent 34%), linear-gradient(to right, rgba(0, 0, 0, 0.80) 0%, rgba(0, 0, 0, 0.28) 36%, transparent 60%), linear-gradient(to top, rgba(0, 0, 0, 0.86) 0%, rgba(0, 0, 0, 0.50) 28%, rgba(0, 0, 0, 0.14) 50%, transparent 68%)'
                  : 'linear-gradient(to bottom, rgba(8, 11, 18, 0.54) 0%, rgba(8, 11, 18, 0.12) 18%, transparent 34%), linear-gradient(to right, rgba(8, 11, 18, 0.72) 0%, rgba(8, 11, 18, 0.24) 36%, transparent 60%), linear-gradient(to top, rgba(8, 11, 18, 0.72) 0%, rgba(8, 11, 18, 0.40) 28%, rgba(8, 11, 18, 0.12) 50%, transparent 68%)',
              }}
            />
          </div>
        )}

        {/* Primer plano: Hero + Fila de Aplicaciones */}
        <div
          className={`relative z-10 px-12 ${
            activeHero
              ? hasMoviesBelow
                ? 'min-h-[72vh] flex flex-col justify-end gap-3.5 pt-16 pb-3'
                : 'min-h-screen flex flex-col justify-end gap-5 pt-20 pb-6'
              : 'pt-24 space-y-8'
          }`}
        >
          {/* 1. Contenido de recomendaciones Hero */}
          {activeHero && (
            <section
              ref={heroContentRef}
              aria-label={tHome.heroSectionAria}
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
              className="flex items-end justify-between gap-8 max-w-full scroll-mt-24 outline-none will-change-[opacity]"
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
                  <span>
                    {tHome.updatedPrefix} {formattedUpdatedTime}
                  </span>
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
                    <span>{tHome.watchOn(heroAppName)}</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 2. Fila distintiva Google TV: "Tus aplicaciones" */}
          <section
            ref={appsSectionRef}
            data-apps-over-hero={activeHero ? 'true' : 'false'}
            aria-label={tHome.yourAppsTitle}
            className="will-change-[opacity]"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="apps-heading font-display text-lg font-semibold text-slate-900 dark:text-white">
                {tHome.yourAppsTitle}
              </h2>
              <span className="apps-hint text-xs text-slate-600 dark:text-zinc-400">
                {tHome.yourAppsHint}
              </span>
            </div>

            <div
              ref={appsRowRef}
              data-tv-row="apps"
              data-tv-scroll-top="true"
              className="flex items-start gap-4 overflow-x-auto no-scrollbar py-4 px-4 -mx-4"
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
                data-tv-focus-wrapper="true"
                data-tv-id="row-all-apps"
                onClick={onOpenAllApps}
                className="group w-[108px] shrink-0 flex flex-col items-center gap-2 py-2 focus:outline-none scroll-my-12"
              >
                <div
                  data-tv-focus-box="true"
                  className="apps-all-circle tv-focusable w-[84px] h-[84px] lg:w-[88px] lg:h-[88px] rounded-[22px] border-2 bg-slate-900/10 dark:bg-white/10 border-slate-900/15 dark:border-white/20 text-slate-700 dark:text-zinc-200 group-focus:scale-110 group-focus:border-white group-focus:bg-[#18202C] group-focus:text-white dark:group-focus:bg-white dark:group-focus:text-zinc-950 flex items-center justify-center shadow-md"
                >
                  <LayoutGrid className="w-7 h-7" />
                </div>
                <span className="apps-label w-full text-[13px] font-medium truncate text-center leading-tight text-slate-800 dark:text-zinc-200 group-focus:font-bold">
                  {tHome.seeAll}
                </span>
              </button>
            </div>
          </section>
        </div>

        {/* Filas inferiores con revelado gradual por opacidad al bajar */}
        <div
          ref={lowerSectionRef}
          style={{ opacity: activeHero && hasMoviesBelow ? 0.9 : 1 }}
          className="relative z-10 px-12 pt-5 space-y-8 will-change-[opacity]"
        >
          {showSuggestions && (
            <MoviesSection
              movies={dedupedCatalog.movies}
              formattedUpdatedTime={formattedUpdatedTime}
              tHome={tHome}
              onLaunchSuggestion={onLaunchSuggestion}
            />
          )}

          {showSuggestions && (
            <SeriesSection
              filteredSeries={filteredSeries}
              streamingFilters={streamingFilters}
              platformFilter={platformFilter}
              tHome={tHome}
              onSelectFilter={handleSelectPlatformFilter}
              onLaunchSuggestion={onLaunchSuggestion}
            />
          )}
        </div>
      </div>
    </div>
  );
});
