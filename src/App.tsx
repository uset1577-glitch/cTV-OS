import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Shield } from 'lucide-react';
import { CreatorAdminPanel } from './components/CreatorAdminPanel';
import { GoogleTvHome } from './components/GoogleTvHome';
import { LivePlatformsView } from './components/LivePlatformsView';
import { MaintenanceNoticeModal } from './components/MaintenanceNoticeModal';
import { NavaAppsDrawer } from './components/NavaAppsDrawer';
import { NavaSearchOverlay } from './components/NavaSearchOverlay';
import { NavaSettingsDrawer } from './components/NavaSettingsDrawer';
import { NavaTopBar } from './components/NavaTopBar';
import { AppUpdateModal } from './components/AppUpdateModal';
import { VoraScreensaver } from './components/VoraScreensaver';
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
import { useSpotifyNowPlaying } from './hooks/useSpotifyNowPlaying';
import {
  checkAppUpdate,
  fetchLauncherRemoteStatus,
  getCurrentAppVersion,
  getInstalledApps,
  getMusicServiceStatus,
  isRemoteVersionNewer,
  launchAndroidApp,
  launchSuggestionUri,
  openSpotifyAccessibilitySettings,
  openSpotifyNotificationSettings,
  openTvSettings,
  setNativeKeepScreenOn,
  startAppUpdateInstall,
} from './native/launcherBridge';
import {
  setGlobalLauncherStatus,
  subscribeToLauncherStatus,
  testFirestoreConnection,
} from './services/firebase';
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
  LauncherRemoteStatus,
  LauncherSettings,
  MusicServiceStatus,
} from './types/launcher';

const SETTINGS_STORAGE_KEY = 'cgamestv_launcher_settings_v2';
const DISMISSED_UPDATE_SESSION_KEY = 'vora_dismissed_update_version';

