import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { NavaAppsDrawer } from './components/NavaAppsDrawer';
import { NavaSearchOverlay } from './components/NavaSearchOverlay';
import { NavaSettingsDrawer } from './components/NavaSettingsDrawer';
import { NavaSingleRowHome } from './components/NavaSingleRowHome';
import { NavaTopBar } from './components/NavaTopBar';
import { OtaUpdateModal } from './components/OtaUpdateModal';
import {
  BACKGROUND_PRESETS,
  DEFAULT_SETTINGS,
  FEATURED_GAME,
} from './data/presets';
import { focusElementById, useSpatialNavigation } from './hooks/useSpatialNavigation';
import {
  fetchOtaManifest,
  getCurrentAppVersion,
  getInstalledApps,
  launchAndroidApp,
  launchSuggestionUri,
  openTvSettings,
  startNativeOtaInstall,
} from './native/launcherBridge';
import type {
  AppSuggestion,
  AppVersionInfo,
  InstalledApp,
  LauncherOverlay,
  LauncherSettings,
  OtaDownloadProgress,
  OtaModalStatus,
  OtaVersionManifest,
} from './types/launcher';

const SETTINGS_STORAGE_KEY = 'cgamestv_launcher_settings_v2';

function loadSavedSettings(): LauncherSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LauncherSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      favoritePackages: Array.isArray(parsed.favoritePackages)
        ? parsed.favoritePackages
        : DEFAULT_SETTINGS.favoritePackages,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function App() {
  const [settings, setSettings] = useState<LauncherSettings>(loadSavedSettings);
  const [overlay, setOverlay] = useState<LauncherOverlay>('none');
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isNative, setIsNative] = useState(false);
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [launchingApp, setLaunchingApp] = useState<{ name: string; icon?: string } | null>(
    null
  );
  const [appVersion, setAppVersion] = useState<AppVersionInfo>({
    versionName: '1.0.0',
    versionCode: 100,
    packageName: 'com.cgamestv.launcher',
  });

  // Notificación sutil
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Estado OTA
  const [otaStatus, setOtaStatus] = useState<OtaModalStatus>('idle');
  const [remoteManifest, setRemoteManifest] = useState<OtaVersionManifest | null>(null);
  const [otaProgress, setOtaProgress] = useState<OtaDownloadProgress | null>(null);
  const [otaError, setOtaError] = useState<string | null>(null);
  const cleanupOtaRef = useRef<(() => void) | null>(null);

  // Sincronizar clase .dark en <html> para modo Día / Noche estilo Nava TV
  useEffect(() => {
    const root = document.documentElement;
    if (settings.themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.themeMode]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const updateSettings = useCallback((patch: Partial<LauncherSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignorar si almacenamiento está lleno
      }
      return next;
    });
  }, []);

  const loadLauncherData = useCallback(async () => {
    setIsLoadingApps(true);
    try {
      const [appsResult, versionInfo] = await Promise.all([
        getInstalledApps(),
        getCurrentAppVersion(),
      ]);
      setApps(appsResult.apps);
      setIsNative(appsResult.isNative);
      setAppVersion(versionInfo);
    } finally {
      setIsLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    void loadLauncherData();
  }, [loadLauncherData]);

  // Verificación OTA silenciosa al arrancar
  useEffect(() => {
    if (!settings.otaRepo || settings.otaRepo.startsWith('tu-usuario/')) return;
    let cancelled = false;
    fetchOtaManifest(settings.otaRepo)
      .then((manifest) => {
        if (!cancelled && manifest.versionCode > appVersion.versionCode) {
          setRemoteManifest(manifest);
        }
      })
      .catch(() => {
        // Silencioso al iniciar
      });
    return () => {
      cancelled = true;
    };
  }, [settings.otaRepo, appVersion.versionCode]);

  const closeOverlayToHome = useCallback((focusTargetId = 'row-featured-cgamestvparty') => {
    if (cleanupOtaRef.current) {
      cleanupOtaRef.current();
      cleanupOtaRef.current = null;
    }
    setOverlay('none');
    window.requestAnimationFrame(() => {
      focusElementById(focusTargetId);
    });
  }, []);

  useSpatialNavigation({
    enabled: overlay === 'none',
    onBack: () => focusElementById('row-featured-cgamestvparty'),
    scopeSelector: '#nava-home-shell',
  });

  const handleLaunchPackage = useCallback(
    async (packageName: string, displayName: string, icon?: string) => {
      setLaunchingApp({ name: displayName, icon });
      window.setTimeout(() => setLaunchingApp(null), 520);

      const result = await launchAndroidApp(packageName);
      if (!result.isNative) {
        showToast(`Iniciando ${displayName} (${packageName}) en Android TV`);
      } else if (!result.ok) {
        setLaunchingApp(null);
        showToast(
          result.error || `${displayName} (${packageName}) no está instalada en este TV.`
        );
      }
    },
    [showToast]
  );

  const handleLaunchApp = useCallback(
    (app: InstalledApp) => {
      void handleLaunchPackage(app.packageName, app.name, app.icon);
    },
    [handleLaunchPackage]
  );

  const handleLaunchSuggestion = useCallback(
    async (suggestion: AppSuggestion) => {
      const matchedApp = apps.find((a) => a.packageName === suggestion.packageName);
      setLaunchingApp({ name: `${suggestion.tag} · ${suggestion.title}`, icon: matchedApp?.icon });
      window.setTimeout(() => setLaunchingApp(null), 520);

      const res = await launchSuggestionUri(suggestion.deepLinkUrl, suggestion.packageName);
      if (!res.isNative) {
        showToast(`Abriendo "${suggestion.title}" en ${suggestion.appName}`);
      } else if (res.openedStore) {
        showToast(`Abriendo Play Store para instalar ${suggestion.appName}`);
      } else if (!res.ok) {
        setLaunchingApp(null);
        showToast(res.error || `No se pudo abrir ${suggestion.appName}`);
      }
    },
    [apps, showToast]
  );

  const handleToggleFavorite = useCallback(
    (app: InstalledApp) => {
      const exists = settings.favoritePackages.includes(app.packageName);
      const nextFavs = exists
        ? settings.favoritePackages.filter((pkg) => pkg !== app.packageName)
        : [app.packageName, ...settings.favoritePackages];
      updateSettings({ favoritePackages: nextFavs });
      showToast(
        exists
          ? `${app.name} quitada de la fila principal`
          : `${app.name} fijada en la fila principal`
      );
    },
    [settings.favoritePackages, updateSettings, showToast]
  );

  const handleOpenAndroidSettings = useCallback(
    async (section: 'settings' | 'wifi' | 'home' | 'unknown_sources') => {
      const opened = await openTvSettings(section);
      if (!opened) {
        showToast('Disponible al ejecutar el APK compilado en tu Android TV.');
      }
    },
    [showToast]
  );

  const runOtaCheck = useCallback(async () => {
    setOtaStatus('checking');
    setOtaError(null);
    setOtaProgress(null);

    try {
      const manifest = await fetchOtaManifest(settings.otaRepo);
      setRemoteManifest(manifest);
      if (manifest.versionCode > appVersion.versionCode) {
        setOtaStatus('update_available');
      } else {
        setOtaStatus('up_to_date');
      }
    } catch (err) {
      setOtaError(err instanceof Error ? err.message : 'Error al buscar actualización.');
      setOtaStatus('error');
    }
  }, [settings.otaRepo, appVersion.versionCode]);

  const handleOpenOtaModal = useCallback(() => {
    setOverlay('ota');
    void runOtaCheck();
  }, [runOtaCheck]);

  const handleStartOtaDownload = useCallback(async () => {
    if (!remoteManifest) return;
    if (cleanupOtaRef.current) {
      cleanupOtaRef.current();
    }

    setOtaStatus('downloading');
    setOtaError(null);
    setOtaProgress({
      percent: 0,
      downloadedBytes: 0,
      totalBytes: remoteManifest.fileSizeBytes || 0,
      status: 'downloading',
    });

    const cleanup = await startNativeOtaInstall(
      remoteManifest.apkUrl,
      remoteManifest.versionName,
      (prog) => {
        setOtaProgress(prog);
        if (prog.status === 'permission_required') {
          setOtaStatus('permission_required');
        } else if (prog.status === 'installing' || prog.status === 'completed') {
          setOtaStatus('installing');
        } else if (prog.status === 'error') {
          setOtaError(prog.message || 'Falló la descarga o instalación del APK.');
          setOtaStatus('error');
        }
      }
    );
    cleanupOtaRef.current = cleanup;
  }, [remoteManifest]);

  useEffect(() => {
    return () => {
      if (cleanupOtaRef.current) cleanupOtaRef.current();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const currentBackground = useMemo(() => {
    return (
      BACKGROUND_PRESETS.find((b) => b.id === settings.backgroundId) ||
      BACKGROUND_PRESETS[0]
    );
  }, [settings.backgroundId]);

  const featuredInstalled = useMemo(() => {
    return apps.some((a) => a.packageName === FEATURED_GAME.packageName);
  }, [apps]);

  const favoriteApps = useMemo(() => {
    const map = new Map(apps.map((a) => [a.packageName, a]));
    return settings.favoritePackages
      .map((pkg) => map.get(pkg))
      .filter((a): a is InstalledApp => Boolean(a));
  }, [apps, settings.favoritePackages]);

  const hasAvailableUpdate = Boolean(
    remoteManifest && remoteManifest.versionCode > appVersion.versionCode
  );

  const isLight = settings.themeMode === 'light';
  const backgroundStyle = isLight
    ? currentBackground.lightValue.startsWith('#')
      ? { backgroundColor: currentBackground.lightValue }
      : { backgroundImage: currentBackground.lightValue }
    : currentBackground.type === 'solid'
      ? { backgroundColor: currentBackground.value }
      : currentBackground.type === 'gradient'
        ? { backgroundImage: currentBackground.value }
        : undefined;

  return (
    <div
      id="nava-home-shell"
      className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#ECEEF2] dark:bg-[#090B10] text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
      style={backgroundStyle}
    >
      {/* Fondo de imagen limpio en modo Noche (sin blur) */}
      {!isLight && currentBackground.type === 'image' && (
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0">
          <img
            src={currentBackground.value}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#090B10]/55 via-[#090B10]/30 to-[#090B10]/90" />
        </div>
      )}

      {/* Interfaz principal Nava TV: periferia ligera + fila única centrada */}
      <motion.div
        animate={{
          scale: overlay !== 'none' ? 0.975 : 1,
          opacity: overlay !== 'none' ? 0.35 : 1,
        }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        className="relative z-10 flex flex-col h-full min-h-0"
      >
        <NavaTopBar
          themeMode={settings.themeMode}
          use24HourClock={settings.use24HourClock}
          hasAvailableUpdate={hasAvailableUpdate}
          onToggleTheme={() =>
            updateSettings({
              themeMode: settings.themeMode === 'dark' ? 'light' : 'dark',
            })
          }
          onOpenSearch={() => setOverlay('search')}
          onOpenOta={handleOpenOtaModal}
          onOpenSettings={() => setOverlay('settings')}
        />

        <NavaSingleRowHome
          allApps={apps}
          favoriteApps={favoriteApps}
          totalAppsCount={apps.length}
          featuredInstalled={featuredInstalled}
          isNative={isNative}
          showPackageNames={settings.showPackageNames}
          showSuggestions={settings.showSuggestions}
          onLaunchFeatured={() =>
            void handleLaunchPackage(
              FEATURED_GAME.packageName,
              FEATURED_GAME.name,
              FEATURED_GAME.bannerImage
            )
          }
          onLaunchApp={handleLaunchApp}
          onLaunchSuggestion={(sug) => void handleLaunchSuggestion(sug)}
          onToggleFavorite={handleToggleFavorite}
          onOpenAllApps={() => setOverlay('apps')}
        />
      </motion.div>

      {/* Animación fluida al lanzar una app (estilo Nava TV) */}
      <AnimatePresence>
        {launchingApp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 bg-[#ECEEF2] dark:bg-[#090B10] flex flex-col items-center justify-center gap-4 pointer-events-none"
          >
            {launchingApp.icon && (
              <img
                src={launchingApp.icon}
                alt=""
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-3xl object-cover shadow-2xl"
              />
            )}
            <span className="font-display text-2xl font-semibold text-zinc-900 dark:text-white">
              {launchingApp.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays fluidos */}
      <NavaAppsDrawer
        isOpen={overlay === 'apps'}
        apps={apps}
        favoritePackages={settings.favoritePackages}
        showPackageNames={settings.showPackageNames}
        isLoading={isLoadingApps}
        isNative={isNative}
        onRefresh={() => void loadLauncherData()}
        onLaunchApp={handleLaunchApp}
        onToggleFavorite={handleToggleFavorite}
        onClose={() => closeOverlayToHome('row-all-apps')}
      />

      <NavaSearchOverlay
        isOpen={overlay === 'search'}
        apps={apps}
        onLaunchApp={handleLaunchApp}
        onClose={() => closeOverlayToHome('top-search')}
      />

      <NavaSettingsDrawer
        isOpen={overlay === 'settings'}
        settings={settings}
        appVersion={appVersion}
        isNative={isNative}
        onUpdateSettings={updateSettings}
        onOpenAndroidSettings={(section) => void handleOpenAndroidSettings(section)}
        onOpenOtaModal={handleOpenOtaModal}
        onClose={() => closeOverlayToHome('top-settings')}
      />

      <OtaUpdateModal
        isOpen={overlay === 'ota'}
        repoSlug={settings.otaRepo}
        currentVersion={appVersion}
        remoteManifest={remoteManifest}
        status={otaStatus}
        progress={otaProgress}
        errorMessage={otaError}
        isNative={isNative}
        onCheckAgain={() => void runOtaCheck()}
        onStartDownload={() => void handleStartOtaDownload()}
        onOpenUnknownSources={() => void handleOpenAndroidSettings('unknown_sources')}
        onClose={() => closeOverlayToHome('top-ota')}
      />

      {/* Toast minimalista */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-sm font-medium shadow-xl"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
