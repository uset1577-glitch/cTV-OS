import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppWindow, ArrowUpRight, Gamepad2, LayoutGrid, Play, Sparkles, Star } from 'lucide-react';
import { FEATURED_GAME } from '../data/presets';
import {
  ALL_REAL_SUGGESTIONS,
  fetchDailyStreamingCatalog,
  getContextualSuggestions,
  resolvePackageAlias,
} from '../data/suggestions';
import type { AppSuggestion, InstalledApp } from '../types/launcher';

interface NavaSingleRowHomeProps {
  allApps: InstalledApp[];
  favoriteApps: InstalledApp[];
  totalAppsCount: number;
  featuredInstalled: boolean;
  isNative: boolean;
  showPackageNames: boolean;
  showSuggestions: boolean;
  onLaunchFeatured: () => void;
  onLaunchApp: (app: InstalledApp) => void;
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
  onToggleFavorite: (app: InstalledApp) => void;
  onOpenAllApps: () => void;
}

type SpotlightTarget =
  | { kind: 'featured' }
  | { kind: 'app'; app: InstalledApp }
  | { kind: 'suggestion'; suggestion: AppSuggestion }
  | { kind: 'all_apps' };

function NavaRowAppCard({
  app,
  isFocused,
  onFocusItem,
  onLaunch,
  onToggleFavorite,
}: {
  app: InstalledApp;
  isFocused: boolean;
  onFocusItem: () => void;
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
    <motion.button
      ref={ref}
      type="button"
      data-tv-focusable="true"
      data-tv-supports-longpress="true"
      data-tv-id={`row-app-${app.packageName}`}
      onFocus={onFocusItem}
      onMouseEnter={onFocusItem}
      onClick={() => onLaunch(app)}
      animate={{
        scale: isFocused ? 1.08 : 1,
        y: isFocused ? -5 : 0,
      }}
      transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
      className={`tv-focusable relative w-[156px] h-[152px] shrink-0 rounded-3xl flex flex-col items-center justify-center gap-3 p-4 border transition-colors ${
        isFocused
          ? 'bg-white text-zinc-950 border-zinc-900/20 shadow-2xl dark:bg-zinc-900 dark:text-white dark:border-white ring-2 ring-zinc-900 dark:ring-white'
          : 'bg-white/85 text-zinc-800 border-zinc-900/8 dark:bg-white/[0.06] dark:text-zinc-200 dark:border-white/10'
      }`}
    >
      <div className="w-15 h-15 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/90 flex items-center justify-center shrink-0">
        {app.icon && !imgErr ? (
          <img
            src={app.icon}
            alt={app.name}
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
            className="w-full h-full object-contain p-1.5"
          />
        ) : (
          <AppWindow className="w-7 h-7 text-zinc-400" />
        )}
      </div>

      <span className="w-full text-[15px] font-semibold truncate text-center leading-tight">
        {app.name}
      </span>
    </motion.button>
  );
}

