import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { WEB_PREVIEW_APPS } from '../data/presets';
import type {
  AppDownloadProgress,
  AppUpdateManifest,
  AppVersionInfo,
  InstalledApp,
  LauncherRemoteStatus,
  MusicServiceStatus,
  SpotifyNowPlaying,
} from '../types/launcher';

export type TvSettingsSection =
  | 'settings'
  | 'wifi'
  | 'bluetooth'
  | 'sound'
  | 'display'
  | 'inputs'
  | 'account'
  | 'home'
  | 'apps'
  | 'app_details'
  | 'screensaver'
  | 'accessibility'
  | 'unknown_sources';

export interface OpenDefaultLauncherResult {
  opened: boolean;
  isNative: boolean;
  alreadyDefault?: boolean;
  needsGuide?: boolean;
  method?: string;
  currentDefaultPackage?: string;
  currentDefaultLabel?: string;
}

export interface LauncherNativePlugin {
  getInstalledApps(): Promise<{ apps: InstalledApp[] }>;
  launchApp(options: { packageName: string }): Promise<{ launched: boolean; packageName: string }>;
  launchUri(options: {
    url: string;
    packageName?: string;
  }): Promise<{ launched: boolean; openedStore?: boolean }>;
  openSettings(options: {
    section: TvSettingsSection;
    packageName?: string;
  }): Promise<{
    opened: boolean;
    alreadyDefault?: boolean;
    needsGuide?: boolean;
    method?: string;
    currentDefaultPackage?: string;
    currentDefaultLabel?: string;
  }>;
  setKeepScreenOn(options: { enabled: boolean }): Promise<{ ok: boolean }>;
  getAppVersion(): Promise<AppVersionInfo>;
  checkOtaUpdate(options: { repo: string }): Promise<AppUpdateManifest>;
  getRemoteConfig(options: { repo: string }): Promise<LauncherRemoteStatus>;
  getRecommendationsFeed(options?: { url?: string }): Promise<{
    ok: boolean;
    rawJson?: string;
    source?: string;
  }>;
  downloadAndInstallApk(options: { url: string; versionName: string }): Promise<{ started: boolean }>;
  getSpotifyNowPlaying(): Promise<SpotifyNowPlaying>;
  getMusicServiceStatus(): Promise<MusicServiceStatus>;
  openAccessibilitySettings(): Promise<{ opened: boolean }>;
  openNotificationAccessSettings(): Promise<{ opened: boolean }>;
  addListener(
    eventName: 'otaDownloadProgress',
    listenerFunc: (progress: AppDownloadProgress) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'spotifyPlaybackChanged',
    listenerFunc: (state: SpotifyNowPlaying) => void
  ): Promise<PluginListenerHandle>;
}

const LauncherNative = registerPlugin<LauncherNativePlugin>('Launcher');

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function getInstalledApps(): Promise<{ apps: InstalledApp[]; isNative: boolean }> {
  if (isNativeAndroid()) {
    const result = await LauncherNative.getInstalledApps();
    const sorted = [...(result.apps || [])]
      .filter((app) => !app.isSystemApp)
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    return { apps: sorted, isNative: true };
  }

  return {
    apps: [...WEB_PREVIEW_APPS]
      .filter((app) => !app.isSystemApp)
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    isNative: false,
  };
}

export async function launchAndroidApp(
  packageName: string
): Promise<{ ok: boolean; isNative: boolean; error?: string }> {
  if (isNativeAndroid()) {
    try {
      const res = await LauncherNative.launchApp({ packageName });
      return { ok: Boolean(res.launched), isNative: true };
    } catch (err) {
      return {
        ok: false,
        isNative: true,
        error: err instanceof Error ? err.message : 'No se pudo iniciar la aplicación',
      };
    }
  }

  return { ok: true, isNative: false };
}

