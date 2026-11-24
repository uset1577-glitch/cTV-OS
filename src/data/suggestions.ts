import type { AppSuggestion, GoogleTvLiveCatalog, InstalledApp } from '../types/launcher';

const PACKAGE_ALIASES: Record<string, string[]> = {
  'com.wbd.stream': ['com.hbo.hbonow', 'com.hbomax', 'com.hbo.android.app'],
  'com.google.android.youtube.tv': ['com.liskovsoft.smarttubetv.beta', 'com.liskovsoft.smarttubetv'],
  'com.amazon.amazonvideo.livingroom': ['com.amazon.avod.thirdpartyclient'],
};

const LIVE_FEED_CACHE_KEY = 'ctvos_gtv_live_feed_v2';

interface ITunesEntry {
  id?: { attributes?: { 'im:id'?: string } };
  'im:name'?: { label?: string };
  'im:collection'?: { 'im:name'?: { label?: string } };
  'im:image'?: Array<{ label?: string }>;
  'im:releaseDate'?: { attributes?: { label?: string } };
  category?: { attributes?: { label?: string } };
  summary?: { label?: string };
  link?: Array<{ attributes?: { href?: string } }>;
}

interface TvMazeScheduleItem {
  _embedded?: {
    show?: {
      id: number;
      name: string;
      language?: string;
      genres?: string[];
      summary?: string;
      rating?: { average?: number | null };
      image?: { medium?: string; original?: string } | null;
      webChannel?: { name?: string } | null;
    };
  };
}

function stripHtml(text?: string): string {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function upscaleAppleImage(url: string, size = '600x900bb'): string {
  return url.replace(/\/\d+x\d+bb\.(png|jpg|jpeg)/i, `/${size}.$1`);
}

function mapPlatformToPackage(channelName: string): {
  appName: string;
  packageName: string;
  deepLinkUrl: string;
  accentGradient: string;
  tag: string;
} | null {
  const lower = channelName.toLowerCase();
  if (lower.includes('netflix')) {
    return {
      appName: 'Netflix',
      packageName: 'com.netflix.ninja',
      deepLinkUrl: 'https://www.netflix.com/browse',
      accentGradient: 'linear-gradient(135deg, #2B0909 0%, #8E1218 100%)',
      tag: 'Netflix',
    };
  }
  if (lower.includes('hbo') || lower.includes('max')) {
    return {
      appName: 'Max',
      packageName: 'com.wbd.stream',
      deepLinkUrl: 'https://play.max.com/',
      accentGradient: 'linear-gradient(135deg, #0D163A 0%, #1E3A8A 100%)',
      tag: 'Max',
    };
  }
  if (lower.includes('amazon') || lower.includes('prime')) {
    return {
      appName: 'Prime Video',
      packageName: 'com.amazon.amazonvideo.livingroom',
      deepLinkUrl: 'https://app.primevideo.com/',
      accentGradient: 'linear-gradient(135deg, #0A2538 0%, #0369A1 100%)',
      tag: 'Prime Video',
    };
  }
  if (lower.includes('disney')) {
    return {
      appName: 'Disney+',
      packageName: 'com.disney.disneyplus',
      deepLinkUrl: 'https://www.disneyplus.com/home',
      accentGradient: 'linear-gradient(135deg, #0D1A3D 0%, #1D4ED8 100%)',
      tag: 'Disney+',
    };
  }
  if (lower.includes('youtube')) {
    return {
      appName: 'YouTube',
      packageName: 'com.google.android.youtube.tv',
      deepLinkUrl: 'https://www.youtube.com/tv#/explore',
      accentGradient: 'linear-gradient(135deg, #3A0A14 0%, #991B1B 100%)',
      tag: 'YouTube',
    };
  }
  return null;
}

// Respaldo limpio sin imágenes IA por si el TV está completamente sin internet
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
  updatedAt: new Date().toISOString().slice(0, 10),
};

