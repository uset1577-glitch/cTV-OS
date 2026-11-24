import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppWindow,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Play,
} from 'lucide-react';
import { FEATURED_GAME } from '../data/presets';
import { resolvePackageAlias } from '../data/suggestions';
import type { AppSuggestion, GoogleTvLiveCatalog, InstalledApp } from '../types/launcher';

interface GoogleTvHomeProps {
  allApps: InstalledApp[];
  favoriteApps: InstalledApp[];
  liveCatalog: GoogleTvLiveCatalog;
  isNative: boolean;
  showSuggestions: boolean;
  heroFadeColor: string;
  onScrollTopChange: (atTop: boolean) => void;
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
      className="tv-focusable group w-[108px] shrink-0 flex flex-col items-center gap-2 py-2 focus:outline-none scroll-my-12"
    >
      <div
        data-tv-focus-box="true"
        className="tv-focusable w-[82px] h-[82px] lg:w-[86px] lg:h-[86px] rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-800 border-2 border-white/25 group-focus:scale-110 group-focus:border-amber-400 dark:group-focus:border-white flex items-center justify-center shadow-md"
      >
        {app.icon && !imgErr ? (
          <img
            src={app.icon}
            alt={app.name}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover"
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
}

export function GoogleTvHome({
  allApps,
  favoriteApps,
  liveCatalog,
  isNative,
  showSuggestions,
  heroFadeColor,
  onScrollTopChange,
  onLaunchFeatured,
  onLaunchApp,
  onLaunchSuggestion,
  onToggleFavorite,
  onOpenAllApps,
}: GoogleTvHomeProps) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const backdropLayerRef = useRef<HTMLDivElement | null>(null);
  const fadeVeilRef = useRef<HTMLDivElement | null>(null);
  const appsSectionRef = useRef<HTMLElement | null>(null);
  const atTopRef = useRef(true);
  const scrollRafRef = useRef<number>(0);

  const markImageFailed = (url: string) => {
    setFailedImages((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

  // Lista circular de apps estilo Google TV (CgamesTVPARTY primero + favoritos)
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
    }, 10500);
    return () => window.clearInterval(timer);
  }, [spotlightList.length]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const handleHeroLaunch = () => {
    if (!activeHero) return;
    if (activeHero.packageName === FEATURED_GAME.packageName) {
      onLaunchFeatured();
      return;
    }
    const resolvedPkg = resolvePackageAlias(activeHero.packageName, allApps);
    onLaunchSuggestion({ ...activeHero, packageName: resolvedPkg });
  };

  // Actualiza únicamente 2 capas compositoras (opacity) sin invalidar estilos del resto del árbol DOM
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (scrollRafRef.current) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const top = el.scrollTop;
      const atTop = top <= 18;
      if (atTop !== atTopRef.current) {
        atTopRef.current = atTop;
        onScrollTopChange(atTop);
      }

      const progress = Math.min(1, Math.max(0, top / 300));
      if (backdropLayerRef.current) {
        backdropLayerRef.current.style.opacity = (1 - progress * 0.92).toFixed(2);
      }
      if (fadeVeilRef.current) {
        fadeVeilRef.current.style.opacity = progress.toFixed(2);
      }
      if (appsSectionRef.current) {
        appsSectionRef.current.setAttribute(
          'data-apps-over-hero',
          activeHero && progress < 0.45 ? 'true' : 'false'
        );
      }
    });
  };

  const formattedUpdatedTime = useMemo(() => {
    try {
      const dt = new Date(liveCatalog.updatedAt);
      if (Number.isNaN(dt.getTime())) return 'Hoy';
      return dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Hoy';
    }
  }, [liveCatalog.updatedAt]);

  return (
    <div
      ref={scrollRef}
      data-tv-scroll-container="true"
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto no-scrollbar pb-14"
    >
      {/* Fondo ambiental a PANTALLA COMPLETA optimizado por GPU (solo opacity directa) */}
      {activeHero && (
        <div
          aria-hidden="true"
          className="sticky top-0 left-0 right-0 h-screen w-full -mb-[100vh] pointer-events-none overflow-hidden z-0 bg-[#0E1015]"
        >
          <div ref={backdropLayerRef} className="absolute inset-0">
            {activeHero.backdropUrl && !failedImages[activeHero.backdropUrl] ? (
              <img
                key={activeHero.id}
                src={activeHero.backdropUrl}
                alt=""
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => markImageFailed(activeHero.backdropUrl!)}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: activeHero.accentGradient }}
              />
            )}

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
            className="absolute inset-0"
            style={{ backgroundColor: heroFadeColor, opacity: 0 }}
          />
        </div>
      )}

      {/* Primer plano: Hero + Fila de Aplicaciones */}
      <div
        className={`relative z-10 px-12 ${
          activeHero
            ? 'min-h-screen flex flex-col justify-end gap-5 pt-20 pb-6'
            : 'pt-24 space-y-8'
        }`}
      >
        {/* 1. Contenido de recomendaciones Hero */}
        {activeHero && (
          <section
            aria-label="Destacado de hoy"
            data-tv-row="hero"
            data-tv-scroll-top="true"
            className="flex items-end justify-between gap-8 max-w-full scroll-mt-24"
          >
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-200/90 mb-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                <span>{activeHero.tag}</span>
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
                {activeHero.logoUrl && !failedImages[activeHero.logoUrl] ? (
                  <img
                    src={activeHero.logoUrl}
                    alt={activeHero.title}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => markImageFailed(activeHero.logoUrl!)}
                    className="max-h-14 lg:max-h-20 w-auto object-contain object-left mb-1"
                  />
                ) : (
                  <h1 className="font-display text-3xl lg:text-5xl font-bold tracking-tight text-white text-balance line-clamp-2 [text-shadow:0_2px_6px_rgba(0,0,0,0.75)]">
                    {activeHero.title}
                  </h1>
                )}
                <p className="mt-1.5 text-sm lg:text-base text-zinc-100/95 line-clamp-2 max-w-xl leading-relaxed [text-shadow:0_1px_4px_rgba(0,0,0,0.85)]">
                  {activeHero.subtitle}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="hero-primary-cta"
                  onClick={handleHeroLaunch}
                  className="tv-focusable inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-zinc-950 text-sm font-bold focus:bg-amber-400 focus:text-zinc-950 focus:scale-105 whitespace-nowrap shrink-0 shadow-md"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {activeHero.packageName === FEATURED_GAME.packageName
                      ? 'Jugar ahora'
                      : isNative
                        ? 'Ver tráiler en YouTube'
                        : 'Ver tráiler'}
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
                      className="tv-focusable w-9 h-9 rounded-full bg-black/50 border border-white/20 text-white flex items-center justify-center focus:bg-white focus:text-zinc-950 focus:scale-110"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      data-tv-focusable="true"
                      data-tv-id="hero-next"
                      aria-label="Siguiente destacado"
                      onClick={() => setHeroIdx((prev) => (prev + 1) % spotlightList.length)}
                      className="tv-focusable w-9 h-9 rounded-full bg-black/50 border border-white/20 text-white flex items-center justify-center focus:bg-white focus:text-zinc-950 focus:scale-110"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {spotlightList.length > 1 && (
              <div className="flex items-center gap-1.5 pb-1 shrink-0">
                {spotlightList.map((item, idx) => (
                  <span
                    key={item.id}
                    className={`h-1.5 rounded-full ${
                      idx === heroIdx % spotlightList.length
                        ? 'w-6 bg-white'
                        : 'w-1.5 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
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
              Mantén OK o pulsa M para fijar o quitar de esta fila
            </span>
          </div>

          <div
            data-tv-row="apps"
            className="flex items-start gap-4 overflow-x-auto no-scrollbar py-2.5 px-3 -mx-3"
          >
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

            <button
              type="button"
              data-tv-focusable="true"
              data-tv-id="row-all-apps"
              onClick={onOpenAllApps}
              className="tv-focusable group w-[108px] shrink-0 flex flex-col items-center gap-2 py-2 focus:outline-none scroll-my-12"
            >
              <div
                data-tv-focus-box="true"
                className="apps-all-circle tv-focusable w-[82px] h-[82px] lg:w-[86px] lg:h-[86px] rounded-full border-2 bg-slate-900/10 dark:bg-white/10 border-slate-900/12 dark:border-white/15 text-slate-700 dark:text-zinc-200 group-focus:scale-110 group-focus:border-amber-400 dark:group-focus:border-white group-focus:bg-[#18202C] group-focus:text-white dark:group-focus:bg-white dark:group-focus:text-zinc-950 flex items-center justify-center shadow-md"
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

      {/* Filas inferiores con content-visibility para máximo FPS */}
      <div className="relative z-10 px-12 pt-4 space-y-8">
        {/* 3. Películas reales actuales (pósters verticales 2:3) */}
        {showSuggestions && liveCatalog.movies.length > 0 && (
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
              {liveCatalog.movies.slice(0, 14).map((movie) => {
                const resolvedPkg = resolvePackageAlias(movie.packageName, allApps);
                return (
                  <button
                    key={movie.id}
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id={`movie-${movie.id}`}
                    onClick={() => onLaunchSuggestion({ ...movie, packageName: resolvedPkg })}
                    className="tv-focusable group w-[152px] shrink-0 text-left focus:outline-none scroll-my-12"
                  >
                    <div
                      data-tv-focus-box="true"
                      className="tv-focusable w-[152px] h-[228px] rounded-2xl overflow-hidden bg-slate-300 dark:bg-zinc-900 border-2 border-transparent group-focus:border-amber-500 dark:group-focus:border-white group-focus:scale-[1.06] shadow-md"
                    >
                      {movie.posterUrl && !failedImages[movie.posterUrl] ? (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={() => markImageFailed(movie.posterUrl)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-end p-3.5"
                          style={{ background: movie.accentGradient }}
                        >
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
                      <div className="text-[11px] text-slate-600 dark:text-zinc-400 truncate mt-0.5">
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

        {/* 4. Series y emisiones en tus plataformas (banners reales 16:9 horizontales) */}
        {showSuggestions && liveCatalog.series.length > 0 && (
          <section className="tv-row-offscreen" aria-label="En tus plataformas">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Series y emisiones en tus plataformas
              </h2>

              <div
                data-tv-row="series-filters"
                className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1"
              >
                {STREAMING_FILTERS.map((f) => {
                  const active = platformFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      data-tv-focusable="true"
                      data-tv-id={`home-plat-${f.id}`}
                      onClick={() => setPlatformFilter(f.id)}
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
              {filteredSeries.map((show) => {
                const resolvedPkg = resolvePackageAlias(show.packageName, allApps);
                const landscapeImage = show.backdropUrl || show.posterUrl;
                return (
                  <button
                    key={show.id}
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id={`series-${show.id}`}
                    onClick={() => onLaunchSuggestion({ ...show, packageName: resolvedPkg })}
                    className="tv-focusable group w-[248px] shrink-0 text-left focus:outline-none scroll-my-12"
                  >
                    <div
                      data-tv-focus-box="true"
                      className="tv-focusable w-[248px] h-[140px] rounded-2xl overflow-hidden bg-slate-300 dark:bg-zinc-900 border-2 border-transparent group-focus:border-amber-500 dark:group-focus:border-white group-focus:scale-[1.05] shadow-md"
                    >
                      {landscapeImage && !failedImages[landscapeImage] ? (
                        <img
                          src={landscapeImage}
                          alt={show.title}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={() => markImageFailed(landscapeImage)}
                          className="w-full h-full object-cover object-center"
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
                    <div className="mt-2.5 px-0.5">
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                        {show.title}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-zinc-400 truncate mt-0.5">
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
    </div>
  );
}
