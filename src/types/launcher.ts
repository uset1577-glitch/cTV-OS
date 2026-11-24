export type LauncherOverlay = 'none' | 'apps' | 'search' | 'settings' | 'update';

export type HomeTab = 'inicio' | 'envivo' | 'apps';

export type ThemeMode = 'dark' | 'light';

export type AppCategoryFilter = 'all' | 'tv' | 'games' | 'other';

export interface InstalledApp {
  packageName: string;
  name: string;
  icon: string;
  isLeanback: boolean;
  isSystemApp: boolean;
  category?: 'tv' | 'games' | 'other';
}

export interface BackgroundPreset {
  id: string;
  name: string;
  description: string;
  type: 'solid' | 'gradient';
  value: string;
  lightValue: string;
  swatch: string;
}

export interface AppSuggestion {
  id: string;
  appName: string;
  packageName: string;
  title: string;
  subtitle: string;
  deepLinkUrl: string;
  posterUrl: string;
  backdropUrl?: string;
  accentGradient: string;
  tag: string;
  genre?: string;
  releaseDate?: string;
  mediaKind?: 'movie' | 'series' | 'game';
}

export interface GoogleTvLiveCatalog {
  spotlight: AppSuggestion[];
  movies: AppSuggestion[];
  series: AppSuggestion[];
  updatedAt: string;
}

export interface LauncherSettings {
  themeMode: ThemeMode;
  backgroundId: string;
  use24HourClock: boolean;
  showPackageNames: boolean;
  showSuggestions: boolean;
  updateRepo: string;
  favoritePackages: string[];
}

export interface AppVersionInfo {
  versionName: string;
  versionCode: number;
  packageName: string;
}

export interface AppUpdateManifest {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  releaseNotes?: string;
  publishedAt?: string;
  mandatory?: boolean;
  fileSizeBytes?: number;
}

export interface AppDownloadProgress {
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  status: 'downloading' | 'installing' | 'permission_required' | 'completed' | 'error';
  message?: string;
}

export type AppUpdateModalStatus =
  | 'idle'
  | 'checking'
  | 'up_to_date'
  | 'update_available'
  | 'downloading'
  | 'permission_required'
  | 'installing'
  | 'error';