export async function launchSuggestionUri(
  url: string,
  packageName?: string
): Promise<{ ok: boolean; isNative: boolean; openedStore?: boolean; error?: string }> {
  const cleanPkg = (packageName || '').trim();
  if (!cleanPkg) {
    return {
      ok: false,
      isNative: isNativeAndroid(),
      error: 'No hay aplicación asociada para abrir este elemento.',
    };
  }

  if (isNativeAndroid()) {
    try {
      const res = await LauncherNative.launchUri({ url: url || '', packageName: cleanPkg });
      return {
        ok: Boolean(res.launched),
        isNative: true,
        openedStore: Boolean(res.openedStore),
        error: res.launched ? undefined : `No se pudo abrir ${cleanPkg}.`,
      };
    } catch (err) {
      return {
        ok: false,
        isNative: true,
        error: err instanceof Error ? err.message : 'No se pudo abrir la aplicación',
      };
    }
  }

  return { ok: true, isNative: false };
}

export async function getNativeRecommendationsFeed(url?: string): Promise<{
  ok: boolean;
  rawJson: string;
  source: string;
}> {
  if (!isNativeAndroid()) {
    return { ok: false, rawJson: '', source: 'none' };
  }
  try {
    const res = await LauncherNative.getRecommendationsFeed({ url: (url || '').trim() });
    return {
      ok: Boolean(res?.ok && res?.rawJson),
      rawJson: res?.rawJson || '',
      source: res?.source || 'none',
    };
  } catch {
    return { ok: false, rawJson: '', source: 'none' };
  }
}

export async function openTvSettings(
  section: TvSettingsSection,
  packageName?: string
): Promise<boolean> {
  if (isNativeAndroid()) {
    try {
      const res = await LauncherNative.openSettings({ section, packageName });
      return Boolean(res.opened);
    } catch {
      return false;
    }
  }
  return false;
}

export async function openDefaultLauncherSettings(): Promise<OpenDefaultLauncherResult> {
  if (isNativeAndroid()) {
    try {
      const res = await LauncherNative.openSettings({ section: 'home' });
      return {
        opened: Boolean(res.opened),
        isNative: true,
        alreadyDefault: Boolean(res.alreadyDefault),
        needsGuide: Boolean(res.needsGuide),
        method: res.method,
        currentDefaultPackage: res.currentDefaultPackage,
        currentDefaultLabel: res.currentDefaultLabel,
      };
    } catch {
      return {
        opened: false,
        isNative: true,
        needsGuide: true,
        method: 'guide',
      };
    }
  }

  return {
    opened: false,
    isNative: false,
    needsGuide: true,
    method: 'web',
  };
}

export async function setNativeKeepScreenOn(enabled: boolean): Promise<void> {
  if (isNativeAndroid()) {
    try {
      await LauncherNative.setKeepScreenOn({ enabled });
    } catch {
      // Silencioso
    }
  }
}

export async function getCurrentAppVersion(): Promise<AppVersionInfo> {
  if (isNativeAndroid()) {
    try {
      return await LauncherNative.getAppVersion();
    } catch {
      return {
        versionName: '1.0.0',
        versionCode: 100,
        packageName: 'com.vora.tv',
      };
    }
  }
  return {
    versionName: '1.0.0',
    versionCode: 100,
    packageName: 'com.vora.tv',
  };
}

export function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .trim()
      .replace(/^v/i, '')
      .split(/[-+]/)[0]
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function isRemoteVersionNewer(
  manifest: AppUpdateManifest | null | undefined,
  currentVersionCode: number,
  currentVersionName: string
): boolean {
  if (!manifest || !manifest.apkUrl) return false;
  const cmp = compareSemver(manifest.versionName || '', currentVersionName || '1.0.0');
  if (cmp > 0) return true;
  if (cmp < 0) return false;
  // Si el tag/versión coincide exactamente (ej. v1.0.12 == v1.0.12), evitar falsos positivos.
  // Solo marcar actualización si version.json trae explícitamente un Build mayor.
  return Boolean(
    manifest.fromVersionJson &&
      manifest.versionCode > 0 &&
      currentVersionCode > 0 &&
      manifest.versionCode > currentVersionCode
  );
}

const DEFAULT_REMOTE_STATUS: LauncherRemoteStatus = {
  maintenanceMode: false,
  appsOnlyMode: false,
  title: 'Mantenimiento · Próxima actualización',
  message: 'El modo solo apps será activado mientras preparamos la próxima actualización de VORA TV OS.',
};

