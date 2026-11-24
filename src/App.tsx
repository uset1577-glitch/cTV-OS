import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GoogleTvHome } from './components/GoogleTvHome';
import { LivePlatformsView } from './components/LivePlatformsView';
import { NavaAppsDrawer } from './components/NavaAppsDrawer';
import { NavaSearchOverlay } from './components/NavaSearchOverlay';
import { NavaSettingsDrawer } from './components/NavaSettingsDrawer';
import { NavaTopBar } from './components/NavaTopBar';
import { AppUpdateModal } from './components/AppUpdateModal';
import {
  BACKGROUND_PRESETS,
  DEFAULT_SETTINGS,
  FEATURED_GAME,
} from './data/presets';
import {
  fetchGoogleTvLiveCatalog,
  OFFLINE_FALLBACK_CATALOG,
} from './data/suggestions';
import { focusElementById, useSpatialNavigation } from './hooks/useSpatialNavigation';
import {
  checkAppUpdate,
  getCurrentAppVersion,
  getInstalledApps,
  launchAndroidApp,
  launchSuggestionUri,
  openTvSettings,
  startAppUpdateInstall,
} from './native/launcherBridge';
import type {
  AppDownloadProgress,
  AppSuggestion,
  AppUpdateManifest,
  AppUpdateModalStatus,
  AppVersionInfo,
  GoogleTvLiveCatalog,
  HomeTab,
  InstalledApp,
  LauncherOverlay,
  LauncherSettings,
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
  const [activeTab, setActiveTab] = useState<HomeTab>('inicio');
  const [overlay, setOverlay] = useState<LauncherOverlay>('none');
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [isNative, setIsNative] = useState(false);
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [liveCatalog, setLiveCatalog] = useState<GoogleTvLiveCatalog>(OFFLINE_FALLBACK_CATALOG);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
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

  // Estado actualización de la aplicación estilo Xuper TV
  const [updateStatus, setUpdateStatus] = useState<AppUpdateModalStatus>('idle');
  const [remoteManifest, setRemoteManifest] = useState<AppUpdateManifest | null>(null);
  const [updateProgress, setUpdateProgress] = useState<AppDownloadProgress | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const cleanupUpdateRef = useRef<(() => void) | null>(null);

  // Sincronizar clase .dark en <html>
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

  const loadLiveCatalog = useCallback(async (force = false) => {
    setIsLoadingCatalog(true);
    try {
      const catalog = await fetchGoogleTvLiveCatalog(force);
      setLiveCatalog(catalog);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void loadLauncherData();
    void loadLiveCatalog(false);
  }, [loadLauncherData, loadLiveCatalog]);

  // Verificación de actualización en segundo plano
  useEffect(() => {
    if (!settings.updateRepo || settings.updateRepo.startsWith('tu-usuario/')) return;
    let cancelled = false;
    checkAppUpdate(settings.updateRepo, appVersion.versionCode)
      .then((res) => {
        if (!cancelled && res.hasUpdate && res.manifest) {
          setRemoteManifest(res.manifest);
        }
      })
      .catch(() => {
        // Silencioso al iniciar
      });
    return () => {
      cancelled = true;
    };
  }, [settings.updateRepo, appVersion.versionCode]);

  const closeOverlayToHome = useCallback(
    (focusTargetId = `row-app-${FEATURED_GAME.packageName}`) => {
      if (cleanupUpdateRef.current) {
        cleanupUpdateRef.current();
        cleanupUpdateRef.current = null;
      }
      setOverlay('none');
      window.requestAnimationFrame(() => {
        focusElementById(focusTargetId);
      });
    },
    []
  );

  useSpatialNavigation({
    enabled: overlay === 'none',
    onBack: () => {
      if (activeTab !== 'inicio') {
        setActiveTab('inicio');
        window.requestAnimationFrame(() => {
          focusElementById(`row-app-${FEATURED_GAME.packageName}`);
        });
      } else {
        focusElementById(`row-app-${FEATURED_GAME.packageName}`);
      }
    },
    scopeSelector: '#gtv-home-shell',
  });

  const handleSelectTab = useCallback((tab: HomeTab) => {
    if (tab === 'apps') {
      setOverlay('apps');
      return;
    }
    setActiveTab(tab);
  }, []);

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
          ? `${app.name} quitada de Tus aplicaciones`
          : `${app.name} fijada en Tus aplicaciones`
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

  const runUpdateCheck = useCallback(async (customRepo?: string) => {
    const targetRepo = (customRepo !== undefined ? customRepo : settings.updateRepo).trim();
    setUpdateStatus('checking');
    setUpdateMessage(null);
    setUpdateProgress(null);

    const result = await checkAppUpdate(targetRepo, appVersion.versionCode);
    setUpdateMessage(result.message);
    if (result.hasUpdate && result.manifest) {
      setRemoteManifest(result.manifest);
      setUpdateStatus('update_available');
    } else {
      setUpdateStatus('up_to_date');
    }
  }, [settings.updateRepo, appVersion.versionCode]);

  const handleOpenUpdateModal = useCallback(() => {
    setOverlay('update');
    void runUpdateCheck();
  }, [runUpdateCheck]);

  const handleStartUpdateDownload = useCallback(async () => {
    if (!remoteManifest) return;
    if (cleanupUpdateRef.current) {
      cleanupUpdateRef.current();
    }

    setUpdateStatus('downloading');
    setUpdateMessage(null);
    setUpdateProgress({
      percent: 0,
      downloadedBytes: 0,
      totalBytes: remoteManifest.fileSizeBytes || 0,
      status: 'downloading',
    });

    const cleanup = await startAppUpdateInstall(
      remoteManifest.apkUrl,
      remoteManifest.versionName,
      (prog) => {
        setUpdateProgress(prog);
        if (prog.status === 'permission_required') {
          setUpdateStatus('permission_required');
        } else if (prog.status === 'installing' || prog.status === 'completed') {
          setUpdateStatus('installing');
        } else if (prog.status === 'error') {
          setUpdateMessage(prog.message || 'Falló la descarga o instalación de la app.');
          setUpdateStatus('error');
        }
      }
    );
    cleanupUpdateRef.current = cleanup;
  }, [remoteManifest]);

  useEffect(() => {
    return () => {
      if (cleanupUpdateRef.current) cleanupUpdateRef.current();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const currentBackground = useMemo(() => {
    return (
      BACKGROUND_PRESETS.find((b) => b.id === settings.backgroundId) ||
      BACKGROUND_PRESETS[0]
    );
  }, [settings.backgroundId]);

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
      : { backgroundImage: currentBackground.value };

  return (
    <div
      id="gtv-home-shell"
      className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#F4F6F9] dark:bg-[#0E1015] text-zinc-900 dark:text-zinc-100 transition-colors duration-300"
      style={backgroundStyle}
    >
      <motion.div
        animate={{
          scale: overlay !== 'none' ? 0.975 : 1,
          opacity: overlay !== 'none' ? 0.35 : 1,
        }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col h-full min-h-0"
      >
        <NavaTopBar
          activeTab={overlay === 'apps' ? 'apps' : activeTab}
          themeMode={settings.themeMode}
          use24HourClock={settings.use24HourClock}
          hasAvailableUpdate={hasAvailableUpdate}
          onSelectTab={handleSelectTab}
          onToggleTheme={() =>
            updateSettings({
              themeMode: settings.themeMode === 'dark' ? 'light' : 'dark',
            })
          }
          onOpenSearch={() => setOverlay('search')}
          onOpenUpdate={handleOpenUpdateModal}
          onOpenSettings={() => setOverlay('settings')}
        />

        {activeTab === 'inicio' ? (
          <GoogleTvHome
            allApps={apps}
            favoriteApps={favoriteApps}
            liveCatalog={liveCatalog}
            isLoadingCatalog={isLoadingCatalog}
            isNative={isNative}
            showSuggestions={settings.showSuggestions}
            onRefreshCatalog={() => void loadLiveCatalog(true)}
            onLaunchFeatured={() =>
              void handleLaunchPackage(FEATURED_GAME.packageName, FEATURED_GAME.name)
            }
            onLaunchApp={handleLaunchApp}
            onLaunchSuggestion={(sug) => void handleLaunchSuggestion(sug)}
            onToggleFavorite={handleToggleFavorite}
            onOpenAllApps={() => setOverlay('apps')}
          />
        ) : (
          <LivePlatformsView
            allApps={apps}
            series={liveCatalog.series}
            isLoading={isLoadingCatalog}
            onRefreshFeed={() => void loadLiveCatalog(true)}
            onLaunchSuggestion={(sug) => void handleLaunchSuggestion(sug)}
          />
        )}
      </motion.div>

      {/* Animación limpia al abrir una aplicación */}
      <AnimatePresence>
        {launchingApp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 bg-[#F4F6F9] dark:bg-[#0E1015] flex flex-col items-center justify-center gap-4 pointer-events-none"
          >
            {launchingApp.icon && (
              <img
                src={launchingApp.icon}
                alt=""
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full object-cover shadow-2xl"
              />
            )}
            <span className="font-display text-2xl font-semibold text-zinc-900 dark:text-white">
              {launchingApp.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
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
        onOpenUpdateModal={handleOpenUpdateModal}
        onClose={() => closeOverlayToHome('top-settings')}
      />

      <AppUpdateModal
        isOpen={overlay === 'update'}
        updateRepo={settings.updateRepo}
        currentVersion={appVersion}
        remoteManifest={remoteManifest}
        status={updateStatus}
        progress={updateProgress}
        message={updateMessage}
        isNative={isNative}
        onUpdateRepo={(newRepo) => updateSettings({ updateRepo: newRepo })}
        onCheckAgain={(customRepo) => void runUpdateCheck(customRepo)}
        onStartDownload={() => void handleStartUpdateDownload()}
        onOpenUnknownSources={() => void handleOpenAndroidSettings('unknown_sources')}
        onClose={() => closeOverlayToHome(hasAvailableUpdate ? 'top-update' : 'top-settings')}
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