function loadSavedSettings(): LauncherSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LauncherSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      updateRepo: parsed.updateRepo?.trim() ? parsed.updateRepo : DEFAULT_SETTINGS.updateRepo,
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
  const [isVersionLoaded, setIsVersionLoaded] = useState(false);
  const [topBarVisible, setTopBarVisible] = useState(true);
  const lastCatalogFetchRef = useRef<number>(0);
  const lastRemoteStatusFetchRef = useRef<number>(0);
  const hasAutoPromptedUpdateRef = useRef(false);

  // Estado del Panel de Control de Creador (Exclusivo para PC / Navegador)
  const [showCreatorAdmin, setShowCreatorAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('admin') === 'true' || window.location.hash.toLowerCase() === '#admin';
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('admin') === 'true' || window.location.hash.toLowerCase() === '#admin') {
        setShowCreatorAdmin(true);
      }
    };

    const handleKeyShortcuts = (e: KeyboardEvent) => {
      // Atajo para PC: Ctrl + Shift + A abre el panel de control del creador
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setShowCreatorAdmin((prev) => !prev);
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('keydown', handleKeyShortcuts);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('keydown', handleKeyShortcuts);
    };
  }, []);

  // Salvapantallas VORA TV OS (inactividad, activación manual e intercepción Google TV)
  const [isScreensaverActive, setIsScreensaverActive] = useState(false);
  const screensaverTimerRef = useRef<number | null>(null);
  const screensaverActivatedAtRef = useRef<number>(0);
  const [musicServiceStatus, setMusicServiceStatus] = useState<MusicServiceStatus>({
    hasNotificationAccess: false,
    hasAccessibilityAccess: false,
    isGoogleTv: false,
  });

  const {
    nowPlaying: spotifyNowPlaying,
    refreshSpotify,
  } = useSpotifyNowPlaying(isScreensaverActive);

  const activateScreensaver = useCallback(() => {
    screensaverActivatedAtRef.current = Date.now();
    setOverlay('none');
    setIsScreensaverActive(true);
    void refreshSpotify();
  }, [refreshSpotify]);

  const refreshMusicServiceStatus = useCallback(async () => {
    const status = await getMusicServiceStatus();
    setMusicServiceStatus(status);
  }, []);

  useEffect(() => {
    void refreshMusicServiceStatus();
    const handleLaunchScreensaver = () => activateScreensaver();
    const handleServiceRefresh = () => {
      void refreshMusicServiceStatus();
    };
    window.addEventListener('voraLaunchScreensaver', handleLaunchScreensaver);
    window.addEventListener('voraTvResume', handleServiceRefresh);
    window.addEventListener('focus', handleServiceRefresh);
    return () => {
      window.removeEventListener('voraLaunchScreensaver', handleLaunchScreensaver);
      window.removeEventListener('voraTvResume', handleServiceRefresh);
      window.removeEventListener('focus', handleServiceRefresh);
    };
  }, [activateScreensaver, refreshMusicServiceStatus]);

  useEffect(() => {
    if (overlay === 'settings') {
      void refreshMusicServiceStatus();
    }
  }, [overlay, refreshMusicServiceStatus]);

  const resetScreensaverTimer = useCallback(() => {
    if (screensaverTimerRef.current) {
      window.clearTimeout(screensaverTimerRef.current);
    }
    if (isScreensaverActive) {
      if (Date.now() - screensaverActivatedAtRef.current < 800) {
        return;
      }
      setIsScreensaverActive(false);
    }
    // 3 minutos de inactividad (180,000 ms)
    screensaverTimerRef.current = window.setTimeout(() => {
      if (overlay === 'none' && !showCreatorAdmin) {
        screensaverActivatedAtRef.current = Date.now();
        setIsScreensaverActive(true);
      }
    }, 180_000);
  }, [isScreensaverActive, overlay, showCreatorAdmin]);

  useEffect(() => {
    resetScreensaverTimer();
    const handleActivity = () => resetScreensaverTimer();

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('pointerdown', handleActivity);

    return () => {
      if (screensaverTimerRef.current) {
        window.clearTimeout(screensaverTimerRef.current);
      }
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
    };
  }, [resetScreensaverTimer]);

  // Mantener pantalla encendida en Android TV mientras VORA TV OS / Salvapantallas esté activo
  // para impedir que el salvapantallas de Google TV se superponga
  useEffect(() => {
    void setNativeKeepScreenOn(true);
  }, [isScreensaverActive]);
  const [remoteStatus, setRemoteStatus] = useState<LauncherRemoteStatus>({
    maintenanceMode: false,
    appsOnlyMode: false,
    title: 'Mantenimiento · Próxima actualización',
    message:
      'El modo solo apps será activado mientras preparamos la próxima actualización de VORA TV OS.',
  });
  const wasMaintenanceForcedRef = useRef(false);

  const loadLauncherData = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoadingApps(true);
    }
    try {
      const [appsResult, versionInfo] = await Promise.all([
        getInstalledApps(),
        getCurrentAppVersion(),
      ]);
      setApps(appsResult.apps);
      setIsNative(appsResult.isNative);
      setAppVersion(versionInfo);
      setIsVersionLoaded(true);
    } finally {
      if (!silent) {
        setIsLoadingApps(false);
      }
    }
  }, []);

  const loadLiveCatalog = useCallback(async (force = false) => {
    setIsLoadingCatalog(true);
    try {
      const catalog = await fetchGoogleTvLiveCatalog(force);
      lastCatalogFetchRef.current = Date.now();
      setLiveCatalog(catalog);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  const loadRemoteStatus = useCallback(
    async (repoSlug: string) => {
      try {
        lastRemoteStatusFetchRef.current = Date.now();
        const status = await fetchLauncherRemoteStatus(repoSlug);
        setRemoteStatus(status);

        const forcedNow = Boolean(status.maintenanceMode || status.appsOnlyMode);
        if (forcedNow && !wasMaintenanceForcedRef.current) {
          wasMaintenanceForcedRef.current = true;
          setActiveTab('inicio');
          setTopBarVisible(true);
          setOverlay((curr) => (curr === 'none' || curr === 'update' ? 'maintenance' : curr));
        } else if (!forcedNow && wasMaintenanceForcedRef.current) {
          wasMaintenanceForcedRef.current = false;
          setOverlay((curr) => (curr === 'maintenance' ? 'none' : curr));
          void loadLiveCatalog(true);
        }
      } catch {
        // Silencioso si no hay conexión
      }
    },
    [loadLiveCatalog]
  );

  // Notificación sutil
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Estado actualización de la aplicación
  const [updateStatus, setUpdateStatus] = useState<AppUpdateModalStatus>('idle');
  const [remoteManifest, setRemoteManifest] = useState<AppUpdateManifest | null>(null);
  const [updateProgress, setUpdateProgress] = useState<AppDownloadProgress | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const cleanupUpdateRef = useRef<(() => void) | null>(null);

  const isMaintenanceForced = Boolean(
    settings.maintenanceMode || remoteStatus.maintenanceMode
  );
  const effectiveAppsOnly = isMaintenanceForced || settings.appsOnlyMode;

  const activeMaintenanceStatus: LauncherRemoteStatus = {
    maintenanceMode: isMaintenanceForced,
    appsOnlyMode: effectiveAppsOnly,
    title: remoteStatus.title || settings.maintenanceTitle,
    message: remoteStatus.message || settings.maintenanceMessage,
  };

  // Sincronizar clase .dark en <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.themeMode]);

  // Si se activa mantenimiento local o remoto, mostrar cartel obligatorio
  useEffect(() => {
    if (isMaintenanceForced && !wasMaintenanceForcedRef.current) {
      wasMaintenanceForcedRef.current = true;
      setActiveTab('inicio');
      setTopBarVisible(true);
      setOverlay((curr) => (curr === 'none' || curr === 'update' ? 'maintenance' : curr));
    } else if (!isMaintenanceForced && wasMaintenanceForcedRef.current) {
      wasMaintenanceForcedRef.current = false;
      setOverlay((curr) => (curr === 'maintenance' ? 'none' : curr));
      void loadLiveCatalog(true);
    }
  }, [isMaintenanceForced, loadLiveCatalog]);

  // Si está activo el Modo Solo Apps, garantizar pestaña Inicio (ocultar En vivo)
  useEffect(() => {
    if (effectiveAppsOnly && activeTab === 'envivo') {
      setActiveTab('inicio');
      setTopBarVisible(true);
    }
  }, [effectiveAppsOnly, activeTab]);

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



  useEffect(() => {
    void loadLauncherData(false);
    void testFirestoreConnection();
    const unsubscribe = subscribeToLauncherStatus((status) => {
      setRemoteStatus(status);
      const forcedNow = Boolean(status.maintenanceMode);
      if (forcedNow && !wasMaintenanceForcedRef.current) {
        wasMaintenanceForcedRef.current = true;
        setActiveTab('inicio');
        setTopBarVisible(true);
        setOverlay((curr) => (curr === 'none' || curr === 'update' ? 'maintenance' : curr));
      } else if (!forcedNow && wasMaintenanceForcedRef.current) {
        wasMaintenanceForcedRef.current = false;
        setOverlay((curr) => (curr === 'maintenance' ? 'none' : curr));
        void loadLiveCatalog(true);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadLauncherData, loadLiveCatalog]);

  useEffect(() => {
    if (!effectiveAppsOnly) {
      void loadLiveCatalog(true);
    }
  }, [effectiveAppsOnly, loadLiveCatalog]);

  // Refrescar recomendaciones, apps y estado remoto de mantenimiento al volver a la TV
  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastRemoteStatusFetchRef.current > 15_000) {
        void loadRemoteStatus(settings.updateRepo);
      }
      if (now - lastCatalogFetchRef.current > 2_500) {
        if (!effectiveAppsOnly) {
          void loadLiveCatalog(true);
        }
        void loadLauncherData(true);
      }
    };

    const periodicStatusId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadRemoteStatus(settings.updateRepo);
      }
    }, 5 * 60_000);

    const periodicCatalogId = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !effectiveAppsOnly) {
        void loadLiveCatalog(true);
      }
    }, 30 * 60_000);

    document.addEventListener('visibilitychange', refreshOnReturn);
    window.addEventListener('focus', refreshOnReturn);
    window.addEventListener('pageshow', refreshOnReturn);
    window.addEventListener('voraTvResume', refreshOnReturn);
    return () => {
      window.clearInterval(periodicStatusId);
      window.clearInterval(periodicCatalogId);
      document.removeEventListener('visibilitychange', refreshOnReturn);
      window.removeEventListener('focus', refreshOnReturn);
      window.removeEventListener('pageshow', refreshOnReturn);
      window.removeEventListener('voraTvResume', refreshOnReturn);
    };
  }, [effectiveAppsOnly, loadLiveCatalog, loadLauncherData, loadRemoteStatus, settings.updateRepo]);

  // Verificación automática al entrar a la app: solo notifica si la versión remota es realmente mayor
  useEffect(() => {
    if (!isVersionLoaded) return;
    if (!settings.updateRepo || settings.updateRepo.startsWith('tu-usuario/')) return;
    let cancelled = false;
    checkAppUpdate(settings.updateRepo, appVersion.versionCode, appVersion.versionName)
      .then((res) => {
        if (cancelled) return;
        if (res.hasUpdate && res.manifest) {
          setRemoteManifest(res.manifest);
          const dismissedVer = sessionStorage.getItem(DISMISSED_UPDATE_SESSION_KEY);
          if (
            !hasAutoPromptedUpdateRef.current &&
            dismissedVer !== res.manifest.versionName
          ) {
            hasAutoPromptedUpdateRef.current = true;
            setUpdateStatus('update_available');
            setUpdateMessage(res.message);
            setOverlay((curr) => (curr === 'none' ? 'update' : curr));
          }
        } else {
          setRemoteManifest(null);
        }
      })
      .catch(() => {
        // Silencioso al iniciar
      });
    return () => {
      cancelled = true;
    };
  }, [isVersionLoaded, settings.updateRepo, appVersion.versionCode, appVersion.versionName]);

  const closeOverlayToHome = useCallback(
    (focusTargetId = `row-app-${FEATURED_GAME.packageName}`) => {
      if (cleanupUpdateRef.current) {
        cleanupUpdateRef.current();
        cleanupUpdateRef.current = null;
      }
      if (overlay === 'update' && remoteManifest?.versionName) {
        try {
          sessionStorage.setItem(DISMISSED_UPDATE_SESSION_KEY, remoteManifest.versionName);
        } catch {
          // Ignorar
        }
      }
      setOverlay('none');
      window.requestAnimationFrame(() => {
        focusElementById(focusTargetId);
      });
    },
    [overlay, remoteManifest]
  );

  useSpatialNavigation({
    enabled: overlay === 'none',
    onBack: () => {
      setTopBarVisible(true);
      const scrollEl = document.querySelector<HTMLElement>('[data-tv-scroll-container="true"]');
      scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
      if (activeTab !== 'inicio') {
        setActiveTab('inicio');
      }
      window.requestAnimationFrame(() => {
        focusElementById(`row-app-${FEATURED_GAME.packageName}`);
      });
    },
    scopeSelector: '#gtv-home-shell',
  });

  const handleSelectTab = useCallback(
    (tab: HomeTab) => {
      if (tab === 'apps') {
        setOverlay('apps');
        return;
      }
      if (effectiveAppsOnly && tab === 'envivo') {
        return;
      }
      setTopBarVisible(true);
      setActiveTab(tab);
    },
    [effectiveAppsOnly]
  );

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
    async (section: 'settings' | 'wifi' | 'home' | 'screensaver' | 'accessibility' | 'unknown_sources') => {
      const opened = await openTvSettings(section);
      if (!opened) {
        showToast('Disponible al ejecutar el APK compilado en tu Android TV.');
      }
    },
    [showToast]
  );

  const runUpdateCheck = useCallback(
    async (customRepo?: string) => {
      const targetRepo = (customRepo !== undefined ? customRepo : settings.updateRepo).trim();
      setUpdateStatus('checking');
      setUpdateMessage(null);
      setUpdateProgress(null);

      const result = await checkAppUpdate(
        targetRepo,
        appVersion.versionCode,
        appVersion.versionName
      );
      setUpdateMessage(result.message);
      if (result.hasUpdate && result.manifest) {
        setRemoteManifest(result.manifest);
        setUpdateStatus('update_available');
      } else {
        setRemoteManifest(null);
        setUpdateStatus('up_to_date');
      }
    },
    [settings.updateRepo, appVersion.versionCode, appVersion.versionName]
  );

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

  const hasAvailableUpdate = isRemoteVersionNewer(
    remoteManifest,
    appVersion.versionCode,
    appVersion.versionName
  );

  const isLight = settings.themeMode === 'light';
  const backgroundStyle = isLight
    ? currentBackground.lightValue.startsWith('#')
      ? { backgroundColor: currentBackground.lightValue }
      : { backgroundImage: currentBackground.lightValue }
    : currentBackground.type === 'solid'
      ? { backgroundColor: currentBackground.value }
      : { backgroundImage: currentBackground.value };

  if (showCreatorAdmin) {
    return <CreatorAdminPanel onExit={() => setShowCreatorAdmin(false)} />;
  }

  return (
    <div
      id="gtv-home-shell"
      className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#DCE3EE] dark:bg-[#0E1015] text-slate-900 dark:text-zinc-100 transition-colors duration-300"
      style={backgroundStyle}
    >
      <div
        className={`relative z-10 flex flex-col h-full min-h-0 transition-opacity duration-150 ${
          overlay !== 'none' ? 'opacity-35 pointer-events-none' : 'opacity-100'
        }`}
      >
        <NavaTopBar
          activeTab={overlay === 'apps' ? 'apps' : activeTab}
          themeMode={settings.themeMode}
          use24HourClock={settings.use24HourClock}
          hasAvailableUpdate={hasAvailableUpdate}
          isVisible={topBarVisible}
          isOverHero={activeTab === 'inicio' && !effectiveAppsOnly}
          appsOnlyMode={effectiveAppsOnly}
          onSelectTab={handleSelectTab}
          onToggleTheme={() =>
            updateSettings({
              themeMode: settings.themeMode === 'dark' ? 'light' : 'dark',
            })
          }
          onOpenScreensaver={activateScreensaver}
          onOpenSearch={() => setOverlay('search')}
          onOpenUpdate={handleOpenUpdateModal}
          onOpenSettings={() => setOverlay('settings')}
        />

        {activeTab === 'inicio' || effectiveAppsOnly ? (
          <GoogleTvHome
            allApps={apps}
            favoriteApps={favoriteApps}
            liveCatalog={liveCatalog}
            isNative={isNative}
            showSuggestions={settings.showSuggestions}
            appsOnlyMode={effectiveAppsOnly}
            maintenanceNotice={isMaintenanceForced ? activeMaintenanceStatus : null}
            heroFadeColor={isLight ? currentBackground.fadeLight : currentBackground.fadeDark}
            onScrollTopChange={setTopBarVisible}
            onLaunchFeatured={() =>
              void handleLaunchPackage(FEATURED_GAME.packageName, FEATURED_GAME.name)
            }
            onLaunchApp={handleLaunchApp}
            onLaunchSuggestion={(sug) => void handleLaunchSuggestion(sug)}
            onToggleFavorite={handleToggleFavorite}
            onOpenAllApps={() => setOverlay('apps')}
            onOpenMaintenanceInfo={() => setOverlay('maintenance')}
          />
        ) : (
          <LivePlatformsView
            allApps={apps}
            series={liveCatalog.series}
            isLoading={isLoadingCatalog}
            onScrollTopChange={setTopBarVisible}
            onRefreshFeed={() => void loadLiveCatalog(true)}
            onLaunchSuggestion={(sug) => void handleLaunchSuggestion(sug)}
          />
        )}
      </div>

      {/* Animación limpia al abrir una aplicación */}
      <AnimatePresence>
        {launchingApp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 bg-[#DCE3EE] dark:bg-[#0E1015] flex flex-col items-center justify-center gap-4 pointer-events-none"
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
        isMaintenanceForced={isMaintenanceForced}
        musicServiceStatus={musicServiceStatus}
        onUpdateSettings={updateSettings}
        onOpenAndroidSettings={(section) => void handleOpenAndroidSettings(section)}
        onOpenAccessibilitySettings={() => {
          void openSpotifyAccessibilitySettings().then((opened) => {
            if (!opened) {
              showToast('Disponible al ejecutar el APK compilado en tu Android TV.');
            }
          });
        }}
        onOpenNotificationSettings={() => {
          void openSpotifyNotificationSettings().then((opened) => {
            if (!opened) {
              showToast('Disponible al ejecutar el APK compilado en tu Android TV.');
            }
          });
        }}
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

      <MaintenanceNoticeModal
        isOpen={overlay === 'maintenance'}
        status={activeMaintenanceStatus}
        onAcknowledge={() => closeOverlayToHome(`row-app-${FEATURED_GAME.packageName}`)}
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

      {/* Salvapantallas VORA TV OS (reemplaza salvapantallas de Google TV) */}
      <VoraScreensaver
        isActive={isScreensaverActive}
        use24HourClock={settings.use24HourClock}
        spotify={spotifyNowPlaying}
        onDismiss={() => setIsScreensaverActive(false)}
      />

      {/* Botón flotante para el creador en PC (SOLO en navegador web de escritorio, NUNCA en Android TV) */}
      {!isNative && (
        <button
          type="button"
          onClick={() => setShowCreatorAdmin(true)}
          title="Panel de Control del Creador (Solo PC - Atajo: Ctrl+Shift+A)"
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/85 dark:bg-zinc-900/85 backdrop-blur-md border border-amber-500/35 text-amber-400 hover:text-zinc-950 hover:bg-amber-400 text-xs font-bold shadow-xl transition-all active:scale-95 cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Panel Creador (PC)</span>
        </button>
      )}
    </div>
  );
}
