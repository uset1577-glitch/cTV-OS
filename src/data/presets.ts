import type { BackgroundPreset, InstalledApp, LauncherSettings } from '../types/launcher';

export const FEATURED_GAME = {
  name: 'CgamesTVPARTY',
  packageName: 'com.mandoparty.tv',
  tagline: 'Juego multijugador local con mandos para tu Android TV',
};

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'gtv-cinema',
    name: 'Google TV Cine',
    description: 'Lienzo oscuro con profundidad ambiental',
    type: 'gradient',
    value: 'radial-gradient(110% 85% at 72% 10%, #1C2331 0%, #0E1015 62%)',
    lightValue: 'radial-gradient(110% 85% at 72% 10%, #FFFFFF 0%, #EFF2F7 70%)',
    swatch: 'linear-gradient(135deg, #1C2331 0%, #0E1015 100%)',
  },
  {
    id: 'gtv-midnight',
    name: 'Azul Nocturno',
    description: 'Tono azul pizarra suave para sala oscura',
    type: 'gradient',
    value: 'linear-gradient(160deg, #0D131F 0%, #131C2E 55%, #0A0D14 100%)',
    lightValue: 'linear-gradient(160deg, #F4F7FC 0%, #E6ECF7 100%)',
    swatch: 'linear-gradient(135deg, #131C2E 0%, #0A0D14 100%)',
  },
  {
    id: 'pure-oled',
    name: 'Negro Puro OLED',
    description: 'Máximo contraste sin reflejos',
    type: 'solid',
    value: '#07080B',
    lightValue: '#F6F7F9',
    swatch: '#07080B',
  },
  {
    id: 'warm-graphite',
    name: 'Grafito Mate',
    description: 'Superficie neutra uniforme',
    type: 'gradient',
    value: 'linear-gradient(160deg, #13151B 0%, #1B1E27 100%)',
    lightValue: 'linear-gradient(160deg, #F8F8FA 0%, #EAECEF 100%)',
    swatch: 'linear-gradient(160deg, #13151B 0%, #1B1E27 100%)',
  },
  {
    id: 'emerald-slate',
    name: 'Pizarra Profunda',
    description: 'Contraste sobrio verde petróleo oscuro',
    type: 'gradient',
    value: 'linear-gradient(160deg, #0B1416 0%, #112226 100%)',
    lightValue: 'linear-gradient(160deg, #F1F7F7 0%, #E1ECEC 100%)',
    swatch: 'linear-gradient(160deg, #0B1416 0%, #112226 100%)',
  },
  {
    id: 'cobalt-night',
    name: 'Horizonte Cobalto',
    description: 'Degradado cinematográfico profundo',
    type: 'gradient',
    value: 'linear-gradient(160deg, #090F1D 0%, #152340 100%)',
    lightValue: 'linear-gradient(160deg, #F0F5FF 0%, #DFE8FA 100%)',
    swatch: 'linear-gradient(160deg, #090F1D 0%, #152340 100%)',
  },
];

export const DEFAULT_FAVORITES = [
  'com.mandoparty.tv',
  'com.google.android.youtube.tv',
  'com.netflix.ninja',
  'com.wbd.stream',
  'com.amazon.amazonvideo.livingroom',
  'com.disney.disneyplus',
  'com.spotify.tv.android',
];

export const DEFAULT_SETTINGS: LauncherSettings = {
  themeMode: 'dark',
  backgroundId: 'gtv-cinema',
  use24HourClock: false,
  showPackageNames: false,
  showSuggestions: true,
  otaRepo: 'tu-usuario/cTV-OS',
  favoritePackages: DEFAULT_FAVORITES,
};

function makeCircleAppIcon(bg: string, label: string, accent = '#FFFFFF', sub?: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <radialGradient id="g" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.18"/>
      </radialGradient>
    </defs>
    <rect width="160" height="160" fill="${bg}"/>
    <rect width="160" height="160" fill="url(#g)"/>
    <text x="80" y="${sub ? '84' : '94'}" font-family="system-ui, -apple-system, sans-serif" font-size="${
      label.length > 2 ? '38' : '54'
    }" font-weight="800" fill="${accent}" text-anchor="middle" letter-spacing="-1">${label}</text>
    ${
      sub
        ? `<text x="80" y="114" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="${accent}" fill-opacity="0.88" text-anchor="middle">${sub}</text>`
        : ''
    }
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const WEB_PREVIEW_APPS: InstalledApp[] = [
  {
    packageName: 'com.mandoparty.tv',
    name: 'CgamesTVPARTY',
    icon: makeCircleAppIcon('#EA580C', 'CTV', '#FFF7ED', 'PARTY'),
    isLeanback: true,
    isSystemApp: false,
    category: 'games',
  },
  {
    packageName: 'com.google.android.youtube.tv',
    name: 'YouTube',
    icon: makeCircleAppIcon('#DC2626', '▶', '#FFFFFF'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.netflix.ninja',
    name: 'Netflix',
    icon: makeCircleAppIcon('#141414', 'N', '#E50914'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.wbd.stream',
    name: 'Max',
    icon: makeCircleAppIcon('#002BE7', 'max', '#FFFFFF'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.amazon.amazonvideo.livingroom',
    name: 'Prime Video',
    icon: makeCircleAppIcon('#00A8E1', 'prime', '#FFFFFF'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.disney.disneyplus',
    name: 'Disney+',
    icon: makeCircleAppIcon('#0A2259', 'D+', '#FFFFFF'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.spotify.tv.android',
    name: 'Spotify',
    icon: makeCircleAppIcon('#1DB954', '♫', '#0B130E'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.google.android.play.games',
    name: 'Play Juegos',
    icon: makeCircleAppIcon('#047857', 'PJ', '#ECFDF5'),
    isLeanback: true,
    isSystemApp: true,
    category: 'games',
  },
  {
    packageName: 'com.android.tv.settings',
    name: 'Ajustes TV',
    icon: makeCircleAppIcon('#27272A', '⚙', '#F4F4F5'),
    isLeanback: true,
    isSystemApp: true,
    category: 'other',
  },
];