export async function fetchLauncherRemoteStatus(repoSlug: string): Promise<LauncherRemoteStatus> {
  const cleanRepo = repoSlug.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '');

  if (isNativeAndroid()) {
    if (!cleanRepo || !cleanRepo.includes('/') || cleanRepo.includes('tu-usuario')) {
      return DEFAULT_REMOTE_STATUS;
    }
    try {
      const res = await LauncherNative.getRemoteConfig({ repo: cleanRepo });
      return {
        maintenanceMode: Boolean(res?.maintenanceMode),
        appsOnlyMode: Boolean(res?.appsOnlyMode),
        title: res?.title || DEFAULT_REMOTE_STATUS.title,
        message: res?.message || DEFAULT_REMOTE_STATUS.message,
        updatedAt: res?.updatedAt,
      };
    } catch {
      return DEFAULT_REMOTE_STATUS;
    }
  }

  const ts = Date.now();
  const urls: string[] = [];
  if (cleanRepo && cleanRepo.includes('/') && !cleanRepo.includes('tu-usuario')) {
    urls.push(
      `https://raw.githubusercontent.com/${cleanRepo}/main/public/launcher-status.json?t=${ts}`,
      `https://raw.githubusercontent.com/${cleanRepo}/master/public/launcher-status.json?t=${ts}`
    );
  }
  urls.push(`/launcher-status.json?t=${ts}`);

  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = (await res.json()) as Partial<LauncherRemoteStatus>;
      return {
        maintenanceMode: Boolean(data.maintenanceMode),
        appsOnlyMode: Boolean(data.appsOnlyMode),
        title: data.title || DEFAULT_REMOTE_STATUS.title,
        message: data.message || DEFAULT_REMOTE_STATUS.message,
        updatedAt: data.updatedAt,
      };
    } catch {
      // Probar siguiente origen
    }
  }

  return DEFAULT_REMOTE_STATUS;
}

export async function checkAppUpdate(
  repoSlug: string,
  currentVersionCode: number,
  currentVersionName = '1.0.0'
): Promise<{
  hasUpdate: boolean;
  manifest?: AppUpdateManifest;
  message: string;
}> {
  const cleanRepo = repoSlug.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '');

  if (!cleanRepo || !cleanRepo.includes('/') || cleanRepo.includes('tu-usuario')) {
    return {
      hasUpdate: false,
      message: 'Tienes instalada la versión más reciente del sistema.',
    };
  }

  // 1. En Android TV nativo, consultar mediante el plugin Java (sin limitaciones CORS)
  if (isNativeAndroid()) {
    try {
      const manifest = await LauncherNative.checkOtaUpdate({ repo: cleanRepo });
      if (isRemoteVersionNewer(manifest, currentVersionCode, currentVersionName)) {
        return {
          hasUpdate: true,
          manifest,
          message: `Nueva versión v${manifest.versionName} disponible para actualizar.`,
        };
      }
      return {
        hasUpdate: false,
        message: 'Tienes instalada la versión más reciente del sistema.',
      };
    } catch {
      return {
        hasUpdate: false,
        message: 'Tienes instalada la versión más reciente del sistema.',
      };
    }
  }

  // 2. En vista previa web, consultar API pública de GitHub Releases
  try {
    const apiUrl = `https://api.github.com/repos/${cleanRepo}/releases/latest`;
    const apiRes = await fetch(apiUrl, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });

    if (!apiRes.ok) {
      return {
        hasUpdate: false,
        message: 'Tienes instalada la versión más reciente del sistema.',
      };
    }

    const release = (await apiRes.json()) as {
      tag_name?: string;
      body?: string;
      published_at?: string;
      assets?: Array<{ name: string; browser_download_url: string; size?: number }>;
    };

    const apkAsset = release.assets?.find((a) => a.name.toLowerCase().endsWith('.apk'));
    if (!apkAsset) {
      return {
        hasUpdate: false,
        message: 'Tienes instalada la versión más reciente del sistema.',
      };
    }

    const cleanTag = (release.tag_name || '1.0.0').replace(/^v/i, '').trim();
    const buildMatch = (release.body || '').match(/versionCode[":\s]+(\d+)|Build\s+(\d+)/i);
    const parsedBuildCode = buildMatch ? parseInt(buildMatch[1] || buildMatch[2], 10) : 0;

    const manifest: AppUpdateManifest = {
      versionCode: parsedBuildCode,
      versionName: cleanTag,
      apkUrl: apkAsset.browser_download_url,
      releaseNotes: release.body || 'Mejoras de rendimiento y estabilidad.',
      publishedAt: release.published_at,
      fileSizeBytes: apkAsset.size,
      fromVersionJson: parsedBuildCode > 0,
    };

    if (isRemoteVersionNewer(manifest, currentVersionCode, currentVersionName)) {
      return {
        hasUpdate: true,
        manifest,
        message: `Nueva versión v${cleanTag} lista para actualizar.`,
      };
    }

    return {
      hasUpdate: false,
      message: 'Tienes instalada la versión más reciente del sistema.',
    };
  } catch {
    return {
      hasUpdate: false,
      message: 'Tienes instalada la versión más reciente del sistema.',
    };
  }
}

