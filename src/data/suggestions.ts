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
  'com.apple.atve.androidtv.appletv': ['com.apple.atv'],
};

export const KNOWN_STREAMING_PLATFORMS = [
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
  {
    appName: 'Apple TV',
    packageName: 'com.apple.atve.androidtv.appletv',
    deepLinkUrl: 'https://tv.apple.com/',
    accentGradient: 'linear-gradient(135deg, #11141A 0%, #1F2937 100%)',
  },
];

const LIVE_FEED_CACHE_KEY = 'vora_daily_live_catalog_v5';

export function getDailyDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailySeed(dateStr?: string, offset = 0): number {
  const str = dateStr || getDailyDateKey();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + offset * 1337;
}

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

export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
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

  const activeOnly = enriched.filter((p) => p.isInstalled || p.isFavorite);
  const baseList = activeOnly.length > 0 ? activeOnly : enriched;

  return [...baseList].sort((a, b) => {
    const scoreA = (a.isFavorite ? 2 : 0) + (a.isInstalled ? 1 : 0);
    const scoreB = (b.isFavorite ? 2 : 0) + (b.isInstalled ? 1 : 0);
    return scoreB - scoreA;
  });
}

export function isValidImageUrl(url?: string): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/|data:image\/|\/)/i.test(trimmed);
}

