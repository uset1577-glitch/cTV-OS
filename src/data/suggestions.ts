import cgamesBannerImg from '../assets/images/cgames_tv_party_banner_1795483246737.jpg';
import posterDuneImg from '../assets/images/poster_dune_max_1795485086679.jpg';
import posterInterstellarImg from '../assets/images/poster_interstellar_prime_1795485087463.jpg';
import posterStrangerThingsImg from '../assets/images/poster_stranger_things_netflix_1795485087498.jpg';
import posterTheBatmanImg from '../assets/images/poster_the_batman_max_1795485087113.jpg';
import type { AppSuggestion, InstalledApp } from '../types/launcher';

// Catálogo base offline (empaquetado localmente en el APK sin dependencias externas rotas)
export const ALL_REAL_SUGGESTIONS: AppSuggestion[] = [
  // --- Netflix ---
  {
    id: 'nf-1',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Stranger Things',
    subtitle: 'Ciencia ficción y misterio en Hawkins',
    deepLinkUrl: 'https://www.netflix.com/title/80057281',
    posterUrl: posterStrangerThingsImg,
    accentGradient: 'linear-gradient(135deg, #450A0A 0%, #B91C1C 100%)',
    tag: 'Netflix',
  },
  {
    id: 'nf-2',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'El Juego del Calamar',
    subtitle: 'Suspenso coreano de alto impacto en 4K',
    deepLinkUrl: 'https://www.netflix.com/title/81040344',
    posterUrl: posterStrangerThingsImg,
    accentGradient: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)',
    tag: 'Netflix',
  },

  // --- Max (HBO) ---
  {
    id: 'max-1',
    appName: 'Max (HBO)',
    packageName: 'com.wbd.stream',
    title: 'Duna: Parte Dos',
    subtitle: 'Épica cinematográfica de Denis Villeneuve',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: posterDuneImg,
    accentGradient: 'linear-gradient(135deg, #451A03 0%, #D97706 100%)',
    tag: 'Max · HBO',
  },
  {
    id: 'max-2',
    appName: 'Max (HBO)',
    packageName: 'com.wbd.stream',
    title: 'The Batman',
    subtitle: 'Suspenso nocturno en Gotham City',
    deepLinkUrl: 'https://play.max.com/movies',
    posterUrl: posterTheBatmanImg,
    accentGradient: 'linear-gradient(135deg, #0F172A 0%, #1D4ED8 100%)',
    tag: 'Max · HBO',
  },

  // --- Prime Video ---
  {
    id: 'pv-1',
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    title: 'Interestelar',
    subtitle: 'Viaje espacial épico en Ultra HD',
    deepLinkUrl: 'https://app.primevideo.com/',
    posterUrl: posterInterstellarImg,
    accentGradient: 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 100%)',
    tag: 'Prime Video',
  },
  {
    id: 'pv-2',
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    title: 'Fallout',
    subtitle: 'Aventura postapocalíptica en 4K HDR',
    deepLinkUrl: 'https://app.primevideo.com/',
    posterUrl: posterDuneImg,
    accentGradient: 'linear-gradient(135deg, #14532D 0%, #16A34A 100%)',
    tag: 'Prime Video',
  },

  // --- YouTube ---
  {
    id: 'yt-1',
    appName: 'YouTube',
    packageName: 'com.google.android.youtube.tv',
    title: 'Tendencias en tu pantalla',
    subtitle: 'Explora los estrenos y directos del día',
    deepLinkUrl: 'https://www.youtube.com/tv#/explore',
    posterUrl: posterInterstellarImg,
    accentGradient: 'linear-gradient(135deg, #881337 0%, #E11D48 100%)',
    tag: 'YouTube',
  },

  // --- Disney+ ---
  {
    id: 'dp-1',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'The Mandalorian',
    subtitle: 'Aventuras en la galaxia Star Wars',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: posterInterstellarImg,
    accentGradient: 'linear-gradient(135deg, #172554 0%, #1D4ED8 100%)',
    tag: 'Disney+',
  },

  // --- CgamesTVPARTY ---
  {
    id: 'cg-1',
    appName: 'CgamesTVPARTY',
    packageName: 'com.mandoparty.tv',
    title: 'Torneo Local con Mandos',
    subtitle: 'Minijuegos cooperativos para toda la familia',
    deepLinkUrl: 'cgamestv://party',
    posterUrl: cgamesBannerImg,
    accentGradient: 'linear-gradient(135deg, #9A3412 0%, #EA580C 100%)',
    tag: 'CgamesTVPARTY',
  },
];

const PACKAGE_ALIASES: Record<string, string[]> = {
  'com.wbd.stream': ['com.hbo.hbonow', 'com.hbomax', 'com.hbo.android.app'],
  'com.google.android.youtube.tv': ['com.liskovsoft.smarttubetv.beta', 'com.liskovsoft.smarttubetv'],
  'com.amazon.amazonvideo.livingroom': ['com.amazon.avod.thirdpartyclient'],
};

const LIVE_CACHE_KEY = 'ctvos_daily_catalog_v1';

interface TvMazeShow {
  id: number;
  name: string;
  genres?: string[];
  rating?: { average?: number | null };
  image?: { medium?: string; original?: string } | null;
  network?: { name?: string } | null;
  webChannel?: { name?: string } | null;
}

