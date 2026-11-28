import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppWindow, Film, Play, Search, Tv, X } from 'lucide-react';
import {
  CURATED_REAL_MOVIES,
  CURATED_REAL_SERIES,
  buildPlatformSearchActions,
  deduplicateSuggestions,
  isValidImageUrl,
  normalizeSuggestionTitle,
  searchOnlineCatalog,
} from '../data/suggestions';
import {
  focusClosestInRow,
  useSpatialNavigation,
} from '../hooks/useSpatialNavigation';
import type {
  AppSuggestion,
  GoogleTvLiveCatalog,
  InstalledApp,
} from '../types/launcher';
import { TvKeyboard } from './TvKeyboard';

type SearchFilter = 'all' | 'apps' | 'media';

const RECENT_SEARCHES_KEY = 'vora_recent_searches_v1';
const MAX_RECENT_SEARCHES = 5;

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string, prev: string[]): string[] {
  const clean = term.trim();
  if (clean.length < 2) return prev;
  const next = [clean, ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(
    0,
    MAX_RECENT_SEARCHES
  );
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // Silencioso
  }
  return next;
}

interface SearchMediaThumbProps {
  src?: string;
  alt: string;
  mediaKind?: 'movie' | 'series' | 'game';
  accentGradient?: string;
}

function SearchMediaThumb({ src, alt, mediaKind, accentGradient }: SearchMediaThumbProps) {
  const [failed, setFailed] = useState(false);
  const valid = Boolean(src && isValidImageUrl(src) && !failed);

  return (
    <div
      className="w-20 aspect-video rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative"
      style={{
        backgroundImage:
          accentGradient || 'linear-gradient(135deg, #141923 0%, #273244 100%)',
      }}
    >
      {valid ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : mediaKind === 'series' ? (
        <Tv className="w-5 h-5 text-white/75" />
      ) : (
        <Film className="w-5 h-5 text-white/75" />
      )}
    </div>
  );
}

interface NavaSearchOverlayProps {
  isOpen: boolean;
  apps: InstalledApp[];
  liveCatalog: GoogleTvLiveCatalog;
  favoritePackages?: string[];
  appsOnlyMode?: boolean;
  onLaunchApp: (app: InstalledApp) => void;
  onLaunchSuggestion: (suggestion: AppSuggestion) => void;
  onClose: () => void;
}