export function getCatalogPlatforms(
  items: AppSuggestion[],
  installedApps: InstalledApp[] = [],
  favoritePackages: string[] = []
): ActiveStreamingPlatform[] {
  const activePlatforms = getActiveStreamingPlatforms(installedApps, favoritePackages);
  const activeMap = new Map(activePlatforms.map((p) => [p.id, p]));
  const knownMap = new Map(KNOWN_STREAMING_PLATFORMS.map((p) => [p.packageName, p]));
  const installedSet = new Set(installedApps.map((a) => a.packageName));
  const favoriteSet = new Set(favoritePackages);
  const seenIds = new Set<string>();
  const result: ActiveStreamingPlatform[] = [];

  for (const item of items) {
    if (!item.packageName) continue;
    const canonical = getCanonicalPlatformPackage(item.packageName);
    if (seenIds.has(canonical)) continue;
    seenIds.add(canonical);

    const activeMatch = activeMap.get(canonical);
    if (activeMatch) {
      result.push(activeMatch);
      continue;
    }

    const knownMatch = knownMap.get(canonical);
    const resolvedPkg = resolvePackageAlias(item.packageName, installedApps);
    const installedApp = installedApps.find((a) => a.packageName === resolvedPkg);
    result.push({
      id: canonical,
      packageName: resolvedPkg,
      appName: installedApp?.name || knownMatch?.appName || item.appName || canonical,
      deepLinkUrl: knownMatch?.deepLinkUrl || item.deepLinkUrl || '',
      accentGradient:
        knownMatch?.accentGradient ||
        item.accentGradient ||
        'linear-gradient(135deg, #141923 0%, #273244 100%)',
      isInstalled: installedSet.has(resolvedPkg),
      isFavorite: favoriteSet.has(canonical) || favoriteSet.has(resolvedPkg),
    });
  }

  return result.sort((a, b) => {
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
  else if (lower.includes('apple') || lower.includes('apple tv'))
    canonicalId = 'com.apple.atve.androidtv.appletv';
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

// Catálogo base de películas reales con carátulas oficiales y metadatos verificados
export const CURATED_REAL_MOVIES: AppSuggestion[] = [
  {
    id: 'cm-tt15398776',
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    title: 'Oppenheimer',
    subtitle: 'La historia del físico J. Robert Oppenheimer y el desarrollo de la bomba atómica.',
    deepLinkUrl: 'https://app.primevideo.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt15398776/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt15398776/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt15398776/img',
    imdbRating: '8.9',
    accentGradient: 'linear-gradient(135deg, #1C1917 0%, #78350F 100%)',
    tag: 'Biografía · Drama',
    genre: 'Biografía · Drama',
    releaseDate: '2023',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt15239678',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'Dune: Parte Dos',
    subtitle: 'Paul Atreides se une a Chani y los Fremen mientras busca venganza contra los conspiradores.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt15239678/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt15239678/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt15239678/img',
    imdbRating: '8.6',
    accentGradient: 'linear-gradient(135deg, #2D1808 0%, #9A3412 100%)',
    tag: 'Ciencia ficción · Aventura',
    genre: 'Ciencia ficción · Aventura',
    releaseDate: '2024',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt0816692',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'Interstellar',
    subtitle: 'Un equipo de exploradores viaja a través de un agujero de gusano en busca de un nuevo hogar.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt0816692/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt0816692/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt0816692/img',
    imdbRating: '8.7',
    accentGradient: 'linear-gradient(135deg, #091325 0%, #1E3A8A 100%)',
    tag: 'Ciencia ficción · Drama',
    genre: 'Ciencia ficción · Drama',
    releaseDate: '2014',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt9362722',
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    title: 'Spider-Man: Cruzando el Multiverso',
    subtitle: 'Miles Morales viaja a través del Multiverso junto a Gwen Stacy y un nuevo equipo de héroes.',
    deepLinkUrl: 'https://app.primevideo.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt9362722/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt9362722/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt9362722/img',
    imdbRating: '8.6',
    accentGradient: 'linear-gradient(135deg, #20072C 0%, #701A75 100%)',
    tag: 'Animación · Acción',
    genre: 'Animación · Acción',
    releaseDate: '2023',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt1375666',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'El Origen (Inception)',
    subtitle: 'Un ladrón que roba secretos corporativos mediante la tecnología de los sueños recibe su misión definitiva.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt1375666/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt1375666/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt1375666/img',
    imdbRating: '8.8',
    accentGradient: 'linear-gradient(135deg, #0B1727 0%, #1E293B 100%)',
    tag: 'Ciencia ficción · Acción',
    genre: 'Ciencia ficción · Acción',
    releaseDate: '2010',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt1877830',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'The Batman',
    subtitle: 'Batman investiga la corrupción en Gotham City mientras persigue a un sádico asesino en serie.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt1877830/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt1877830/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt1877830/img',
    imdbRating: '7.8',
    accentGradient: 'linear-gradient(135deg, #18090C 0%, #881337 100%)',
    tag: 'Crimen · Acción',
    genre: 'Crimen · Acción',
    releaseDate: '2022',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt14230458',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'Deadpool & Wolverine',
    subtitle: 'Wolverine recuperándose de sus heridas se cruza con el bocazas Deadpool en una aventura multiversal.',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: 'https://images.metahub.space/poster/medium/tt14230458/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt14230458/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt14230458/img',
    imdbRating: '7.7',
    accentGradient: 'linear-gradient(135deg, #240A0D 0%, #991B1B 100%)',
    tag: 'Acción · Comedia',
    genre: 'Acción · Comedia',
    releaseDate: '2024',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt11315808',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'Alien: Romulus',
    subtitle: 'Jóvenes colonizadores espaciales se enfrentan a la forma de vida más aterradora del universo.',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: 'https://images.metahub.space/poster/medium/tt11315808/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt11315808/img',
    imdbRating: '7.2',
    accentGradient: 'linear-gradient(135deg, #091316 0%, #155E75 100%)',
    tag: 'Terror · Ciencia ficción',
    genre: 'Terror · Ciencia ficción',
    releaseDate: '2024',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt15354916',
    appName: 'YouTube',
    packageName: 'com.google.android.youtube.tv',
    title: 'Gladiator II',
    subtitle: 'Años después de presenciar la muerte de Máximo, Lucio debe entrar al Coliseo para salvar Roma.',
    deepLinkUrl: 'https://www.youtube.com/tv#/explore',
    posterUrl: 'https://images.metahub.space/poster/medium/tt15354916/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt15354916/img',
    imdbRating: '6.8',
    accentGradient: 'linear-gradient(135deg, #2A1407 0%, #B45309 100%)',
    tag: 'Acción · Drama',
    genre: 'Acción · Drama',
    releaseDate: '2024',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt1517268',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'Barbie',
    subtitle: 'Barbie y Ken disfrutan de Barbieland hasta que un viaje al mundo real lo cambia todo.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt1517268/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt1517268/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt1517268/img',
    imdbRating: '6.8',
    accentGradient: 'linear-gradient(135deg, #2A081D 0%, #BE185D 100%)',
    tag: 'Comedia · Aventura',
    genre: 'Comedia · Aventura',
    releaseDate: '2023',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt1630029',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'Avatar: El Sentido del Agua',
    subtitle: 'Jake Sully y Neytiri forman una familia y exploran los impresionantes arrecifes de Pandora.',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: 'https://images.metahub.space/poster/medium/tt1630029/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt1630029/img',
    imdbRating: '7.6',
    accentGradient: 'linear-gradient(135deg, #071724 0%, #0369A1 100%)',
    tag: 'Ciencia ficción · Aventura',
    genre: 'Ciencia ficción · Aventura',
    releaseDate: '2022',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt1745960',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Top Gun: Maverick',
    subtitle: 'Tras treinta años de servicio, Maverick regresa para liderar una peligrosa misión de combate.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/poster/medium/tt1745960/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt1745960/img',
    imdbRating: '8.2',
    accentGradient: 'linear-gradient(135deg, #1C110A 0%, #C2410C 100%)',
    tag: 'Acción · Drama',
    genre: 'Acción · Drama',
    releaseDate: '2022',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt0468569',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'El Caballero de la Noche',
    subtitle: 'Batman se enfrenta a su mayor desafío psicológico cuando el Joker desata el caos en Gotham.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt0468569/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt0468569/img',
    imdbRating: '9.0',
    accentGradient: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
    tag: 'Acción · Crimen',
    genre: 'Acción · Crimen',
    releaseDate: '2008',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt6710474',
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    title: 'Todo a la vez en todas partes',
    subtitle: 'Una inmigrante china en EE. UU. se ve envuelta en una aventura salvaje conectando universos paralelos.',
    deepLinkUrl: 'https://app.primevideo.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt6710474/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt6710474/img',
    imdbRating: '7.8',
    accentGradient: 'linear-gradient(135deg, #1F0D24 0%, #6B21A8 100%)',
    tag: 'Ciencia ficción · Comedia',
    genre: 'Ciencia ficción · Comedia',
    releaseDate: '2022',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt12476678',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'Pobres Criaturas',
    subtitle: 'La increíble historia de Bella Baxter, una joven resucitada por un excéntrico científico.',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: 'https://images.metahub.space/poster/medium/tt12476678/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt12476678/img',
    imdbRating: '7.9',
    accentGradient: 'linear-gradient(135deg, #18181B 0%, #4D7C0F 100%)',
    tag: 'Drama · Comedia',
    genre: 'Drama · Comedia',
    releaseDate: '2023',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt0133093',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'Matrix',
    subtitle: 'Un programador informático descubre que la realidad es una simulación creada por máquinas.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt0133093/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt0133093/img',
    imdbRating: '8.7',
    accentGradient: 'linear-gradient(135deg, #051A10 0%, #15803D 100%)',
    tag: 'Ciencia ficción · Acción',
    genre: 'Ciencia ficción · Acción',
    releaseDate: '1999',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt1856101',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Blade Runner 2049',
    subtitle: 'Un nuevo blade runner descubre un secreto enterrado que podría sumir a la sociedad en el caos.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/poster/medium/tt1856101/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt1856101/img',
    imdbRating: '8.0',
    accentGradient: 'linear-gradient(135deg, #231205 0%, #EA580C 100%)',
    tag: 'Ciencia ficción · Misterio',
    genre: 'Ciencia ficción · Misterio',
    releaseDate: '2017',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt1853728',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Django Desencadenado',
    subtitle: 'Con la ayuda de un cazarrecompensas alemán, un esclavo liberado se propone rescatar a su esposa.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/poster/medium/tt1853728/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt1853728/img',
    imdbRating: '8.5',
    accentGradient: 'linear-gradient(135deg, #1C0A0A 0%, #7F1D1D 100%)',
    tag: 'Western · Drama',
    genre: 'Western · Drama',
    releaseDate: '2012',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt6751668',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'Parásitos (Parasite)',
    subtitle: 'Una familia sin empleo se infiltra ingeniosamente en el hogar de una adinerada dinastía.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt6751668/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt6751668/img',
    imdbRating: '8.5',
    accentGradient: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
    tag: 'Drama · Suspenso',
    genre: 'Drama · Suspenso',
    releaseDate: '2019',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt10872600',
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    title: 'Spider-Man: No Way Home',
    subtitle: 'Peter Parker recurre al Doctor Strange para que el mundo olvide su identidad, desatando el multiverso.',
    deepLinkUrl: 'https://app.primevideo.com/',
    posterUrl: 'https://images.metahub.space/poster/medium/tt10872600/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt10872600/img',
    imdbRating: '8.2',
    accentGradient: 'linear-gradient(135deg, #1E0E18 0%, #9D174D 100%)',
    tag: 'Acción · Aventura',
    genre: 'Acción · Aventura',
    releaseDate: '2021',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt2380307',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'Coco',
    subtitle: 'Miguel viaja a la mágica Tierra de los Muertos para descubrir el verdadero legado de su familia.',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: 'https://images.metahub.space/poster/medium/tt2380307/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt2380307/img',
    imdbRating: '8.4',
    accentGradient: 'linear-gradient(135deg, #241108 0%, #D97706 100%)',
    tag: 'Animación · Familiar',
    genre: 'Animación · Familiar',
    releaseDate: '2017',
    mediaKind: 'movie',
  },
  {
    id: 'cm-tt0245429',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'El Viaje de Chihiro',
    subtitle: 'Durante el traslado de su familia, una niña entra en un mundo gobernado por dioses y brujas.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/poster/medium/tt0245429/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt0245429/img',
    imdbRating: '8.6',
    accentGradient: 'linear-gradient(135deg, #142019 0%, #047857 100%)',
    tag: 'Animación · Aventura',
    genre: 'Animación · Aventura',
    releaseDate: '2001',
    mediaKind: 'movie',
  },
];

// Catálogo base de series reales con carátulas horizontales y verticales oficiales
export const CURATED_REAL_SERIES: AppSuggestion[] = [
  {
    id: 'cms-tt3581920',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'The Last of Us',
    subtitle: 'Joel y Ellie deben sobrevivir a un viaje a través de unos Estados Unidos postapocalípticos.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/background/medium/tt3581920/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt3581920/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt3581920/img',
    imdbRating: '8.8',
    accentGradient: 'linear-gradient(135deg, #1C1A14 0%, #854D0E 100%)',
    tag: 'Drama · Aventura',
    genre: 'Drama · Aventura',
    releaseDate: '2023',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt10638522',
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    title: 'Fallout',
    subtitle: 'Una pacífica habitante del refugio se adentra en el implacable páramo nuclear de Los Ángeles.',
    deepLinkUrl: 'https://app.primevideo.com/',
    posterUrl: 'https://images.metahub.space/background/medium/tt10638522/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt10638522/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt10638522/img',
    imdbRating: '8.4',
    accentGradient: 'linear-gradient(135deg, #0A1E2F 0%, #0284C7 100%)',
    tag: 'Ciencia ficción · Aventura',
    genre: 'Ciencia ficción · Aventura',
    releaseDate: '2024',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt11280740',
    appName: 'Apple TV',
    packageName: 'com.apple.atve.androidtv.appletv',
    title: 'Severance',
    subtitle: 'Mark lidera un equipo de empleados cuyos recuerdos se dividen quirúrgicamente entre trabajo y vida personal.',
    deepLinkUrl: 'https://tv.apple.com/',
    posterUrl: 'https://images.metahub.space/background/medium/tt11280740/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt11280740/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt11280740/img',
    imdbRating: '8.7',
    accentGradient: 'linear-gradient(135deg, #081C24 0%, #0E7490 100%)',
    tag: 'Suspenso · Ciencia ficción',
    genre: 'Suspenso · Ciencia ficción',
    releaseDate: '2022',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt4574334',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Stranger Things',
    subtitle: 'Cuando un niño desaparece, sus amigos y una niña con telequinesis destapan una dimensión oscura.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/background/medium/tt4574334/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt4574334/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt4574334/img',
    imdbRating: '8.7',
    accentGradient: 'linear-gradient(135deg, #240A0D 0%, #991B1B 100%)',
    tag: 'Terror · Ciencia ficción',
    genre: 'Terror · Ciencia ficción',
    releaseDate: '2016',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt11126994',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Arcane',
    subtitle: 'En medio del conflicto entre las ciudades gemelas de Piltóver y Zaun, dos hermanas luchan en bandos opuestos.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/background/medium/tt11126994/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt11126994/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt11126994/img',
    imdbRating: '9.0',
    accentGradient: 'linear-gradient(135deg, #210E2A 0%, #7E22CE 100%)',
    tag: 'Animación · Acción',
    genre: 'Animación · Acción',
    releaseDate: '2021',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt10574558',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'The Bear',
    subtitle: 'Un joven chef del mundo de la alta cocina regresa a Chicago para dirigir la tienda de sándwiches de su familia.',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: 'https://images.metahub.space/background/medium/tt10574558/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt10574558/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt10574558/img',
    imdbRating: '8.6',
    accentGradient: 'linear-gradient(135deg, #1C120C 0%, #C2410C 100%)',
    tag: 'Comedia · Drama',
    genre: 'Comedia · Drama',
    releaseDate: '2022',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt11198330',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'La Casa del Dragón',
    subtitle: 'La historia de la Casa Targaryen 200 años antes de los eventos que sacudieron Poniente.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/background/medium/tt11198330/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt11198330/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt11198330/img',
    imdbRating: '8.4',
    accentGradient: 'linear-gradient(135deg, #240A0D 0%, #991B1B 100%)',
    tag: 'Fantasía · Drama',
    genre: 'Fantasía · Drama',
    releaseDate: '2022',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt1190634',
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    title: 'The Boys',
    subtitle: 'Un grupo de vigilantes se propone desenmascarar a superhéroes corruptos que abusan de sus poderes.',
    deepLinkUrl: 'https://app.primevideo.com/',
    posterUrl: 'https://images.metahub.space/background/medium/tt1190634/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt1190634/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt1190634/img',
    imdbRating: '8.7',
    accentGradient: 'linear-gradient(135deg, #091A28 0%, #0369A1 100%)',
    tag: 'Acción · Comedia',
    genre: 'Acción · Comedia',
    releaseDate: '2019',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt7660850',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'Succession',
    subtitle: 'La familia Roy contempla su futuro cuando su anciano padre comienza a retirarse del conglomerado mediático.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/background/medium/tt7660850/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt7660850/img',
    logoUrl: 'https://images.metahub.space/logo/medium/tt7660850/img',
    imdbRating: '8.9',
    accentGradient: 'linear-gradient(135deg, #18181B 0%, #3F3F46 100%)',
    tag: 'Drama',
    genre: 'Drama',
    releaseDate: '2018',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt0903747',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Breaking Bad',
    subtitle: 'Un profesor de química de secundaria diagnosticado con cáncer se asocia con un exalumno.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/background/medium/tt0903747/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt0903747/img',
    imdbRating: '9.5',
    accentGradient: 'linear-gradient(135deg, #061B12 0%, #15803D 100%)',
    tag: 'Crimen · Drama',
    genre: 'Crimen · Drama',
    releaseDate: '2008',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt3032476',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Better Call Saul',
    subtitle: 'Las pruebas y tribulaciones del abogado penalista Jimmy McGill antes de establecer su icónico bufete.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/background/medium/tt3032476/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt3032476/img',
    imdbRating: '9.0',
    accentGradient: 'linear-gradient(135deg, #1C1408 0%, #B45309 100%)',
    tag: 'Crimen · Drama',
    genre: 'Crimen · Drama',
    releaseDate: '2015',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt2788316',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Peaky Blinders',
    subtitle: 'Una familia de gánsteres de Birmingham asciende en poder tras la Primera Guerra Mundial.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/background/medium/tt2788316/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt2788316/img',
    imdbRating: '8.8',
    accentGradient: 'linear-gradient(135deg, #14171F 0%, #334155 100%)',
    tag: 'Crimen · Drama',
    genre: 'Crimen · Drama',
    releaseDate: '2013',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt2085059',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Black Mirror',
    subtitle: 'Una serie de antología que explora un futuro retorcido y de alta tecnología donde chocan innovaciones y pasiones humanas.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/background/medium/tt2085059/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt2085059/img',
    imdbRating: '8.7',
    accentGradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
    tag: 'Ciencia ficción · Drama',
    genre: 'Ciencia ficción · Drama',
    releaseDate: '2011',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt5753856',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Dark',
    subtitle: 'La desaparición de dos niños en un pueblo alemán expone las relaciones fracturadas entre cuatro familias.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/background/medium/tt5753856/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt5753856/img',
    imdbRating: '8.7',
    accentGradient: 'linear-gradient(135deg, #181512 0%, #713F12 100%)',
    tag: 'Ciencia ficción · Misterio',
    genre: 'Ciencia ficción · Misterio',
    releaseDate: '2017',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt10919420',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'El Juego del Calamar',
    subtitle: 'Cientos de personas con dificultades económicas aceptan una extraña invitación para competir en juegos infantiles.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/background/medium/tt10919420/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt10919420/img',
    imdbRating: '8.0',
    accentGradient: 'linear-gradient(135deg, #2A091A 0%, #DB2777 100%)',
    tag: 'Suspenso · Drama',
    genre: 'Suspenso · Drama',
    releaseDate: '2021',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt9288030',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Miércoles (Wednesday)',
    subtitle: 'Miércoles Addams asiste a la Academia Nevermore donde intenta dominar su habilidad psíquica emergente.',
    deepLinkUrl: 'https://www.netflix.com/browse',
    posterUrl: 'https://images.metahub.space/background/medium/tt9288030/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt9288030/img',
    imdbRating: '8.1',
    accentGradient: 'linear-gradient(135deg, #13111C 0%, #4C1D95 100%)',
    tag: 'Comedia · Fantasía',
    genre: 'Comedia · Fantasía',
    releaseDate: '2022',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt8111088',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'The Mandalorian',
    subtitle: 'Los viajes de un pistolero solitario en los confines exteriores de la galaxia, lejos de la Nueva República.',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: 'https://images.metahub.space/background/medium/tt8111088/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt8111088/img',
    imdbRating: '8.6',
    accentGradient: 'linear-gradient(135deg, #1C140D 0%, #D97706 100%)',
    tag: 'Ciencia ficción · Acción',
    genre: 'Ciencia ficción · Acción',
    releaseDate: '2019',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt9140554',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'Loki',
    subtitle: 'El mercurial villano Loki retoma su papel como el Dios de la Travesura en una serie ambientada tras Avengers: Endgame.',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: 'https://images.metahub.space/background/medium/tt9140554/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt9140554/img',
    imdbRating: '8.2',
    accentGradient: 'linear-gradient(135deg, #091A12 0%, #059669 100%)',
    tag: 'Ciencia ficción · Aventura',
    genre: 'Ciencia ficción · Aventura',
    releaseDate: '2021',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt9253284',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'Andor',
    subtitle: 'En una era llena de peligros y engaños, Cassian Andor descubre la diferencia que puede marcar en la Rebelión.',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: 'https://images.metahub.space/background/medium/tt9253284/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt9253284/img',
    imdbRating: '8.4',
    accentGradient: 'linear-gradient(135deg, #131924 0%, #2563EB 100%)',
    tag: 'Ciencia ficción · Suspenso',
    genre: 'Ciencia ficción · Suspenso',
    releaseDate: '2022',
    mediaKind: 'series',
  },
  {
    id: 'cms-tt13622776',
    appName: 'Max',
    packageName: 'com.wbd.stream',
    title: 'El Pingüino',
    subtitle: 'Oz Cobb busca adueñarse del vacío de poder en los bajos fondos criminales de Gotham.',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.metahub.space/background/medium/tt13622776/img',
    backdropUrl: 'https://images.metahub.space/background/large/tt13622776/img',
    imdbRating: '8.8',
    accentGradient: 'linear-gradient(135deg, #181014 0%, #4A044E 100%)',
    tag: 'Crimen · Drama',
    genre: 'Crimen · Drama',
    releaseDate: '2024',
    mediaKind: 'series',
  },
];

export const OFFLINE_FALLBACK_CATALOG: GoogleTvLiveCatalog = {
  spotlight: CURATED_REAL_MOVIES.slice(0, 5),
  movies: CURATED_REAL_MOVIES,
  series: CURATED_REAL_SERIES,
  updatedAt: new Date().toISOString(),
};

let manualRefreshOffset = 0;

export interface FetchCatalogOptions {
  force?: boolean;
  installedApps?: InstalledApp[];
  favoritePackages?: string[];
  dateKey?: string;
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

  const todayDateStr = options.dateKey || getDailyDateKey();

  if (forceRefresh) {
    manualRefreshOffset += 1;
  }

  // 1. Si no es un refresco forzado, intentar servir de inmediato la copia estable del día en caché
  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(LIVE_FEED_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as {
          dateKey?: string;
          catalog: GoogleTvLiveCatalog;
          cachedAt?: number;
        };
        if (
          cached.dateKey === todayDateStr &&
          cached.catalog &&
          cached.catalog.movies?.length > 0 &&
          cached.catalog.series?.length > 0
        ) {
          return deduplicateCatalog(cached.catalog, installedApps, favoritePackages);
        }
      }
    } catch {
      // Continuar si falla lectura de almacenamiento
    }
  }

  // 2. Semilla determinista del día actual:
  // Garantiza que a lo largo del mismo día la selección sea completamente estable sin saltos de vista,
  // y que al pasar al día siguiente rote automáticamente a un conjunto diferente de títulos.
  const daySeed = getDailySeed(todayDateStr, manualRefreshOffset);

  const movies: AppSuggestion[] = [...CURATED_REAL_MOVIES];
  const series: AppSuggestion[] = [...CURATED_REAL_SERIES];
  const spotlightCandidates: AppSuggestion[] = [];

  // Consulta dinámica de género según el día de la semana para enriquecer títulos reales distintos cada día
  const dayOfWeek = new Date().getDay();
  const rotatingGenreMovie =
    dayOfWeek === 1 ? 'Action' : dayOfWeek === 2 ? 'Sci-Fi' : dayOfWeek === 3 ? 'Animation' : 'Adventure';
  const rotatingGenreSeries = dayOfWeek % 2 === 0 ? 'Drama' : 'Sci-Fi';

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6500);

    const [cineMoviesRes, cineSeriesRes, cineGenreRes, cineSeriesGenreRes, mxMoviesRes, tvMazeWebRes] =
      await Promise.allSettled([
        fetch('https://cinemeta-catalogs.strem.io/top/catalog/movie/top.json', {
          signal: controller.signal,
          cache: 'no-store',
        }).then((r) => (r.ok ? r.json() : null)),
        fetch('https://cinemeta-catalogs.strem.io/top/catalog/series/top.json', {
          signal: controller.signal,
          cache: 'no-store',
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(
          `https://cinemeta-catalogs.strem.io/top/catalog/movie/top/genre=${rotatingGenreMovie}.json`,
          {
            signal: controller.signal,
            cache: 'no-store',
          }
        ).then((r) => (r.ok ? r.json() : null)),
        fetch(
          `https://cinemeta-catalogs.strem.io/top/catalog/series/top/genre=${rotatingGenreSeries}.json`,
          {
            signal: controller.signal,
            cache: 'no-store',
          }
        ).then((r) => (r.ok ? r.json() : null)),
        fetch('https://itunes.apple.com/mx/rss/topmovies/limit=30/json', {
          signal: controller.signal,
          cache: 'no-store',
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`https://api.tvmaze.com/schedule/web?date=${todayDateStr}`, {
          signal: controller.signal,
          cache: 'no-store',
        }).then((r) => (r.ok ? r.json() : null)),
      ]);

    window.clearTimeout(timer);

    const processCinemetaList = (
      metas: CinemetaMeta[] | undefined,
      kind: 'movie' | 'series',
      targetArray: AppSuggestion[]
    ) => {
      if (!Array.isArray(metas)) return;
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

      let idx = 0;
      for (const meta of metas) {
        const imdbId = meta.imdb_id || meta.id;
        const title = meta.name?.trim();
        if (!imdbId || !title) continue;

        const target = platPool[idx % platPool.length];
        idx++;

        const posterUrl = `https://images.metahub.space/poster/medium/${imdbId}/img`;
        const backdropUrl = `https://images.metahub.space/background/large/${imdbId}/img`;
        const logoUrl = meta.logo || `https://images.metahub.space/logo/medium/${imdbId}/img`;
        const genreText = translateGenres(meta.genres || meta.genre);
        const year = (meta.releaseInfo || meta.year || '').slice(0, 4);
        const ytTrailer = meta.trailerStreams?.[0]?.ytId || meta.trailers?.[0]?.source;
        const deepLinkUrl =
          target.id === 'com.google.android.youtube.tv' && ytTrailer
            ? `https://www.youtube.com/watch?v=${ytTrailer}`
            : target.deepLinkUrl;

        const item: AppSuggestion = {
          id: `${kind === 'movie' ? 'cm-' : 'cms-'}${imdbId}`,
          appName: target.appName,
          packageName: target.packageName,
          title,
          subtitle: meta.description?.trim() || `${genreText} · Estreno popular`,
          deepLinkUrl,
          posterUrl: kind === 'movie' ? posterUrl : backdropUrl,
          backdropUrl,
          logoUrl,
          imdbRating: meta.imdbRating,
          accentGradient: target.accentGradient,
          tag: target.appName,
          genre: genreText,
          releaseDate: year,
          mediaKind: kind,
        };

        targetArray.push(item);
        if (meta.description && backdropUrl && spotlightCandidates.length < 16) {
          spotlightCandidates.push(item);
        }
      }
    };

    if (cineMoviesRes.status === 'fulfilled') {
      processCinemetaList(cineMoviesRes.value?.metas as CinemetaMeta[], 'movie', movies);
    }

    if (cineGenreRes.status === 'fulfilled') {
      processCinemetaList(cineGenreRes.value?.metas as CinemetaMeta[], 'movie', movies);
    }

    if (cineSeriesRes.status === 'fulfilled') {
      processCinemetaList(cineSeriesRes.value?.metas as CinemetaMeta[], 'series', series);
    }

    if (cineSeriesGenreRes.status === 'fulfilled') {
      processCinemetaList(cineSeriesGenreRes.value?.metas as CinemetaMeta[], 'series', series);
    }

    // Cartelera Apple MX
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

    // Emisiones de hoy TVMaze
    if (tvMazeWebRes.status === 'fulfilled' && Array.isArray(tvMazeWebRes.value)) {
      const schedule = tvMazeWebRes.value as TvMazeScheduleItem[];
      for (const ep of schedule) {
        const show = ep._embedded?.show;
        const epImg = ep.image?.original || ep.image?.medium;
        if (!show?.name || !epImg) continue;
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
  } catch {
    // Si falla la red, el catálogo base curado asegura disponibilidad inmediata
  }

  // 3. Rotación determinista diaria:
  // Utiliza el índice de días calendario y la semilla diaria para que cada día presente títulos completamente distintos
  const dayIndex = Math.floor(
    new Date(todayDateStr + 'T12:00:00Z').getTime() / 86400000
  );

  const allSpotlightPool = deduplicateSuggestions([
    ...spotlightCandidates,
    ...CURATED_REAL_SERIES.filter((s) => s.backdropUrl),
    ...CURATED_REAL_MOVIES.filter((m) => m.backdropUrl),
  ]);

  const spotOffset = allSpotlightPool.length > 0 ? (dayIndex % 5) * 4 % allSpotlightPool.length : 0;
  const shiftedSpotlight = [
    ...allSpotlightPool.slice(spotOffset),
    ...allSpotlightPool.slice(0, spotOffset),
  ];
  const rotatedSpotlight = shuffleWithSeed(shiftedSpotlight, daySeed).slice(0, 6);

  const uniqueMoviesPool = deduplicateSuggestions(movies, rotatedSpotlight);
  const movieOffset = uniqueMoviesPool.length > 0 ? (dayIndex % 7) * 6 % uniqueMoviesPool.length : 0;
  const shiftedMovies = [
    ...uniqueMoviesPool.slice(movieOffset),
    ...uniqueMoviesPool.slice(0, movieOffset),
  ];
  const rotatedMovies = shuffleWithSeed(shiftedMovies, daySeed + 509).slice(0, 24);

  const uniqueSeriesPool = deduplicateSuggestions(series, [
    ...rotatedSpotlight,
    ...rotatedMovies,
  ]);
  const seriesOffset = uniqueSeriesPool.length > 0 ? (dayIndex % 7) * 6 % uniqueSeriesPool.length : 0;
  const shiftedSeries = [
    ...uniqueSeriesPool.slice(seriesOffset),
    ...uniqueSeriesPool.slice(0, seriesOffset),
  ];
  const rotatedSeries = shuffleWithSeed(shiftedSeries, daySeed + 997).slice(0, 24);

  const rawCatalog: GoogleTvLiveCatalog = {
    spotlight: rotatedSpotlight.length > 0 ? rotatedSpotlight : OFFLINE_FALLBACK_CATALOG.spotlight,
    movies: rotatedMovies.length > 0 ? rotatedMovies : OFFLINE_FALLBACK_CATALOG.movies,
    series: rotatedSeries.length > 0 ? rotatedSeries : OFFLINE_FALLBACK_CATALOG.series,
    updatedAt: new Date().toISOString(),
  };

  const cleanCatalog = deduplicateCatalog(rawCatalog, installedApps, favoritePackages);

  try {
    localStorage.setItem(
      LIVE_FEED_CACHE_KEY,
      JSON.stringify({
        dateKey: todayDateStr,
        catalog: cleanCatalog,
        cachedAt: Date.now(),
      })
    );
  } catch {
    // Silencioso si almacenamiento está lleno
  }

  return cleanCatalog;
}