function getDailySeed(): number {
  const now = new Date();
  return now.getFullYear() * 1000 + now.getMonth() * 40 + now.getDate();
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
      accentGradient: 'linear-gradient(135deg, #450A0A 0%, #B91C1C 100%)',
      tag: 'Netflix',
    };
  }
  if (lower.includes('hbo') || lower.includes('max')) {
    return {
      appName: 'Max (HBO)',
      packageName: 'com.wbd.stream',
      deepLinkUrl: 'https://play.max.com/',
      accentGradient: 'linear-gradient(135deg, #1E1B4B 0%, #3730A3 100%)',
      tag: 'Max · HBO',
    };
  }
  if (lower.includes('amazon') || lower.includes('prime')) {
    return {
      appName: 'Prime Video',
      packageName: 'com.amazon.amazonvideo.livingroom',
      deepLinkUrl: 'https://app.primevideo.com/',
      accentGradient: 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 100%)',
      tag: 'Prime Video',
    };
  }
  if (lower.includes('disney')) {
    return {
      appName: 'Disney+',
      packageName: 'com.disney.disneyplus',
      deepLinkUrl: 'https://www.disneyplus.com/home',
      accentGradient: 'linear-gradient(135deg, #172554 0%, #1D4ED8 100%)',
      tag: 'Disney+',
    };
  }
  if (lower.includes('youtube')) {
    return {
      appName: 'YouTube',
      packageName: 'com.google.android.youtube.tv',
      deepLinkUrl: 'https://www.youtube.com/tv#/explore',
      accentGradient: 'linear-gradient(135deg, #881337 0%, #E11D48 100%)',
      tag: 'YouTube',
    };
  }
  return null;
}

// Consulta catálogo real público (TVMaze API sin clave) con rotación diaria y caché local
export async function fetchDailyStreamingCatalog(): Promise<AppSuggestion[]> {
  const todayKey = new Date().toISOString().slice(0, 10);

  try {
    const cachedRaw = localStorage.getItem(LIVE_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as { date: string; items: AppSuggestion[] };
      if (cached.date === todayKey && Array.isArray(cached.items) && cached.items.length > 0) {
        return cached.items;
      }
    }
  } catch {
    // Ignorar error de caché
  }

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);
    const page = getDailySeed() % 4;
    const res = await fetch(`https://api.tvmaze.com/shows?page=${page}`, {
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);

    if (!res.ok) return ALL_REAL_SUGGESTIONS;
    const shows = (await res.json()) as TvMazeShow[];
    if (!Array.isArray(shows)) return ALL_REAL_SUGGESTIONS;

    const perService = new Map<string, AppSuggestion[]>();
    for (const show of shows) {
      const channel = show.webChannel?.name || show.network?.name || '';
      const poster = show.image?.original || show.image?.medium;
      if (!channel || !poster) continue;

      const mapped = mapPlatformToPackage(channel);
      if (!mapped) continue;

      const list = perService.get(mapped.packageName) || [];
      if (list.length >= 6) continue;

      const genreText =
        show.genres && show.genres.length > 0 ? show.genres.slice(0, 2).join(' · ') : 'Serie destacada';
      const scoreText = show.rating?.average ? `★ ${show.rating.average}` : '';

      list.push({
        id: `tvm-${show.id}`,
        appName: mapped.appName,
        packageName: mapped.packageName,
        title: show.name,
        subtitle: [genreText, scoreText].filter(Boolean).join(' · '),
        deepLinkUrl: mapped.deepLinkUrl,
        posterUrl: poster.replace(/^http:\/\//i, 'https://'),
        accentGradient: mapped.accentGradient,
        tag: mapped.tag,
      });
      perService.set(mapped.packageName, list);
    }

    const merged: AppSuggestion[] = [
      ...Array.from(perService.values()).flat(),
      ...ALL_REAL_SUGGESTIONS.filter((s) => !perService.has(s.packageName)),
    ];

    if (merged.length > 0) {
      try {
        localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({ date: todayKey, items: merged }));
      } catch {
        // Ignorar cuota llena
      }
      return merged;
    }
  } catch {
    // Sin conexión: usar catálogo local incluido en el APK
  }

  return ALL_REAL_SUGGESTIONS;
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

export function getContextualSuggestions(
  focusedPackage: string | null,
  _installedApps: InstalledApp[],
  catalog: AppSuggestion[] = ALL_REAL_SUGGESTIONS
): AppSuggestion[] {
  const daySeed = getDailySeed();

  if (focusedPackage) {
    const matching = catalog.filter((s) => {
      if (s.packageName === focusedPackage) return true;
      const aliases = PACKAGE_ALIASES[s.packageName] || [];
      return aliases.includes(focusedPackage);
    });
    if (matching.length > 0) {
      return matching.slice(0, 6);
    }
  }

  // Organizar sin mezclar, tomando una sugerencia diaria rotativa por plataforma
  const servicesOrder = [
    'com.netflix.ninja',
    'com.wbd.stream',
    'com.amazon.amazonvideo.livingroom',
    'com.google.android.youtube.tv',
    'com.disney.disneyplus',
    'com.mandoparty.tv',
  ];

  const curated: AppSuggestion[] = [];
  for (const pkg of servicesOrder) {
    const list = catalog.filter((s) => s.packageName === pkg);
    if (list.length > 0) {
      const index = (daySeed + curated.length) % list.length;
      curated.push(list[index]);
    }
  }

  return curated;
}
