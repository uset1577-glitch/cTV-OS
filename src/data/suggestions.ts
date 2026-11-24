import type { AppSuggestion, InstalledApp } from '../types/launcher';

// Catálogo enriquecido con portadas reales de cine/streaming y rotación diaria
export const ALL_REAL_SUGGESTIONS: AppSuggestion[] = [
  // --- Netflix ---
  {
    id: 'nf-1',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Stranger Things 5',
    subtitle: 'El capítulo final de la serie revelación',
    deepLinkUrl: 'https://www.netflix.com/title/80057281',
    posterUrl: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #450A0A 0%, #B91C1C 100%)',
    tag: 'Netflix',
  },
  {
    id: 'nf-2',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'El Juego del Calamar 2',
    subtitle: 'Nuevos juegos mortales y reglas extremas',
    deepLinkUrl: 'https://www.netflix.com/title/81040344',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)',
    tag: 'Netflix',
  },
  {
    id: 'nf-3',
    appName: 'Netflix',
    packageName: 'com.netflix.ninja',
    title: 'Merlina · Temporada 2',
    subtitle: 'Nuevos misterios oscuros en Nevermore',
    deepLinkUrl: 'https://www.netflix.com/title/81231974',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #311033 0%, #7E22CE 100%)',
    tag: 'Netflix',
  },

  // --- Max (HBO) ---
  {
    id: 'max-1',
    appName: 'Max (HBO)',
    packageName: 'com.wbd.stream',
    title: 'The Last of Us · T2',
    subtitle: 'La supervivencia continúa en un mundo colapsado',
    deepLinkUrl: 'https://play.max.com/',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #1E1B4B 0%, #3730A3 100%)',
    tag: 'Max · HBO',
  },
  {
    id: 'max-2',
    appName: 'Max (HBO)',
    packageName: 'com.wbd.stream',
    title: 'La Casa del Dragón',
    subtitle: 'La guerra civil de los Targaryen en 4K',
    deepLinkUrl: 'https://play.max.com/show',
    posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #451A03 0%, #D97706 100%)',
    tag: 'Max · HBO',
  },
  {
    id: 'max-3',
    appName: 'Max (HBO)',
    packageName: 'com.wbd.stream',
    title: 'The Batman: Parte II',
    subtitle: 'El caballero de la noche en Gotham',
    deepLinkUrl: 'https://play.max.com/movies',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #0F172A 0%, #1D4ED8 100%)',
    tag: 'Max · HBO',
  },

  // --- Prime Video ---
  {
    id: 'pv-1',
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    title: 'The Boys · Temporada Final',
    subtitle: 'El enfrentamiento definitivo contra Vought',
    deepLinkUrl: 'https://app.primevideo.com/',
    posterUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 100%)',
    tag: 'Prime Video',
  },
  {
    id: 'pv-2',
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    title: 'Fallout · T2',
    subtitle: 'Nuevos refugios y peligros en el Yermo',
    deepLinkUrl: 'https://app.primevideo.com/',
    posterUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #14532D 0%, #16A34A 100%)',
    tag: 'Prime Video',
  },
  {
    id: 'pv-3',
    appName: 'Prime Video',
    packageName: 'com.amazon.amazonvideo.livingroom',
    title: 'El Señor de los Anillos: Los Anillos de Poder',
    subtitle: 'La forja de los anillos en la Tierra Media',
    deepLinkUrl: 'https://app.primevideo.com/',
    posterUrl: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #382705 0%, #CA8A04 100%)',
    tag: 'Prime Video',
  },

  // --- YouTube ---
  {
    id: 'yt-1',
    appName: 'YouTube',
    packageName: 'com.google.android.youtube.tv',
    title: 'Tendencias y directos de hoy',
    subtitle: 'Los videos más virales en tu pantalla',
    deepLinkUrl: 'https://www.youtube.com/tv#/explore',
    posterUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #881337 0%, #E11D48 100%)',
    tag: 'YouTube',
  },
  {
    id: 'yt-2',
    appName: 'YouTube',
    packageName: 'com.google.android.youtube.tv',
    title: 'Música y Sesiones en Vivo',
    subtitle: 'Conciertos y videoclips en 4K',
    deepLinkUrl: 'https://www.youtube.com/tv#/music',
    posterUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)',
    tag: 'YouTube',
  },

  // --- Disney+ ---
  {
    id: 'dp-1',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'The Mandalorian & Grogu',
    subtitle: 'Nuevas misiones en la galaxia Star Wars',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #172554 0%, #1D4ED8 100%)',
    tag: 'Disney+',
  },
  {
    id: 'dp-2',
    appName: 'Disney+',
    packageName: 'com.disney.disneyplus',
    title: 'Intensa-Mente 2',
    subtitle: 'Nuevas emociones llegan a la mente de Riley',
    deepLinkUrl: 'https://www.disneyplus.com/home',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
    accentGradient: 'linear-gradient(135deg, #134E4A 0%, #0D9488 100%)',
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
    posterUrl: '/src/assets/images/cgames_tv_party_banner_1795483246737.jpg',
    accentGradient: 'linear-gradient(135deg, #9A3412 0%, #EA580C 100%)',
    tag: 'CgamesTVPARTY',
  },
];

const PACKAGE_ALIASES: Record<string, string[]> = {
  'com.wbd.stream': ['com.hbo.hbonow', 'com.hbomax', 'com.hbo.android.app'],
  'com.google.android.youtube.tv': ['com.liskovsoft.smarttubetv.beta', 'com.liskovsoft.smarttubetv'],
  'com.amazon.amazonvideo.livingroom': ['com.amazon.avod.thirdpartyclient'],
};

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
  installedApps: InstalledApp[]
): AppSuggestion[] {
  // Rotación diaria basada en el día del mes para ofrecer variedad actualizada cada día
  const daySeed = new Date().getDate();

  if (focusedPackage) {
    const matching = ALL_REAL_SUGGESTIONS.filter((s) => {
      if (s.packageName === focusedPackage) return true;
      const aliases = PACKAGE_ALIASES[s.packageName] || [];
      return aliases.includes(focusedPackage);
    });
    if (matching.length > 0) {
      return matching;
    }
  }

  // Organizar sin mezclar, agrupando por servicio y rotando un elemento diario
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
    const list = ALL_REAL_SUGGESTIONS.filter((s) => s.packageName === pkg);
    if (list.length > 0) {
      const index = (daySeed + curated.length) % list.length;
      curated.push(list[index]);
    }
  }

  return curated;
}
