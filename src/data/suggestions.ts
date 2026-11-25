import type { AppSuggestion, GoogleTvLiveCatalog, InstalledApp } from '../types/launcher';

export interface ActiveStreamingPlatform {
  id: string;
  packageName: string;
  appName: string;
  deepLinkUrl: string;
  accentGradient: string;
  isInstalled: boolean;
  isFavorite: boolean;
}

const PACKAGE_ALIASES: Record<string, string[]> = {
  'com.wbd.stream': ['com.hbo.hbonow', 'com.hbomax', 'com.hbo.android.app'],
  'com.google.android.youtube.tv': ['com.liskovsoft.smarttubetv.beta', 'com.liskovsoft.smarttubetv'],
  'com.amazon.amazonvideo.livingroom': ['com.amazon.avod.thirdpartyclient'],
};

const KNOWN_STREAMING_PLATFORMS = [
  {
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    deepLinkUrl: 'https://www.netflix.com/browse',
    accentGradient: 'linear-gradient(135deg, #2B0909 0%, #8E1218 100%)',
  },
  {
    appName: 'Max',
    packageName: 'com.wbd.stream',
    deepLinkUrl: 'https://play.max.com/',
    accentGradient: 'linear-gradient(135deg, #0D163A 0%, #1E3A8A 100%)',
  },
  {
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    deepLinkUrl: 'https://app.primevideo.com/',
    accentGradient: 'linear-gradient(135deg, #0A2538 0%, #0369A1 100%)',
  },
  {
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    accentGradient: 'linear-gradient(135deg, #0D1A3D 0%, #1D4ED8 100%)',
  },
  {
    appName: 'YouTube',
    packageName: 'com.google.android.youtube.tv',
    deepLinkUrl: 'https://www.youtube.com/tv#/explore',
    accentGradient: 'linear-gradient(135deg, #3A0A14 0%, #991B1B 100%)',
  },
];

const LIVE_FEED_CACHE_KEY = 'ctvos_gtv_live_feed_v4';

interface CinemetaMeta {
  id?: string;
  imdb_id?: string;
  name?: string;
  type?: 'movie' | 'series';
  description?: string;
  imdbRating?: string;
  releaseInfo?: string;
  year?: string;
  genres?: string[];
  genre?: string[];
  poster?: string;
  background?: string;
  logo?: string;
  trailers?: Array<{ source?: string; type?: string }>;
  trailerStreams?: Array<{ title?: string; ytId?: string }>;
}

interface ITunesEntry {
  id?: { attributes?: { 'im:id'?: string } };
  'im:name'?: { label?: string };
  'im:image'?: Array<{ label?: string }>;
  'im:releaseDate'?: { attributes?: { label?: string } };
  category?: { attributes?: { label?: string } };
  summary?: { label?: string };
}

interface TvMazeScheduleItem {
  name?: string;
  image?: { medium?: string; original?: string } | null;
  _embedded?: {
    show?: {
      id: number;
      name: string;
      genres?: string[];
      rating?: { average?: number | null };
      webChannel?: { name?: string } | null;
      network?: { name?: string } | null;
    };
  };
}

const GENRE_ES: Record<string, string> = {
  Action: 'Acción',
  Adventure: 'Aventura',
  Animation: 'Animación',
  Biography: 'Biografía',
  Comedy: 'Comedia',
  Crime: 'Crimen',
  Documentary: 'Documental',
  Drama: 'Drama',
  Family: 'Familiar',
  Fantasy: 'Fantasía',
  History: 'Historia',
  Horror: 'Terror',
  Music: 'Música',
  Mystery: 'Misterio',
  Romance: 'Romance',
  'Sci-Fi': 'Ciencia ficción',
  'Science Fiction': 'Ciencia ficción',
  Thriller: 'Suspenso',
  War: 'Bélica',
  Western: 'Western',
};

function translateGenres(genres?: string[]): string {
  if (!genres || genres.length === 0) return 'Estreno destacado';
  return genres
    .slice(0, 2)
    .map((g) => GENRE_ES[g] || g)
    .join(' · ');
}