export function NavaSingleRowHome({
  allApps,
  favoriteApps,
  totalAppsCount,
  featuredInstalled,
  isNative,
  showPackageNames,
  showSuggestions,
  onLaunchFeatured,
  onLaunchApp,
  onLaunchSuggestion,
  onToggleFavorite,
  onOpenAllApps,
}: NavaSingleRowHomeProps) {
  const [spotlight, setSpotlight] = useState<SpotlightTarget>({ kind: 'featured' });
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [lastFocusedPkg, setLastFocusedPkg] = useState<string | null>(FEATURED_GAME.packageName);
  const [catalog, setCatalog] = useState<AppSuggestion[]>(ALL_REAL_SUGGESTIONS);

  useEffect(() => {
    if (!showSuggestions) return;
    let cancelled = false;
    fetchDailyStreamingCatalog()
      .then((items) => {
        if (!cancelled && items.length > 0) {
          setCatalog(items);
        }
      })
      .catch(() => {
        // Mantener catálogo base local
      });
    return () => {
      cancelled = true;
    };
  }, [showSuggestions]);

  const markImageFailed = (url: string) => {
    setFailedImages((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

  const rowFavorites = favoriteApps.filter(
    (app) => app.packageName !== FEATURED_GAME.packageName
  );

  const suggestions = useMemo(() => {
    if (!showSuggestions) return [];
    return getContextualSuggestions(lastFocusedPkg, allApps, catalog);
  }, [showSuggestions, lastFocusedPkg, allApps, catalog]);

  const isFeaturedFocused = spotlight.kind === 'featured';
  const isAllAppsFocused = spotlight.kind === 'all_apps';
  const activeHeroImage =
    spotlight.kind === 'suggestion'
      ? spotlight.suggestion.posterUrl
      : FEATURED_GAME.bannerImage;

  return (
    <div className="relative flex-1 flex flex-col justify-end pb-9 overflow-hidden">
      {/* Fondo cinemático dinámico basado en la sugerencia o juego enfocado */}
      <AnimatePresence>
        {(isFeaturedFocused || spotlight.kind === 'suggestion') && !failedImages[activeHeroImage] && (
          <motion.div
            key={
              spotlight.kind === 'suggestion'
                ? `poster-${spotlight.suggestion.id}`
                : 'featured-horizon-art'
            }
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 0.44, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 right-0 w-[68%] h-[72%] overflow-hidden"
          >
            <img
              src={activeHeroImage}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => markImageFailed(activeHeroImage)}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#ECEEF2] via-[#ECEEF2]/70 to-transparent dark:from-[#090B10] dark:via-[#090B10]/70 dark:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#ECEEF2] via-transparent to-[#ECEEF2]/50 dark:from-[#090B10] dark:via-transparent dark:to-[#090B10]/50" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Título editorial dinámico */}
      <div className="relative z-10 px-12 mb-4 min-h-[104px] flex flex-col justify-end">
        <AnimatePresence mode="wait">
          {spotlight.kind === 'featured' && (
            <motion.div
              key="spot-featured"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                <Gamepad2 className="w-4 h-4 shrink-0" />
                <span>Acceso directo</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-zinc-500 dark:text-zinc-400">
                  {FEATURED_GAME.packageName}
                </span>
              </div>
              <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white text-balance">
                {FEATURED_GAME.name}
              </h1>
              <p className="mt-1.5 text-base text-zinc-600 dark:text-zinc-300">
                {FEATURED_GAME.tagline}
                {isNative && !featuredInstalled ? ' · Aún no instalado en este TV' : ''}
              </p>
            </motion.div>
          )}

          {spotlight.kind === 'app' && (
            <motion.div
              key={`spot-${spotlight.app.packageName}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                <span>Aplicación fijada</span>
                {showPackageNames && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{spotlight.app.packageName}</span>
                  </>
                )}
              </div>
              <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white text-balance">
                {spotlight.app.name}
              </h1>
              <p className="mt-1.5 text-base text-zinc-600 dark:text-zinc-400">
                Pulsa OK para abrir · Arriba para sugerencias cinemáticas · Mantén OK para quitar
              </p>
            </motion.div>
          )}

          {spotlight.kind === 'suggestion' && (
            <motion.div
              key={`spot-sug-${spotlight.suggestion.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Recomendación de hoy en {spotlight.suggestion.tag}</span>
              </div>
              <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white text-balance">
                {spotlight.suggestion.title}
              </h1>
              <p className="mt-1.5 text-base text-zinc-600 dark:text-zinc-300">
                {spotlight.suggestion.subtitle}
              </p>
            </motion.div>
          )}

          {spotlight.kind === 'all_apps' && (
            <motion.div
              key="spot-all-apps"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl"
            >
              <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Biblioteca completa
              </div>
              <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Todas las aplicaciones
              </h1>
              <p className="mt-1.5 text-base text-zinc-600 dark:text-zinc-400">
                {totalAppsCount} aplicaciones detectadas en tu Android TV · Pulsa OK para explorar
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fila de recomendaciones con vistas previas y portadas cinemáticas (Estilo Fire OS / Google TV) */}
      {showSuggestions && suggestions.length > 0 && (
        <section aria-label="Recomendaciones de cine y streaming" className="relative z-10 px-12 mb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Recomendaciones de hoy (Netflix, Max, Prime Video, YouTube)</span>
            </div>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 px-2 -mx-2">
            {suggestions.map((sug) => {
              const isSugFocused =
                spotlight.kind === 'suggestion' && spotlight.suggestion.id === sug.id;
              const resolvedPkg = resolvePackageAlias(sug.packageName, allApps);
              const isInstalled = allApps.some((a) => a.packageName === resolvedPkg);

              return (
                <motion.button
                  key={sug.id}
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id={`sug-${sug.id}`}
                  onFocus={() => {
                    setSpotlight({ kind: 'suggestion', suggestion: sug });
                    setLastFocusedPkg(sug.packageName);
                  }}
                  onMouseEnter={() => {
                    setSpotlight({ kind: 'suggestion', suggestion: sug });
                    setLastFocusedPkg(sug.packageName);
                  }}
                  onClick={() =>
                    onLaunchSuggestion({
                      ...sug,
                      packageName: resolvedPkg,
                    })
                  }
                  animate={{
                    scale: isSugFocused ? 1.07 : 1,
                    y: isSugFocused ? -4 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
                  className={`tv-focusable relative w-[264px] h-[132px] shrink-0 rounded-2xl overflow-hidden text-left border transition-colors ${
                    isSugFocused
                      ? 'border-white ring-2 ring-zinc-900 dark:ring-white shadow-2xl'
                      : 'border-white/12 opacity-90'
                  }`}
                >
                  {/* Portada / Vista previa cinemática */}
                  {!failedImages[sug.posterUrl] ? (
                    <img
                      src={sug.posterUrl}
                      alt={sug.title}
                      referrerPolicy="no-referrer"
                      onError={() => markImageFailed(sug.posterUrl)}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{ background: sug.accentGradient }}
                    />
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10"
                  />

                  <div className="relative z-10 h-full flex flex-col justify-between p-3.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-amber-300">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/75">
                        {sug.tag}
                      </span>
                      <span className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white">
                        {!isNative || isInstalled ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <span className="text-[9px]">+</span>
                        )}
                      </span>
                    </div>

                    <div>
                      <div className="font-display text-sm font-bold text-white leading-tight truncate">
                        {sug.title}
                      </div>
                      <div className="text-[11px] text-zinc-300 truncate mt-0.5">
                        {sug.subtitle}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      {/* Fila Única de Aplicaciones CTV OS */}
      <section aria-label="Aplicaciones principales" className="relative z-10 px-12">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-4 px-2 -mx-2">
          {/* 1. Tarjeta principal CgamesTVPARTY */}
          <motion.button
            type="button"
            data-tv-focusable="true"
            data-tv-initial="true"
            data-tv-id="row-featured-cgamestvparty"
            onFocus={() => {
              setSpotlight({ kind: 'featured' });
              setLastFocusedPkg(FEATURED_GAME.packageName);
            }}
            onMouseEnter={() => {
              setSpotlight({ kind: 'featured' });
              setLastFocusedPkg(FEATURED_GAME.packageName);
            }}
            onClick={onLaunchFeatured}
            animate={{
              scale: isFeaturedFocused ? 1.07 : 1,
              y: isFeaturedFocused ? -5 : 0,
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
            className={`tv-focusable relative w-[264px] h-[142px] shrink-0 rounded-3xl overflow-hidden text-left border transition-colors ${
              isFeaturedFocused
                ? 'border-zinc-900 dark:border-white ring-2 ring-zinc-900 dark:ring-white shadow-2xl'
                : 'border-zinc-900/12 dark:border-white/15'
            }`}
          >
            {!failedImages[FEATURED_GAME.bannerImage] ? (
              <img
                src={FEATURED_GAME.bannerImage}
                alt={FEATURED_GAME.name}
                referrerPolicy="no-referrer"
                onError={() => markImageFailed(FEATURED_GAME.bannerImage)}
                className="absolute inset-0 w-full h-full object-cover object-right"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600 to-zinc-900" />
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
            />
            <div className="relative z-10 h-full flex flex-col justify-end p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-display text-base font-bold text-white leading-tight">
                    {FEATURED_GAME.name}
                  </div>
                  <div className="text-xs font-medium text-amber-300 mt-0.5">
                    Juego destacado
                  </div>
                </div>
                <span className="w-9 h-9 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </span>
              </div>
            </div>
          </motion.button>

          {/* 2. Favoritos fijados en la fila */}
          {rowFavorites.map((app) => (
            <NavaRowAppCard
              key={app.packageName}
              app={app}
              isFocused={
                spotlight.kind === 'app' && spotlight.app.packageName === app.packageName
              }
              onFocusItem={() => {
                setSpotlight({ kind: 'app', app });
                setLastFocusedPkg(app.packageName);
              }}
              onLaunch={onLaunchApp}
              onToggleFavorite={onToggleFavorite}
            />
          ))}

          {/* 3. Acceso al cajón completo de aplicaciones */}
          <motion.button
            type="button"
            data-tv-focusable="true"
            data-tv-id="row-all-apps"
            onFocus={() => {
              setSpotlight({ kind: 'all_apps' });
              setLastFocusedPkg(null);
            }}
            onMouseEnter={() => {
              setSpotlight({ kind: 'all_apps' });
              setLastFocusedPkg(null);
            }}
            onClick={onOpenAllApps}
            animate={{
              scale: isAllAppsFocused ? 1.08 : 1,
              y: isAllAppsFocused ? -5 : 0,
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
            className={`tv-focusable w-[142px] h-[142px] shrink-0 rounded-3xl flex flex-col items-center justify-center gap-2.5 p-4 border transition-colors ${
              isAllAppsFocused
                ? 'bg-zinc-900 text-white border-zinc-900 ring-2 ring-zinc-900 shadow-2xl dark:bg-white dark:text-zinc-950 dark:border-white dark:ring-white'
                : 'bg-white/75 text-zinc-700 border-zinc-900/10 dark:bg-white/[0.05] dark:text-zinc-300 dark:border-white/10'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-900/6 dark:bg-white/10 flex items-center justify-center">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold">Todas las apps</span>
          </motion.button>
        </div>

        {/* Guía */}
        <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            Usa las flechas para navegar · Arriba para sugerencias cinemáticas · OK para abrir
          </span>
          <span className="tabular-nums">{totalAppsCount} apps instaladas</span>
        </div>
      </section>
    </div>
  );
}