// Consulta catálogos públicos reales actualizados hoy (sin imágenes IA, sin API key)
export async function fetchGoogleTvLiveCatalog(forceRefresh = false): Promise<GoogleTvLiveCatalog> {
  const todayKey = new Date().toISOString().slice(0, 10);

  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(LIVE_FEED_CACHE_KEY);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw) as GoogleTvLiveCatalog;
        if (parsed.updatedAt === todayKey && parsed.movies.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignorar error de lectura de caché
    }
  }

  const movies: AppSuggestion[] = [];
  const series: AppSuggestion[] = [];

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 7000);

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    const [mxMoviesRes, usTvRes, tvMazeTodayRes, tvMazeYestRes] = await Promise.allSettled([
      fetch('https://itunes.apple.com/mx/rss/topmovies/limit=25/json', {
        signal: controller.signal,
      }).then((r) => (r.ok ? r.json() : null)),
      fetch('https://itunes.apple.com/us/rss/toptvepisodes/limit=25/json', {
        signal: controller.signal,
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`https://api.tvmaze.com/schedule/web?date=${todayStr}`, {
        signal: controller.signal,
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`https://api.tvmaze.com/schedule/web?date=${yesterdayStr}`, {
        signal: controller.signal,
      }).then((r) => (r.ok ? r.json() : null)),
    ]);

    window.clearTimeout(timer);

    // 1. Películas reales actuales (Apple / iTunes MX Top Movies en español)
    if (mxMoviesRes.status === 'fulfilled' && mxMoviesRes.value?.feed?.entry) {
      const entries = mxMoviesRes.value.feed.entry as ITunesEntry[];
      const seenTitles = new Set<string>();

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const title = entry['im:name']?.label?.trim();
        const rawImg = entry['im:image']?.[entry['im:image'].length - 1]?.label;
        if (!title || !rawImg || seenTitles.has(title)) continue;
        seenTitles.add(title);

        const posterUrl = upscaleAppleImage(rawImg, '600x900bb');
        const backdropUrl = upscaleAppleImage(rawImg, '900x1350bb');
        const genre = entry.category?.attributes?.label || 'Cine';
        const releaseDate = entry['im:releaseDate']?.attributes?.label || '';
        const synopsis =
          stripHtml(entry.summary?.label) || `${genre} disponible en cartelera digital.`;
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
          `${title} trailer español`
        )}`;

        movies.push({
          id: `mov-${entry.id?.attributes?.['im:id'] || i}`,
          appName: 'YouTube',
          packageName: 'com.google.android.youtube.tv',
          title,
          subtitle: synopsis,
          deepLinkUrl: searchUrl,
          posterUrl,
          backdropUrl,
          accentGradient: 'linear-gradient(135deg, #141923 0%, #273244 100%)',
          tag: genre,
          genre,
          releaseDate,
          mediaKind: 'movie',
        });
      }
    }

    // 2. Programas reales transmitidos hoy en plataformas (TVMaze live schedule)
    const seenShows = new Set<string>();
    const scheduleArrays = [
      tvMazeTodayRes.status === 'fulfilled' && Array.isArray(tvMazeTodayRes.value)
        ? (tvMazeTodayRes.value as TvMazeScheduleItem[])
        : [],
      tvMazeYestRes.status === 'fulfilled' && Array.isArray(tvMazeYestRes.value)
        ? (tvMazeYestRes.value as TvMazeScheduleItem[])
        : [],
    ];

    for (const list of scheduleArrays) {
      for (const item of list) {
        const show = item._embedded?.show;
        const channel = show?.webChannel?.name;
        const img = show?.image?.original || show?.image?.medium;
        if (!show?.name || !channel || !img) continue;

        const mapped = mapPlatformToPackage(channel);
        if (!mapped) continue;

        const dedupeKey = `${mapped.packageName}:${show.name}`;
        if (seenShows.has(dedupeKey)) continue;
        seenShows.add(dedupeKey);

        const genres = show.genres?.slice(0, 2).join(' · ') || 'Emisión de hoy';
        const score = show.rating?.average ? ` · ★ ${show.rating.average}` : '';

        series.push({
          id: `tvm-${show.id}`,
          appName: mapped.appName,
          packageName: mapped.packageName,
          title: show.name,
          subtitle: `${genres}${score}`,
          deepLinkUrl: mapped.deepLinkUrl,
          posterUrl: img.replace(/^http:\/\//i, 'https://'),
          backdropUrl: (show.image?.original || img).replace(/^http:\/\//i, 'https://'),
          accentGradient: mapped.accentGradient,
          tag: mapped.tag,
          genre: genres,
          mediaKind: 'series',
        });
      }
    }

    // 3. Series top actuales (Apple / iTunes Top TV) para enriquecer la fila de series
    if (usTvRes.status === 'fulfilled' && usTvRes.value?.feed?.entry) {
      const entries = usTvRes.value.feed.entry as ITunesEntry[];
      const platformCycle = [
        { appName: 'Max', pkg: 'com.wbd.stream', url: 'https://play.max.com/' },
        { appName: 'Prime Video', pkg: 'com.amazon.amazonvideo.livingroom', url: 'https://app.primevideo.com/' },
        { appName: 'Netflix', pkg: 'com.netflix.ninja', url: 'https://www.netflix.com/browse' },
        { appName: 'Disney+', pkg: 'com.disney.disneyplus', url: 'https://www.disneyplus.com/home' },
      ];

      let cycleIdx = 0;
      for (const entry of entries) {
        const showTitle = entry['im:collection']?.['im:name']?.label?.trim();
        const rawImg = entry['im:image']?.[entry['im:image'].length - 1]?.label;
        if (!showTitle || !rawImg) continue;

        const cleanTitle = showTitle.replace(/,\s*Season\s*\d+/i, '').trim();
        if (seenShows.has(`top:${cleanTitle}`)) continue;
        seenShows.add(`top:${cleanTitle}`);

        const target = platformCycle[cycleIdx % platformCycle.length];
        cycleIdx++;

        series.push({
          id: `tv-${entry.id?.attributes?.['im:id'] || cycleIdx}`,
          appName: target.appName,
          packageName: target.pkg,
          title: showTitle,
          subtitle: `${entry.category?.attributes?.label || 'Serie'} · Tendencia`,
          deepLinkUrl: target.url,
          posterUrl: upscaleAppleImage(rawImg, '600x600bb'),
          backdropUrl: upscaleAppleImage(rawImg, '800x800bb'),
          accentGradient: 'linear-gradient(135deg, #161B26 0%, #242E42 100%)',
          tag: target.appName,
          genre: entry.category?.attributes?.label,
          mediaKind: 'series',
        });
      }
    }

    // Construir Hero Spotlight con los mejores estrenos 2026 + CgamesTVPARTY
    const spotlightMovies = [...movies]
      .sort((a, b) => {
        const aRecent = (a.releaseDate || '').includes('2026') || (a.releaseDate || '').includes('2025') ? 1 : 0;
        const bRecent = (b.releaseDate || '').includes('2026') || (b.releaseDate || '').includes('2025') ? 1 : 0;
        return bRecent - aRecent;
      })
      .slice(0, 5);

    const catalog: GoogleTvLiveCatalog = {
      spotlight: spotlightMovies.length > 0 ? spotlightMovies : OFFLINE_FALLBACK_CATALOG.spotlight,
      movies,
      series: series.length > 0 ? series : OFFLINE_FALLBACK_CATALOG.series,
      updatedAt: todayKey,
    };

    if (movies.length > 0 || series.length > 0) {
      try {
        localStorage.setItem(LIVE_FEED_CACHE_KEY, JSON.stringify(catalog));
      } catch {
        // Ignorar si almacenamiento lleno
      }
    }

    return catalog;
  } catch {
    return OFFLINE_FALLBACK_CATALOG;
  }
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