function stripHtml(text?: string): string {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function upscaleAppleImage(url: string, size = '600x900bb'): string {
  return url.replace(/\/\d+x\d+bb\.(png|jpg|jpeg)/i, `/${size}.$1`);
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = Math.abs(seed) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function normalizeSuggestionTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\((?:19|20)\d{2}\)/g, '')
    .replace(/\b(?:temporada|season|parte|part|vol\.?)\s*\d+\b/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getCanonicalWorkKey(item: Pick<AppSuggestion, 'id' | 'title'>): string {
  const rawId = (item.id || '').trim().toLowerCase();
  if (rawId.startsWith('cm-')) return `imdb:${rawId.slice(3)}`;
  if (rawId.startsWith('cms-')) return `imdb:${rawId.slice(4)}`;
  return `id:${rawId || normalizeSuggestionTitle(item.title)}`;
}

export function resolvePackageAlias(
  preferredPkg: string,
  installedApps: InstalledApp[]
): string {
  const installedSet = new Set(installedApps.map((a) => a.packageName));
  if (installedSet.has(preferredPkg)) return preferredPkg;
  const aliases = PACKAGE_ALIASES[preferredPkg] || [];
  for (const alias of aliases) {
    if (installedSet.has(alias)) return alias;
  }
  return preferredPkg;
}

export function getCanonicalPlatformPackage(pkg: string): string {
  for (const [canonical, aliases] of Object.entries(PACKAGE_ALIASES)) {
    if (pkg === canonical || aliases.includes(pkg)) {
      return canonical;
    }
  }
  return pkg;
}

export function getActiveStreamingPlatforms(
  installedApps: InstalledApp[],
  favoritePackages: string[] = []
): ActiveStreamingPlatform[] {
  const installedSet = new Set(installedApps.map((a) => a.packageName));
  const favoriteSet = new Set(favoritePackages);

  const enriched = KNOWN_STREAMING_PLATFORMS.map((plat) => {
    const resolvedPkg = resolvePackageAlias(plat.packageName, installedApps);
    const appMatch = installedApps.find((a) => a.packageName === resolvedPkg);
    const isInstalled = installedApps.length === 0 ? true : installedSet.has(resolvedPkg);
    const isFavorite =
      favoriteSet.has(plat.packageName) || favoriteSet.has(resolvedPkg);

    return {
      id: plat.packageName,
      packageName: resolvedPkg,
      appName: appMatch?.name || plat.appName,
      deepLinkUrl: plat.deepLinkUrl,
      accentGradient: plat.accentGradient,
      isInstalled,
      isFavorite,
    };
  });

  // Priorizar plataformas instaladas y fijadas como favoritas
  const activeOnly = enriched.filter((p) => p.isInstalled || p.isFavorite);
  const baseList = activeOnly.length > 0 ? activeOnly : enriched;

  return [...baseList].sort((a, b) => {
    const scoreA = (a.isFavorite ? 2 : 0) + (a.isInstalled ? 1 : 0);
    const scoreB = (b.isFavorite ? 2 : 0) + (b.isInstalled ? 1 : 0);
    return scoreB - scoreA;
  });
}

export function deduplicateSuggestions(
  items: AppSuggestion[],
  excludeItems: AppSuggestion[] = []
): AppSuggestion[] {
  const seenIds = new Set<string>();
  const seenWorkKeys = new Set<string>();
  const seenTitles = new Set<string>();

  for (const ex of excludeItems) {
    if (ex.id) seenIds.add(ex.id.toLowerCase());
    seenWorkKeys.add(getCanonicalWorkKey(ex));
    const t = normalizeSuggestionTitle(ex.title);
    if (t) seenTitles.add(t);
  }

  const result: AppSuggestion[] = [];
  for (const item of items) {
    const idKey = (item.id || '').toLowerCase();
    const workKey = getCanonicalWorkKey(item);
    const titleKey = normalizeSuggestionTitle(item.title);

    if (idKey && seenIds.has(idKey)) continue;
    if (seenWorkKeys.has(workKey)) continue;
    if (titleKey && seenTitles.has(titleKey)) continue;

    if (idKey) seenIds.add(idKey);
    seenWorkKeys.add(workKey);
    if (titleKey) seenTitles.add(titleKey);
    result.push(item);
  }

  return result;
}

export function deduplicateCatalog(
  catalog: GoogleTvLiveCatalog,
  installedApps: InstalledApp[] = [],
  favoritePackages: string[] = []
): GoogleTvLiveCatalog {
  const activePlatforms = getActiveStreamingPlatforms(installedApps, favoritePackages);
  const activeByCanonical = new Map(activePlatforms.map((p) => [p.id, p]));

  const normalizeItemPlatform = (item: AppSuggestion): AppSuggestion => {
    const canonical = getCanonicalPlatformPackage(item.packageName);
    const matched = activeByCanonical.get(canonical);
    const resolvedPkg = resolvePackageAlias(item.packageName, installedApps);
    if (matched) {
      return {
        ...item,
        packageName: matched.packageName,
        appName: matched.appName,
      };
    }
    return {
      ...item,
      packageName: resolvedPkg,
    };
  };

  const spotlight = deduplicateSuggestions(catalog.spotlight).map(normalizeItemPlatform);
  const movies = deduplicateSuggestions(catalog.movies, spotlight).map(normalizeItemPlatform);
  const series = deduplicateSuggestions(catalog.series, [...spotlight, ...movies]).map(
    normalizeItemPlatform
  );

  return {
    spotlight,
    movies,
    series,
    updatedAt: catalog.updatedAt,
  };
}

export function filterSeriesByPlatform(
  series: AppSuggestion[],
  platformId: string,
  installedApps: InstalledApp[] = []
): AppSuggestion[] {
  const deduped = deduplicateSuggestions(series);
  if (!platformId || platformId === 'all') {
    return deduped;
  }
  const canonicalFilter = getCanonicalPlatformPackage(platformId);
  const resolvedFilter = resolvePackageAlias(platformId, installedApps);
  return deduped.filter((item) => {
    const itemCanonical = getCanonicalPlatformPackage(item.packageName);
    const itemResolved = resolvePackageAlias(item.packageName, installedApps);
    return (
      item.packageName === platformId ||
      itemResolved === resolvedFilter ||
      itemCanonical === canonicalFilter
    );
  });
}

function mapPlatformToPackage(
  channelName: string,
  activePlatforms: ActiveStreamingPlatform[]
): ActiveStreamingPlatform | null {
  const lower = channelName.toLowerCase();
  let canonicalId = '';
  if (lower.includes('netflix')) canonicalId = 'com.netflix.ninja';
  else if (lower.includes('hbo') || lower.includes('max')) canonicalId = 'com.wbd.stream';
  else if (lower.includes('amazon') || lower.includes('prime'))
    canonicalId = 'com.amazon.amazonvideo.livingroom';
  else if (lower.includes('disney')) canonicalId = 'com.disney.disneyplus';
  else if (lower.includes('youtube')) canonicalId = 'com.google.android.youtube.tv';

  if (!canonicalId) return null;
  const active = activePlatforms.find((p) => p.id === canonicalId);
  if (active) return active;

  const fallback = KNOWN_STREAMING_PLATFORMS.find((p) => p.packageName === canonicalId);
  if (!fallback) return null;
  return {
    id: fallback.packageName,
    packageName: fallback.packageName,
    appName: fallback.appName,
    deepLinkUrl: fallback.deepLinkUrl,
    accentGradient: fallback.accentGradient,
    isInstalled: true,
    isFavorite: false,
  };
}

// Respaldo limpio sin imágenes rotas si el TV está completamente sin internet
export const OFFLINE_FALLBACK_CATALOG: GoogleTvLiveCatalog = {
  spotlight: [
    {
      id: 'offline-party',
      appName: 'CgamesTVPARTY',
      packageName: 'com.mandoparty.tv',
      title: 'CgamesTVPARTY',
      subtitle:
        'Multijugador local para tu televisor con mandos Bluetooth o controles de TV.',
      deepLinkUrl: 'cgamestv://party',
      posterUrl: '',
      accentGradient: 'linear-gradient(135deg, #18181B 0%, #7C2D12 100%)',
      tag: 'Juego destacado',
      genre: 'Multijugador',
      mediaKind: 'game',
    },
  ],
  movies: [],
  series: [
    {
      id: 'offline-yt',
      appName: 'YouTube',
      packageName: 'com.google.android.youtube.tv',
      title: 'Explorar tendencias en YouTube TV',
      subtitle: 'Música, directos y estrenos en 4K',
      deepLinkUrl: 'https://www.youtube.com/tv#/explore',
      posterUrl: '',
      accentGradient: 'linear-gradient(135deg, #270A10 0%, #991B1B 100%)',
      tag: 'YouTube',
      mediaKind: 'series',
    },
    {
      id: 'offline-nf',
      appName: 'Netflix',
      packageName: 'com.netflix.ninja',
      title: 'Novedades en Netflix',
      subtitle: 'Series y películas recientes en tu cuenta',
      deepLinkUrl: 'https://www.netflix.com/browse',
      posterUrl: '',
      accentGradient: 'linear-gradient(135deg, #1E0909 0%, #991B1B 100%)',
      tag: 'Netflix',
      mediaKind: 'series',
    },
    {
      id: 'offline-max',
      appName: 'Max',
      packageName: 'com.wbd.stream',
      title: 'Estrenos de cine en Max',
      subtitle: 'Catálogo HBO, Warner Bros. y DC',
      deepLinkUrl: 'https://play.max.com/',
      posterUrl: '',
      accentGradient: 'linear-gradient(135deg, #0D163A 0%, #1D4ED8 100%)',
      tag: 'Max',
      mediaKind: 'series',
    },
    {
      id: 'offline-pv',
      appName: 'Prime Video',
      packageName: 'com.amazon.amazonvideo.livingroom',
      title: 'Tendencias en Prime Video',
      subtitle: 'Producciones Amazon Originals en Ultra HD',
      deepLinkUrl: 'https://app.primevideo.com/',
      posterUrl: '',
      accentGradient: 'linear-gradient(135deg, #0A2538 0%, #0284C7 100%)',
      tag: 'Prime Video',
      mediaKind: 'series',
    },
    {
      id: 'offline-dp',
      appName: 'Disney+',
      packageName: 'com.disney.disneyplus',
      title: 'Colección en Disney+',
      subtitle: 'Marvel, Star Wars, Pixar y National Geographic',
      deepLinkUrl: 'https://www.disneyplus.com/home',
      posterUrl: '',
      accentGradient: 'linear-gradient(135deg, #0D1A3D 0%, #1E40AF 100%)',
      tag: 'Disney+',
      mediaKind: 'series',
    },
  ],
  updatedAt: new Date().toISOString(),
};

let refreshNonce = 0;

export interface FetchCatalogOptions {
  force?: boolean;
  installedApps?: InstalledApp[];
  favoritePackages?: string[];
}

export async function fetchGoogleTvLiveCatalog(
  forceOrOptions: boolean | FetchCatalogOptions = false
): Promise<GoogleTvLiveCatalog> {
  const options: FetchCatalogOptions =
    typeof forceOrOptions === 'boolean' ? { force: forceOrOptions } : forceOrOptions;
  const forceRefresh = Boolean(options.force);
  const installedApps = options.installedApps || [];
  const favoritePackages = options.favoritePackages || [];
  const activePlatforms = getActiveStreamingPlatforms(installedApps, favoritePackages);

  refreshNonce += 1;
  const seed = Math.floor(Date.now() / 1000) + refreshNonce * 97 + (forceRefresh ? 503 : 0);

  const movies: AppSuggestion[] = [];
  const series: AppSuggestion[] = [];
  const spotlightCandidates: AppSuggestion[] = [];

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8500);
    const todayStr = new Date().toISOString().slice(0, 10);

    const [cineMoviesRes, cineSeriesRes, mxMoviesRes, tvMazeWebRes] = await Promise.allSettled([
      fetch('https://cinemeta-catalogs.strem.io/top/catalog/movie/top.json', {
        signal: controller.signal,
        cache: 'no-store',
      }).then((r) => (r.ok ? r.json() : null)),
      fetch('https://cinemeta-catalogs.strem.io/top/catalog/series/top.json', {
        signal: controller.signal,
        cache: 'no-store',
      }).then((r) => (r.ok ? r.json() : null)),
      fetch('https://itunes.apple.com/mx/rss/topmovies/limit=25/json', {
        signal: controller.signal,
        cache: 'no-store',
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`https://api.tvmaze.com/schedule/web?date=${todayStr}`, {
        signal: controller.signal,
        cache: 'no-store',
      }).then((r) => (r.ok ? r.json() : null)),
    ]);

    window.clearTimeout(timer);

    // 1. Películas reales actuales (Cinemeta Top Movies)
    if (cineMoviesRes.status === 'fulfilled' && Array.isArray(cineMoviesRes.value?.metas)) {
      const metas = cineMoviesRes.value.metas as CinemetaMeta[];
      for (const meta of metas) {
        const imdbId = meta.imdb_id || meta.id;
        const title = meta.name?.trim();
        if (!imdbId || !title) continue;

        const posterUrl = `https://images.metahub.space/poster/medium/${imdbId}/img`;
        const backdropUrl = `https://images.metahub.space/background/large/${imdbId}/img`;
        const logoUrl = meta.logo || `https://images.metahub.space/logo/medium/${imdbId}/img`;
        const genreText = translateGenres(meta.genres || meta.genre);
        const year = (meta.releaseInfo || meta.year || '').slice(0, 4);
        const ytTrailer = meta.trailerStreams?.[0]?.ytId || meta.trailers?.[0]?.source;
        const youtubeTarget = resolvePackageAlias(
          'com.google.android.youtube.tv',
          installedApps
        );
        const deepLinkUrl = ytTrailer
          ? `https://www.youtube.com/watch?v=${ytTrailer}`
          : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer español`)}`;

        const item: AppSuggestion = {
          id: `cm-${imdbId}`,
          appName: 'YouTube',
          packageName: youtubeTarget,
          title,
          subtitle: meta.description?.trim() || `${genreText} · En tendencia hoy`,
          deepLinkUrl,
          posterUrl,
          backdropUrl,
          logoUrl,
          imdbRating: meta.imdbRating,
          accentGradient: 'linear-gradient(135deg, #161C29 0%, #27344A 100%)',
          tag: genreText,
          genre: genreText,
          releaseDate: year,
          mediaKind: 'movie',
        };

        movies.push(item);
        if (spotlightCandidates.length < 10) {
          spotlightCandidates.push(item);
        }
      }
    }

    // 2. Cartelera Apple MX en español (solo pósteres 2:3 verticales)
    if (mxMoviesRes.status === 'fulfilled' && Array.isArray(mxMoviesRes.value?.feed?.entry)) {
      const entries = mxMoviesRes.value.feed.entry as ITunesEntry[];
      const youtubeTarget = resolvePackageAlias('com.google.android.youtube.tv', installedApps);
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const title = entry['im:name']?.label?.trim();
        const rawImg = entry['im:image']?.[entry['im:image'].length - 1]?.label;
        if (!title || !rawImg) continue;

        const posterUrl = upscaleAppleImage(rawImg, '600x900bb');
        const genre = entry.category?.attributes?.label || 'Cine';
        const releaseDate = (entry['im:releaseDate']?.attributes?.label || '').slice(-4);
        const synopsis =
          stripHtml(entry.summary?.label) || `${genre} popular en cartelera digital.`;

        movies.push({
          id: `itunes-${entry.id?.attributes?.['im:id'] || i}`,
          appName: 'YouTube',
          packageName: youtubeTarget,
          title,
          subtitle: synopsis,
          deepLinkUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
            `${title} trailer español`
          )}`,
          posterUrl,
          accentGradient: 'linear-gradient(135deg, #141923 0%, #273244 100%)',
          tag: genre,
          genre,
          releaseDate,
          mediaKind: 'movie',
        });
      }
    }

    // 3. Emisiones de HOY en plataformas activas (TVMaze episode landscape still)
    if (tvMazeWebRes.status === 'fulfilled' && Array.isArray(tvMazeWebRes.value)) {
      const schedule = tvMazeWebRes.value as TvMazeScheduleItem[];
      for (const ep of schedule) {
        const show = ep._embedded?.show;
        const epImg = ep.image?.original || ep.image?.medium;
        if (!show?.name || !epImg || !epImg.includes('landscape')) continue;
        const channelName = show.webChannel?.name || show.network?.name || '';
        const mapped = mapPlatformToPackage(channelName, activePlatforms);
        if (!mapped) continue;

        const landscapeUrl = epImg.replace(/^http:\/\//i, 'https://');
        const genres = translateGenres(show.genres);

        series.push({
          id: `tvm-${show.id}`,
          appName: mapped.appName,
          packageName: mapped.packageName,
          title: show.name,
          subtitle: ep.name ? `Hoy: ${ep.name} · ${genres}` : genres,
          deepLinkUrl: mapped.deepLinkUrl,
          posterUrl: landscapeUrl,
          backdropUrl: landscapeUrl,
          imdbRating: show.rating?.average ? String(show.rating.average) : undefined,
          accentGradient: mapped.accentGradient,
          tag: mapped.appName,
          genre: genres,
          mediaKind: 'series',
        });
      }
    }

    // 4. Series populares actuales distribuidas dinámicamente entre plataformas instaladas/activas
    if (cineSeriesRes.status === 'fulfilled' && Array.isArray(cineSeriesRes.value?.metas)) {
      const metas = cineSeriesRes.value.metas as CinemetaMeta[];
      const platPool =
        activePlatforms.length > 0
          ? activePlatforms
          : KNOWN_STREAMING_PLATFORMS.map((p) => ({
              id: p.packageName,
              packageName: p.packageName,
              appName: p.appName,
              deepLinkUrl: p.deepLinkUrl,
              accentGradient: p.accentGradient,
              isInstalled: true,
              isFavorite: false,
            }));

      let platIndex = 0;
      for (const meta of metas) {
        const imdbId = meta.imdb_id || meta.id;
        const title = meta.name?.trim();
        if (!imdbId || !title) continue;

        const target = platPool[platIndex % platPool.length];
        platIndex++;

        const backdrop16x9 = `https://images.metahub.space/background/medium/${imdbId}/img`;
        const heroBackdrop16x9 = `https://images.metahub.space/background/large/${imdbId}/img`;
        const logoUrl = meta.logo || `https://images.metahub.space/logo/medium/${imdbId}/img`;
        const genreText = translateGenres(meta.genres || meta.genre);
        const year = (meta.releaseInfo || meta.year || '').replace(/[–-]$/, '');
        const ytTrailer = meta.trailerStreams?.[0]?.ytId || meta.trailers?.[0]?.source;

        const seriesItem: AppSuggestion = {
          id: `cms-${imdbId}`,
          appName: target.appName,
          packageName: target.packageName,
          title,
          subtitle: `${genreText}${meta.imdbRating ? ` · ★ ${meta.imdbRating}` : ''}`,
          deepLinkUrl:
            target.id === 'com.google.android.youtube.tv' && ytTrailer
              ? `https://www.youtube.com/watch?v=${ytTrailer}`
              : target.deepLinkUrl,
          posterUrl: backdrop16x9,
          backdropUrl: heroBackdrop16x9,
          logoUrl,
          imdbRating: meta.imdbRating,
          accentGradient: target.accentGradient,
          tag: target.appName,
          genre: genreText,
          releaseDate: year,
          mediaKind: 'series',
        };

        series.push(seriesItem);
        if (platIndex <= 8) {
          spotlightCandidates.push({
            ...seriesItem,
            subtitle: meta.description?.trim() || seriesItem.subtitle,
          });
        }
      }
    }

    // Deduplicar primero y rotar sin permitir duplicados entre Spotlight, Películas y Series
    const uniqueSpotlightPool = deduplicateSuggestions(spotlightCandidates);
    const rotatedSpotlight = shuffleWithSeed(uniqueSpotlightPool.slice(0, 14), seed).slice(0, 6);

    const uniqueMoviesPool = deduplicateSuggestions(movies, rotatedSpotlight);
    const rotatedMovies = deduplicateSuggestions(
      [
        ...shuffleWithSeed(uniqueMoviesPool.slice(0, 10), seed + 5).slice(0, 4),
        ...shuffleWithSeed(uniqueMoviesPool.slice(4, 38), seed + 11),
      ],
      rotatedSpotlight
    );

    const visibleMovies = rotatedMovies.slice(0, 24);
    const uniqueSeriesPool = deduplicateSuggestions(series, [
      ...rotatedSpotlight,
      ...visibleMovies,
    ]);
    const rotatedSeries = deduplicateSuggestions(
      [
        ...shuffleWithSeed(uniqueSeriesPool.slice(0, 12), seed + 17).slice(0, 5),
        ...shuffleWithSeed(uniqueSeriesPool.slice(5, 60), seed + 23),
      ],
      [...rotatedSpotlight, ...visibleMovies]
    );

    if (rotatedMovies.length > 0 || rotatedSeries.length > 0) {
      const rawCatalog: GoogleTvLiveCatalog = {
        spotlight:
          rotatedSpotlight.length > 0 ? rotatedSpotlight : OFFLINE_FALLBACK_CATALOG.spotlight,
        movies: rotatedMovies,
        series: rotatedSeries.length > 0 ? rotatedSeries : OFFLINE_FALLBACK_CATALOG.series,
        updatedAt: new Date().toISOString(),
      };

      const cleanCatalog = deduplicateCatalog(rawCatalog, installedApps, favoritePackages);

      try {
        localStorage.setItem(LIVE_FEED_CACHE_KEY, JSON.stringify(cleanCatalog));
      } catch {
        // Ignorar si almacenamiento está lleno
      }
      return cleanCatalog;
    }
  } catch {
    // Si falla la red, usar la última copia guardada antes del respaldo offline
  }

  try {
    const cachedRaw = localStorage.getItem(LIVE_FEED_CACHE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw) as GoogleTvLiveCatalog;
      if (parsed.movies.length > 0 || parsed.series.length > 0) {
        return deduplicateCatalog(parsed, installedApps, favoritePackages);
      }
    }
  } catch {
    // Ignorar
  }

  return deduplicateCatalog(OFFLINE_FALLBACK_CATALOG, installedApps, favoritePackages);
}
