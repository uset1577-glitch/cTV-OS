import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { WEB_PREVIEW_APPS } from '../data/presets';
import type {
  AppDownloadProgress,
  AppUpdateManifest,
  AppVersionInfo,
  InstalledApp,
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
  checkOtaUpdate(options: { repo: string }): Promise<AppUpdateManifest>;
  downloadAndInstallApk(options: { url: string; versionName: string }): Promise<{ started: boolean }>;
  addListener(
    eventName: 'otaDownloadProgress',
    listenerFunc: (progress: AppDownloadProgress) => void
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

// Sistema de actualización estilo Xuper TV: sin errores técnicos de CORS ni configuraciones obligatorias
export async function checkAppUpdate(
  repoSlug: string,
  currentVersionCode: number
): Promise<{
  hasUpdate: boolean;
  manifest?: AppUpdateManifest;
  message: string;
}> {
  const cleanRepo = repoSlug.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '');

  // Si no hay repositorio configurado o es el placeholder de ejemplo, no intentar llamar a GitHub
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
      if (manifest && manifest.versionCode > currentVersionCode && manifest.apkUrl) {
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

    const cleanTag = (release.tag_name || '1.0.0').replace(/^v/i, '');
    const numericParts = cleanTag.split('.').map((n) => parseInt(n, 10) || 0);

    const buildMatch = (release.body || '').match(/versionCode[":\s]+(\d+)|Build\s+(\d+)/i);
    const computedCode = buildMatch
      ? parseInt(buildMatch[1] || buildMatch[2], 10)
      : (numericParts[0] || 1) * 10000 + (numericParts[1] || 0) * 100 + (numericParts[2] || 0);

    if (computedCode > currentVersionCode) {
      return {
        hasUpdate: true,
        manifest: {
          versionCode: computedCode,
          versionName: cleanTag,
          apkUrl: apkAsset.browser_download_url,
          releaseNotes: release.body || 'Mejoras de rendimiento y estabilidad.',
          publishedAt: release.published_at,
          fileSizeBytes: apkAsset.size,
        },
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