export function NavaSearchOverlay({
  isOpen,
  apps,
  liveCatalog,
  favoritePackages = [],
  appsOnlyMode = false,
  onLaunchApp,
  onLaunchSuggestion,
  onClose,
}: NavaSearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [onlineResults, setOnlineResults] = useState<AppSuggestion[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
  const resultsPaneRef = useRef<HTMLDivElement | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  useSpatialNavigation({
    enabled: isOpen,
    onBack: onClose,
    scopeSelector: '#nava-search-root',
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFilter('all');
      setOnlineResults([]);
      setIsSearchingOnline(false);
      setRecentSearches(loadRecentSearches());
    }
  }, [isOpen]);

  // Soporte rápido para teclado físico o Bluetooth sin invocar el teclado de Google
  useEffect(() => {
    if (!isOpen) return;

    const handleHardwareTyping = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Backspace') {
        if (queryRef.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          setQuery((prev) => prev.slice(0, -1));
        }
        return;
      }

      if (e.key === ' ') {
        const active = document.activeElement as HTMLElement | null;
        if (active?.dataset.kbChar === 'true') {
          e.preventDefault();
          e.stopPropagation();
          setQuery((prev) => prev + ' ');
        }
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        setQuery((prev) => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleHardwareTyping, true);
    return () => window.removeEventListener('keydown', handleHardwareTyping, true);
  }, [isOpen]);

  // Búsqueda en vivo en catálogo online (películas y series reales)
  useEffect(() => {
    if (!isOpen || appsOnlyMode) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    const controller = new AbortController();
    setIsSearchingOnline(true);

    const timer = window.setTimeout(() => {
      void searchOnlineCatalog(trimmed, apps, favoritePackages, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) {
            setOnlineResults(items);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setOnlineResults([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearchingOnline(false);
          }
        });
    }, 240);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, appsOnlyMode, query, apps, favoritePackages]);

  const localMediaPool = useMemo(() => {
    if (appsOnlyMode) return [];
    const fromRows = (liveCatalog.rows || []).flatMap((r) => r.items || []);
    return deduplicateSuggestions([
      ...liveCatalog.spotlight,
      ...liveCatalog.movies,
      ...liveCatalog.series,
      ...fromRows,
      ...CURATED_REAL_MOVIES,
      ...CURATED_REAL_SERIES,
    ]);
  }, [appsOnlyMode, liveCatalog]);

  const matchingApps = useMemo(() => {
    const raw = query.trim().toLowerCase();
    const norm = normalizeSuggestionTitle(query);
    if (!raw) {
      const favSet = new Set(favoritePackages);
      const sorted = [...apps].sort((a, b) => {
        const scoreA = favSet.has(a.packageName) ? 1 : 0;
        const scoreB = favSet.has(b.packageName) ? 1 : 0;
        return scoreB - scoreA;
      });
      return sorted.slice(0, 8);
    }

    return apps.filter((app) => {
      const nameLower = app.name.toLowerCase();
      const pkgLower = app.packageName.toLowerCase();
      const nameNorm = normalizeSuggestionTitle(app.name);
      return (
        nameLower.includes(raw) ||
        pkgLower.includes(raw) ||
        (norm.length > 0 && nameNorm.includes(norm))
      );
    });
  }, [apps, favoritePackages, query]);

  const matchingMedia = useMemo(() => {
    if (appsOnlyMode) return [];
    const raw = query.trim().toLowerCase();
    const norm = normalizeSuggestionTitle(query);

    if (!raw) {
      return localMediaPool.slice(0, 8);
    }

    const localMatches = localMediaPool.filter((item) => {
      const titleLower = item.title.toLowerCase();
      const titleNorm = normalizeSuggestionTitle(item.title);
      const genreLower = (item.genre || '').toLowerCase();
      const appLower = (item.appName || '').toLowerCase();
      const subtitleLower = (item.subtitle || '').toLowerCase();
      return (
        titleLower.includes(raw) ||
        (norm.length > 0 && titleNorm.includes(norm)) ||
        genreLower.includes(raw) ||
        appLower.includes(raw) ||
        subtitleLower.includes(raw)
      );
    });

    return deduplicateSuggestions([...localMatches, ...onlineResults]).slice(0, 16);
  }, [appsOnlyMode, localMediaPool, onlineResults, query]);

  const directSearchActions = useMemo(() => {
    return buildPlatformSearchActions(query, apps, appsOnlyMode);
  }, [query, apps, appsOnlyMode]);

  const handleAppendChar = useCallback((char: string) => {
    setQuery((prev) => prev + char);
  }, []);

  const handleBackspace = useCallback(() => {
    setQuery((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  const rememberCurrentQuery = useCallback(() => {
    if (queryRef.current.trim().length >= 2) {
      setRecentSearches((prev) => saveRecentSearch(queryRef.current, prev));
    }
  }, []);

  const handleFocusResults = useCallback(() => {
    rememberCurrentQuery();
    const pane = resultsPaneRef.current;
    if (!pane) return;
    const firstResultRow = pane.querySelector<HTMLElement>(
      '[data-tv-row="search-apps"], [data-tv-row="search-media"], [data-tv-row="search-actions"], [data-tv-row="search-filters"]'
    );
    if (firstResultRow) {
      focusClosestInRow(firstResultRow);
    }
  }, [rememberCurrentQuery]);

  const handleSelectApp = useCallback(
    (app: InstalledApp) => {
      rememberCurrentQuery();
      onLaunchApp(app);
    },
    [rememberCurrentQuery, onLaunchApp]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: AppSuggestion) => {
      rememberCurrentQuery();
      onLaunchSuggestion(suggestion);
    },
    [rememberCurrentQuery, onLaunchSuggestion]
  );

  const hasQuery = query.trim().length > 0;
  const showAppsSection = (filter === 'all' || filter === 'apps') && matchingApps.length > 0;
  const showMediaSection =
    !appsOnlyMode && (filter === 'all' || filter === 'media') && matchingMedia.length > 0;
  const showActionsSection = hasQuery && directSearchActions.length > 0;
  const totalCount =
    (filter === 'media' ? 0 : matchingApps.length) +
    (filter === 'apps' || appsOnlyMode ? 0 : matchingMedia.length);

  const filterTabs: Array<{ id: SearchFilter; label: string }> = appsOnlyMode
    ? [{ id: 'all', label: 'Aplicaciones' }]
    : [
        { id: 'all', label: 'Todo' },
        { id: 'apps', label: `Apps (${matchingApps.length})` },
        { id: 'media', label: `Películas y Series (${matchingMedia.length})` },
      ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="nava-search-root"
          role="dialog"
          aria-modal="true"
          aria-label="Buscador universal VORA"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 bg-[#E5E7EB]/98 dark:bg-[#09090B]/97 flex flex-col px-6 md:px-12 pt-6 pb-6"
        >
          <motion.div
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className="max-w-[1380px] w-full mx-auto flex flex-col flex-1 min-h-0"
          >
            {/* Barra superior de búsqueda sin activar el teclado de Google */}
            <div
              data-tv-row="search-bar"
              className="flex items-center gap-4 pb-4 mb-5 border-b border-zinc-900/12 dark:border-white/12 shrink-0"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-900/8 dark:bg-white/10 flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
              </div>

              <div
                aria-live="polite"
                className="flex-1 min-w-0 flex items-center gap-1 font-display text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white"
              >
                {query ? (
                  <span className="truncate whitespace-pre">{query}</span>
                ) : (
                  <span className="text-zinc-500 dark:text-zinc-500 font-normal text-xl md:text-2xl truncate">
                    Busca aplicaciones, películas, series o lo que quieras...
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="inline-block w-[2.5px] h-7 bg-zinc-900 dark:bg-white rounded-full shrink-0"
                />
              </div>

              <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0 tabular-nums">
                {isSearchingOnline ? (
                  <span>Buscando en catálogo...</span>
                ) : hasQuery ? (
                  <span>
                    {totalCount} {totalCount === 1 ? 'resultado' : 'resultados'}
                  </span>
                ) : (
                  <span>Teclado VORA</span>
                )}
              </div>

              {hasQuery && (
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="search-bar-clear"
                  onClick={handleClear}
                  className="tv-focusable min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105 whitespace-nowrap shrink-0"
                >
                  Limpiar
                </button>
              )}

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="search-close"
                onClick={onClose}
                aria-label="Cerrar buscador"
                className="tv-focusable min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 flex items-center justify-center focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Layout 2 columnas: Teclado VORA a la izquierda + Resultados en vivo a la derecha */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[410px_1fr] lg:grid-cols-[470px_1fr] gap-6 lg:gap-8">
              {/* Panel Izquierdo: Teclado propio VORA */}
              <div data-tv-pane="keyboard" className="shrink-0 self-start w-full">
                <TvKeyboard
                  query={query}
                  recentSearches={recentSearches}
                  onAppendChar={handleAppendChar}
                  onBackspace={handleBackspace}
                  onClear={handleClear}
                  onSubmit={handleFocusResults}
                  onSelectRecent={(term) => setQuery(term)}
                />
              </div>

              {/* Panel Derecho: Resultados inmediatos */}
              <div
                ref={resultsPaneRef}
                data-tv-pane="results"
                className="flex flex-col min-h-0"
              >
                {/* Pestañas de filtro */}
                <div
                  data-tv-row="search-filters"
                  data-tv-allow-horizontal-exit="true"
                  className="flex items-center gap-2 mb-3 py-1.5 px-1.5 -mx-1.5 shrink-0 flex-wrap"
                >
                  {filterTabs.map((tab) => {
                    const active = filter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        data-tv-focusable="true"
                        data-tv-id={`search-filter-${tab.id}`}
                        onClick={() => setFilter(tab.id)}
                        className={`tv-focusable min-h-[40px] px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                            : 'bg-zinc-900/10 dark:bg-white/8 text-zinc-700 dark:text-zinc-300'
                        } focus:scale-105`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Lista / Cuadrícula desplazable de resultados */}
                <div
                  data-tv-scroll-container="true"
                  className="flex-1 overflow-y-auto no-scrollbar px-2 py-1 pb-6 space-y-6"
                >
                  {/* 1. Aplicaciones coincidentes o destacadas */}
                  {showAppsSection && (
                    <section>
                      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2.5">
                        {hasQuery ? 'Aplicaciones y juegos' : 'Aplicaciones frecuentes'}
                      </h2>
                      <div
                        data-tv-row="search-apps"
                        data-tv-row-type="grid"
                        data-tv-allow-horizontal-exit="true"
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                      >
                        {matchingApps.map((app) => (
                          <button
                            key={app.packageName}
                            type="button"
                            data-tv-focusable="true"
                            data-tv-id={`search-app-${app.packageName}`}
                            onClick={() => handleSelectApp(app)}
                            className="tv-focusable min-h-[56px] flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-200/80 dark:bg-white/[0.06] border border-zinc-900/10 dark:border-white/10 text-left focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.02] group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-zinc-300/70 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                              {app.icon ? (
                                <img
                                  src={app.icon}
                                  alt={app.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <AppWindow className="w-5 h-5 text-zinc-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[13px] leading-snug break-words">
                                {app.name}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 group-focus:text-zinc-300 dark:group-focus:text-zinc-600">
                                {app.category === 'games' ? 'Juego' : 'Aplicación'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 2. Películas y Series reales (locales + búsqueda en vivo) */}
                  {showMediaSection && (
                    <section>
                      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2.5">
                        {hasQuery ? 'Películas y series' : 'Tendencias de hoy'}
                      </h2>
                      <div
                        data-tv-row="search-media"
                        data-tv-row-type="grid"
                        data-tv-allow-horizontal-exit="true"
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                      >
                        {matchingMedia.map((item) => {
                          const thumb = isValidImageUrl(item.backdropUrl)
                            ? item.backdropUrl
                            : item.posterUrl;
                          const kindLabel =
                            item.mediaKind === 'series' ? 'Serie' : 'Película';
                          const metaParts = [
                            item.releaseDate,
                            kindLabel,
                            item.appName,
                            item.imdbRating ? `IMDb ${item.imdbRating}` : undefined,
                          ].filter(Boolean);

                          return (
                            <button
                              key={item.id}
                              type="button"
                              data-tv-focusable="true"
                              data-tv-id={`search-media-${item.id}`}
                              onClick={() => handleSelectSuggestion(item)}
                              className="tv-focusable flex items-center gap-3 p-2 rounded-xl bg-zinc-200/80 dark:bg-white/[0.06] border border-zinc-900/10 dark:border-white/10 text-left focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.02] group"
                            >
                              <SearchMediaThumb
                                src={thumb}
                                alt={item.title}
                                mediaKind={item.mediaKind}
                                accentGradient={item.accentGradient}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-[13px] leading-snug break-words">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 group-focus:text-zinc-300 dark:group-focus:text-zinc-600 truncate mt-0.5 tabular-nums">
                                  {metaParts.join(' · ')}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* 3. Búsqueda directa en plataformas (YouTube, Netflix, Prime Video, Max, Disney+, Paramount+) */}
                  {showActionsSection && (
                    <section>
                      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2.5">
                        Buscar directamente en
                      </h2>
                      <div
                        data-tv-row="search-actions"
                        data-tv-row-type="grid"
                        data-tv-allow-horizontal-exit="true"
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                      >
                        {directSearchActions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            data-tv-focusable="true"
                            data-tv-id={action.id}
                            onClick={() => handleSelectSuggestion(action)}
                            className="tv-focusable min-h-[52px] flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-200/80 dark:bg-white/[0.06] border border-zinc-900/10 dark:border-white/10 text-left focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.02] group"
                          >
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white"
                              style={{ backgroundImage: action.accentGradient }}
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[13px] leading-snug break-words">
                                {action.title}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 group-focus:text-zinc-300 dark:group-focus:text-zinc-600 truncate">
                                {action.subtitle}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Estado vacío si un filtro específico no tiene coincidencias */}
                  {!showAppsSection && !showMediaSection && !showActionsSection && (
                    <div className="py-12 text-center text-zinc-600 dark:text-zinc-400 text-base">
                      No hay coincidencias para &ldquo;{query}&rdquo; en esta pestaña.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