export async function startAppUpdateInstall(
  apkUrl: string,
  versionName: string,
  onProgress: (progress: AppDownloadProgress) => void
): Promise<() => void> {
  if (isNativeAndroid()) {
    const handle = await LauncherNative.addListener('otaDownloadProgress', onProgress);
    try {
      await LauncherNative.downloadAndInstallApk({ url: apkUrl, versionName });
    } catch (err) {
      onProgress({
        percent: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        status: 'error',
        message: err instanceof Error ? err.message : 'Error al iniciar descarga',
      });
    }
    return () => {
      void handle.remove();
    };
  }

  // En vista previa web: simulación visual limpia de la barra de descarga de Xuper TV
  let cancelled = false;
  let pct = 0;
  const total = 18_400_000;
  const timer = window.setInterval(() => {
    if (cancelled) return;
    pct += 15;
    if (pct >= 100) {
      window.clearInterval(timer);
      onProgress({
        percent: 100,
        downloadedBytes: total,
        totalBytes: total,
        status: 'installing',
        message: 'Descarga completada. Abriendo el instalador del sistema...',
      });
    } else {
      onProgress({
        percent: pct,
        downloadedBytes: Math.round((pct / 100) * total),
        totalBytes: total,
        status: 'downloading',
      });
    }
  }, 220);

  return () => {
    cancelled = true;
    window.clearInterval(timer);
  };
}

export async function getNativeSpotifyNowPlaying(): Promise<SpotifyNowPlaying | null> {
  if (!isNativeAndroid()) return null;
  try {
    return await LauncherNative.getSpotifyNowPlaying();
  } catch {
    return null;
  }
}

export async function getMusicServiceStatus(): Promise<MusicServiceStatus> {
  if (!isNativeAndroid()) {
    return {
      hasNotificationAccess: false,
      hasAccessibilityAccess: false,
      isGoogleTv: false,
    };
  }
  try {
    return await LauncherNative.getMusicServiceStatus();
  } catch {
    return {
      hasNotificationAccess: false,
      hasAccessibilityAccess: false,
      isGoogleTv: false,
    };
  }
}

export async function openSpotifyAccessibilitySettings(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    const res = await LauncherNative.openAccessibilitySettings();
    return Boolean(res?.opened);
  } catch {
    return false;
  }
}

export async function openSpotifyNotificationSettings(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    const res = await LauncherNative.openNotificationAccessSettings();
    return Boolean(res?.opened);
  } catch {
    return false;
  }
}

export async function subscribeNativeSpotifyPlayback(
  listener: (state: SpotifyNowPlaying) => void
): Promise<() => void> {
  if (!isNativeAndroid()) return () => {};
  try {
    const handle = await LauncherNative.addListener('spotifyPlaybackChanged', listener);
    return () => {
      void handle.remove();
    };
  } catch {
    return () => {};
  }
}
