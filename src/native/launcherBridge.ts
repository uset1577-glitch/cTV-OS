import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { WEB_PREVIEW_APPS } from '../data/presets';
import type {
  AppVersionInfo,
  InstalledApp,
  OtaDownloadProgress,
  OtaVersionManifest,
} from '../types/launcher';

export interface LauncherNativePlugin {
  getInstalledApps(): Promise<{ apps: InstalledApp[] }>;
  launchApp(options: { packageName: string }): Promise<{ launched: boolean; packageName: string }>;
  launchUri(options: {
    url: string;
    packageName?: string;
  }): Promise<{ launched: boolean; openedStore?: boolean }>;
  openSettings(options: { section: 'settings' | 'wifi' | 'home' | 'unknown_sources' }): Promise<{ opened: boolean }>;
  getAppVersion(): Promise<AppVersionInfo>;
  downloadAndInstallApk(options: { url: string; versionName: string }): Promise<{ started: boolean }>;
  addListener(
    eventName: 'otaDownloadProgress',
    listenerFunc: (progress: OtaDownloadProgress) => void
  ): Promise<PluginListenerHandle>;
}

const LauncherNative = registerPlugin<LauncherNativePlugin>('Launcher');

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function getInstalledApps(): Promise<{ apps: InstalledApp[]; isNative: boolean }> {
  if (isNativeAndroid()) {
    const result = await LauncherNative.getInstalledApps();
    const sorted = [...(result.apps || [])].sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );
    return { apps: sorted, isNative: true };
  }

  return {
    apps: [...WEB_PREVIEW_APPS].sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    ),
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
  if (isNativeAndroid()) {
    try {
      const res = await LauncherNative.launchUri({ url, packageName });
      return {
        ok: Boolean(res.launched),
        isNative: true,
        openedStore: Boolean(res.openedStore),
      };
    } catch (err) {
      return {
        ok: false,
        isNative: true,
        error: err instanceof Error ? err.message : 'No se pudo abrir la sugerencia',
      };
    }
  }

  return { ok: true, isNative: false };
}

export async function openTvSettings(
  section: 'settings' | 'wifi' | 'home' | 'unknown_sources'
): Promise<boolean> {
  if (isNativeAndroid()) {
    try {
      const res = await LauncherNative.openSettings({ section });
      return Boolean(res.opened);
    } catch {
      return false;
    }
  }
  return false;
}

export async function getCurrentAppVersion(): Promise<AppVersionInfo> {
  if (isNativeAndroid()) {
    try {
      return await LauncherNative.getAppVersion();
    } catch {
      return {
        versionName: '1.0.0',
        versionCode: 100,
        packageName: 'com.cgamestv.launcher',
      };
    }
  }
  return {
    versionName: '1.0.0',
    versionCode: 100,
    packageName: 'com.cgamestv.launcher',
  };
}

export async function fetchOtaManifest(repoSlug: string): Promise<OtaVersionManifest> {
  const cleanRepo = repoSlug.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '');
  if (!cleanRepo || !cleanRepo.includes('/')) {
    throw new Error('Configura un repositorio válido con formato usuario/repositorio.');
  }

  // Intentar descargar version.json directo de GitHub Releases latest
  const directUrl = `https://github.com/${cleanRepo}/releases/latest/download/version.json?t=${Date.now()}`;
  try {
    const res = await fetch(directUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as OtaVersionManifest;
      if (data && typeof data.versionCode === 'number' && data.apkUrl) {
        return data;
      }
    }
  } catch {
    // Fallback a API pública de GitHub Releases si CORS o red bloquea redirect directo
  }

  const apiUrl = `https://api.github.com/repos/${cleanRepo}/releases/latest`;
  const apiRes = await fetch(apiUrl, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  });

  if (!apiRes.ok) {
    if (apiRes.status === 404) {
      throw new Error(`No se encontró ningún Release publicado en ${cleanRepo}.`);
    }
    throw new Error(`Error al consultar GitHub Releases (${apiRes.status}).`);
  }

  const release = (await apiRes.json()) as {
    tag_name?: string;
    body?: string;
    published_at?: string;
    assets?: Array<{ name: string; browser_download_url: string; size?: number }>;
  };

  const versionJsonAsset = release.assets?.find((a) => a.name.toLowerCase() === 'version.json');
  if (versionJsonAsset) {
    const vRes = await fetch(versionJsonAsset.browser_download_url, { cache: 'no-store' });
    if (vRes.ok) {
      return (await vRes.json()) as OtaVersionManifest;
    }
  }

  const apkAsset = release.assets?.find((a) => a.name.toLowerCase().endsWith('.apk'));
  if (!apkAsset) {
    throw new Error('El último Release no contiene un archivo APK ni version.json.');
  }

  const cleanTag = (release.tag_name || '1.0.0').replace(/^v/i, '');
  const numericParts = cleanTag.split('.').map((n) => parseInt(n, 10) || 0);
  const computedCode =
    (numericParts[0] || 1) * 10000 + (numericParts[1] || 0) * 100 + (numericParts[2] || 0);

  return {
    versionCode: computedCode,
    versionName: cleanTag,
    apkUrl: apkAsset.browser_download_url,
    releaseNotes: release.body || 'Nueva versión disponible desde GitHub Releases.',
    publishedAt: release.published_at,
    fileSizeBytes: apkAsset.size,
  };
}

export async function startNativeOtaInstall(
  apkUrl: string,
  versionName: string,
  onProgress: (progress: OtaDownloadProgress) => void
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
        message: err instanceof Error ? err.message : 'Error al iniciar descarga del APK',
      });
    }
    return () => {
      void handle.remove();
    };
  }

  // En vista previa web: simular progreso limpio para probar la interfaz OTA sin romper el navegador
  let cancelled = false;
  let pct = 0;
  const total = 18_400_000;
  const timer = window.setInterval(() => {
    if (cancelled) return;
    pct += 16;
    if (pct >= 100) {
      window.clearInterval(timer);
      onProgress({
        percent: 100,
        downloadedBytes: total,
        totalBytes: total,
        status: 'installing',
        message: 'APK listo. En Android TV se abre el instalador del sistema vía FileProvider.',
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
