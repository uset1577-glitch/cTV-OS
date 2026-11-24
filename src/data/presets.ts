import cgamesBannerImg from '../assets/images/cgames_tv_party_banner_1795483246737.jpg';
import bgMidnightSlateImg from '../assets/images/tv_bg_midnight_slate_1795483247067.jpg';
import bgObsidianImg from '../assets/images/tv_bg_obsidian_1795483246355.jpg';
import type { BackgroundPreset, InstalledApp, LauncherSettings } from '../types/launcher';

export const FEATURED_GAME = {
  name: 'CgamesTVPARTY',
  packageName: 'com.mandoparty.tv',
  tagline: 'Juego multijugador local para tu TV',
  bannerImage: cgamesBannerImg,
};

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'nava-calm',
    name: 'Calma Nava',
    description: 'Lienzo limpio sin distracciones',
    type: 'gradient',
    value: 'radial-gradient(110% 90% at 50% 0%, #171B24 0%, #090B10 68%)',
    lightValue: 'radial-gradient(110% 90% at 50% 0%, #FFFFFF 0%, #ECEEF2 72%)',
    swatch: 'linear-gradient(160deg, #171B24 0%, #090B10 100%)',
  },
  {
    id: 'obsidian-studio',
    name: 'Obsidiana Estudio',
    description: 'Carbón mate con luz cálida lateral',
    type: 'image',
    value: bgObsidianImg,
    lightValue: 'linear-gradient(160deg, #F6F4F0 0%, #EAE5DD 100%)',
    swatch: 'linear-gradient(135deg, #101216 0%, #261B12 100%)',
  },
  {
    id: 'midnight-slate',
    name: 'Pizarra Nocturna',
    description: 'Gris azulado profundo con brillo tenue',
    type: 'image',
    value: bgMidnightSlateImg,
    lightValue: 'linear-gradient(160deg, #F2F5F8 0%, #E2E8F0 100%)',
    swatch: 'linear-gradient(135deg, #0E131A 0%, #1B333B 100%)',
  },
  {
    id: 'pure-oled',
    name: 'Negro Puro OLED',
    description: 'Máximo contraste en sala oscura',
    type: 'solid',
    value: '#06070A',
    lightValue: '#F5F6F8',
    swatch: '#06070A',
  },
  {
    id: 'warm-graphite',
    name: 'Grafito Neutro',
    description: 'Superficie mate uniforme',
    type: 'gradient',
    value: 'linear-gradient(160deg, #12141A 0%, #1B1E26 100%)',
    lightValue: 'linear-gradient(160deg, #F8F8FA 0%, #E9EBEF 100%)',
    swatch: 'linear-gradient(160deg, #12141A 0%, #1B1E26 100%)',
  },
  {
    id: 'cobalt-night',
    name: 'Horizonte Cobalto',
    description: 'Degradado sereno azul profundo',
    type: 'gradient',
    value: 'linear-gradient(160deg, #090F1D 0%, #121F38 100%)',
    lightValue: 'linear-gradient(160deg, #F0F5FF 0%, #DFE8FA 100%)',
    swatch: 'linear-gradient(160deg, #090F1D 0%, #121F38 100%)',
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
  backgroundId: 'nava-calm',
  use24HourClock: false,
  showPackageNames: false,
  showSuggestions: true,
  otaRepo: 'tu-usuario/cTV-OS',
  favoritePackages: DEFAULT_FAVORITES,
};

function makeSvgIcon(bg: string, label: string, accent = '#FFFFFF'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="30" fill="${bg}"/>
    <text x="64" y="76" font-family="system-ui, sans-serif" font-size="42" font-weight="700" fill="${accent}" text-anchor="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const WEB_PREVIEW_APPS: InstalledApp[] = [
  {
    packageName: 'com.mandoparty.tv',
    name: 'CgamesTVPARTY',
    icon: makeSvgIcon('#EA580C', 'CG', '#FFF7ED'),
    isLeanback: true,
    isSystemApp: false,
    category: 'games',
  },
  {
    packageName: 'com.google.android.youtube.tv',
    name: 'YouTube',
    icon: makeSvgIcon('#E11D48', 'YT', '#FFFFFF'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.netflix.ninja',
    name: 'Netflix',
    icon: makeSvgIcon('#B91C1C', 'N', '#FFFFFF'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.wbd.stream',
    name: 'Max (HBO)',
    icon: makeSvgIcon('#1D4ED8', 'MAX', '#EFF6FF'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.amazon.amazonvideo.livingroom',
    name: 'Prime Video',
    icon: makeSvgIcon('#0369A1', 'PV', '#F0F9FF'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.disney.disneyplus',
    name: 'Disney+',
    icon: makeSvgIcon('#1D4ED8', 'D+', '#EFF6FF'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.spotify.tv.android',
    name: 'Spotify',
    icon: makeSvgIcon('#16A34A', 'SP', '#ECFDF5'),
    isLeanback: true,
    isSystemApp: false,
    category: 'tv',
  },
  {
    packageName: 'com.google.android.play.games',
    name: 'Play Juegos',
    icon: makeSvgIcon('#047857', 'PJ', '#ECFDF5'),
    isLeanback: true,
    isSystemApp: true,
    category: 'games',
  },
  {
    packageName: 'com.android.tv.settings',
    name: 'Configuración TV',
    icon: makeSvgIcon('#3F3F46', 'CFG', '#F4F4F5'),
    isLeanback: true,
    isSystemApp: true,
    category: 'other',
  },
];
