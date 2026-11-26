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
import { TvBootIntro } from './components/TvBootIntro';
import { VoraScreensaver } from './components/VoraScreensaver';
import {
  BACKGROUND_PRESETS,
  DEFAULT_SETTINGS,
  FEATURED_GAME,
  WEB_PREVIEW_APPS,
} from './data/presets';
import {
  deduplicateCatalog,
  fetchGoogleTvLiveCatalog,
  getDailyDateKey,
  OFFLINE_FALLBACK_CATALOG,
} from './data/suggestions';
import {
  focusElementById,
  useSpatialNavigation,
} from './hooks/useSpatialNavigation';
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
  type TvSettingsSection,
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
      maintenanceMode: false,
      appsOnlyMode: false,
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
  const [isBootIntroActive, setIsBootIntroActive] = useState(true);
  const [apps, setApps] = useState<InstalledApp[]>(() => {
    try {
      const cached = localStorage.getItem('vora_installed_apps_cache');
      if (cached) {
        const parsed = JSON.parse(cached) as InstalledApp[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignorar
    }
    return [...WEB_PREVIEW_APPS];
  });
  const [isNative, setIsNative] = useState(false);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
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
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const lastCatalogFetchRef = useRef<number>(0);
  const lastCatalogDateRef = useRef<string>(getDailyDateKey());
  const lastRemoteStatusFetchRef = useRef<number>(0);
  const hasAutoPromptedUpdateRef = useRef(false);
  const appsRef = useRef<InstalledApp[]>(apps);
  const favoritePackagesRef = useRef<string[]>(settings.favoritePackages);
  const catalogInFlightRef = useRef<Promise<void> | null>(null);
  const catalogInitializedRef = useRef(false);
  appsRef.current = apps;
  favoritePackagesRef.current = settings.favoritePackages;

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
  const lastActivityAtRef = useRef<number>(Date.now());
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

  useEffect(() => {
    if (sleepTimerMinutes === null || sleepTimerMinutes <= 0) return;
    const id = window.setInterval(() => {
      setSleepTimerMinutes((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          activateScreensaver();
          return null;
        }
        return prev - 1;
      });
    }, 60_000);
    return () => window.clearInterval(id);
  }, [sleepTimerMinutes, activateScreensaver]);

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

  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();
      lastActivityAtRef.current = now;
      if (isScreensaverActive && now - screensaverActivatedAtRef.current >= 800) {
        setIsScreensaverActive(false);
      }
    };

    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('pointerdown', handleActivity, { passive: true });

    // Comprobación ligera cada 15 s (cero clearTimeout/setTimeout en cada pulsación)
    const idleCheckId = window.setInterval(() => {
      if (
        !isScreensaverActive &&
        overlay === 'none' &&
        !showCreatorAdmin &&
        Date.now() - lastActivityAtRef.current >= 180_000
      ) {
        screensaverActivatedAtRef.current = Date.now();
        setIsScreensaverActive(true);
      }
    }, 15_000);

    return () => {
      window.clearInterval(idleCheckId);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
    };
  }, [isScreensaverActive, overlay, showCreatorAdmin]);

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

  const loadLiveCatalog = useCallback((mode: boolean | 'immediate' = false) => {
    const isImmediate = mode === 'immediate';
    const force = Boolean(mode);
    const now = Date.now();

    if (!isImmediate && !force && catalogInitializedRef.current && now - lastCatalogFetchRef.current < 5000) {
      return catalogInFlightRef.current ?? Promise.resolve();
    }

    if (catalogInFlightRef.current && !isImmediate) {
      return catalogInFlightRef.current;
    }

    setIsLoadingCatalog(true);
    const task = (async () => {
      try {
        const currentDateKey = getDailyDateKey();
        lastCatalogDateRef.current = currentDateKey;
        const catalog = await fetchGoogleTvLiveCatalog({
          force,
          dateKey: currentDateKey,
          installedApps: appsRef.current,
          favoritePackages: favoritePackagesRef.current,
        });
        lastCatalogFetchRef.current = Date.now();
        catalogInitializedRef.current = true;
        setLiveCatalog(catalog);
      } finally {
        catalogInFlightRef.current = null;
        setIsLoadingCatalog(false);
      }
    })();

    catalogInFlightRef.current = task;
    return task;
  }, []);

  const loadLauncherData = useCallback(async (silent = false) => {
    if (!silent && apps.length === 0) {
      setIsLoadingApps(true);
    }
    try {
      const [appsResult, versionInfo] = await Promise.all([
        getInstalledApps(),
        getCurrentAppVersion(),
      ]);
      appsRef.current = appsResult.apps;
      setApps(appsResult.apps);
      setIsNative(appsResult.isNative);
      setAppVersion(versionInfo);
      setIsVersionLoaded(true);
      try {
        localStorage.setItem('vora_installed_apps_cache', JSON.stringify(appsResult.apps));
      } catch {
        // Ignorar
      }
      setLiveCatalog((prev) =>
        deduplicateCatalog(prev, appsResult.apps, favoritePackagesRef.current)
      );
    } finally {
      if (!silent) {
        setIsLoadingApps(false);
      }
    }
  }, [apps.length]);

  const loadRemoteStatus = useCallback(
    async (repoSlug: string) => {
      try {
        lastRemoteStatusFetchRef.current = Date.now();
        const status = await fetchLauncherRemoteStatus(repoSlug);
        const forcedNow = Boolean(status.maintenanceMode);
        setRemoteStatus({
          ...status,
          maintenanceMode: forcedNow,
          appsOnlyMode: Boolean(status.appsOnlyMode && forcedNow),
        });

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

  const activeMaintenanceStatus = useMemo<LauncherRemoteStatus>(
    () => ({
      maintenanceMode: isMaintenanceForced,
      appsOnlyMode: effectiveAppsOnly,
      title: remoteStatus.title || settings.maintenanceTitle,
      message: remoteStatus.message || settings.maintenanceMessage,
    }),
    [
      isMaintenanceForced,
      effectiveAppsOnly,
      remoteStatus.title,
      remoteStatus.message,
      settings.maintenanceTitle,
      settings.maintenanceMessage,
    ]
  );

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

  const updateSettings = useCallback(
    (
      patch:
        | Partial<LauncherSettings>
        | ((prev: LauncherSettings) => Partial<LauncherSettings>)
    ) => {
      setSettings((prev) => {
        const resolvedPatch = typeof patch === 'function' ? patch(prev) : patch;
        const next = { ...prev, ...resolvedPatch };
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignorar si almacenamiento está lleno
        }
        return next;
      });
    },
    []
  );

  useEffect(() => {
    void loadLauncherData(false);
    void testFirestoreConnection();
    const unsubscribe = subscribeToLauncherStatus(
      (status) => {
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
      },
      undefined,
      { ignoreInitialMaintenance: true }
    );
    return () => {
      unsubscribe();
    };
  }, [loadLauncherData, loadLiveCatalog]);

  useEffect(() => {
    if (!effectiveAppsOnly && !catalogInitializedRef.current) {
      void loadLiveCatalog(false);
    }
  }, [effectiveAppsOnly, loadLiveCatalog]);

  // Refrescar apps en segundo plano y rotar recomendaciones si cambia el día calendario
  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastRemoteStatusFetchRef.current > 15_000) {
        void loadRemoteStatus(settings.updateRepo);
      }

      // 1. Siempre verificar en segundo plano si hay aplicaciones nuevas instaladas en Android TV
      void loadLauncherData(true);

      // 2. Si el día cambió (ej: medianoche o nuevo día), rotar automáticamente el catálogo
      const today = getDailyDateKey();
      if (today !== lastCatalogDateRef.current) {
        lastCatalogDateRef.current = today;
        if (!effectiveAppsOnly) {
          void loadLiveCatalog(true);
        }
      } else if (!catalogInitializedRef.current && !effectiveAppsOnly) {
        void loadLiveCatalog(false);
      }
    };

    const periodicStatusId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadRemoteStatus(settings.updateRepo);
      }
    }, 5 * 60_000);

    // Comprobación periódica cada minuto para rotar automáticamente al cambiar de día a medianoche
    const periodicDateCheckId = window.setInterval(() => {
      const today = getDailyDateKey();
      if (today !== lastCatalogDateRef.current) {
        lastCatalogDateRef.current = today;
        if (!effectiveAppsOnly) {
          void loadLiveCatalog(true);
        }
      }
    }, 60_000);

    document.addEventListener('visibilitychange', refreshOnReturn);
    window.addEventListener('focus', refreshOnReturn);
    window.addEventListener('pageshow', refreshOnReturn);
    window.addEventListener('voraTvResume', refreshOnReturn);
    return () => {
      window.clearInterval(periodicStatusId);
      window.clearInterval(periodicDateCheckId);
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
      void loadLauncherData(true);
      if (!effectiveAppsOnly) {
        void loadLiveCatalog(false);
      }
      window.requestAnimationFrame(() => {
        focusElementById(focusTargetId);
      });
    },
    [overlay, remoteManifest, effectiveAppsOnly, loadLauncherData, loadLiveCatalog]
  );

  const handleBootIntroComplete = useCallback(() => {
    setIsBootIntroActive(false);
    window.requestAnimationFrame(() => {
      focusElementById(`row-app-${FEATURED_GAME.packageName}`);
    });
  }, []);

  const handlePlayBootIntro = useCallback(() => {
    setOverlay('none');
    setIsBootIntroActive(true);
  }, []);

  useSpatialNavigation({
    enabled: overlay === 'none' && !isBootIntroActive && !isScreensaverActive,
    onBack: () => {
      setTopBarVisible(true);
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
      if (!effectiveAppsOnly) {
        void loadLiveCatalog(false);
      }
    },
    [effectiveAppsOnly, loadLiveCatalog]
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
      let removed = false;
      updateSettings((prev) => {
        const exists = prev.favoritePackages.includes(app.packageName);
        removed = exists;
        return {
          favoritePackages: exists
            ? prev.favoritePackages.filter((pkg) => pkg !== app.packageName)
            : [app.packageName, ...prev.favoritePackages],
        };
      });
      showToast(
        removed
          ? `${app.name} quitada de Tus aplicaciones`
          : `${app.name} fijada en Tus aplicaciones`
      );
    },
    [updateSettings, showToast]
  );

  const handleOpenAndroidSettings = useCallback(
    async (section: TvSettingsSection) => {
      const opened = await openTvSettings(section);
      if (!opened) {
        const labels: Record<TvSettingsSection, string> = {
          wifi: 'Wi-Fi',
          bluetooth: 'Bluetooth',
          display: 'Imagen y pantalla',
          sound: 'Sonido',
          inputs: 'Entradas HDMI / TV',
          accessibility: 'Accesibilidad',
          account: 'Cuenta y perfil',
          screensaver: 'Salvapantallas del sistema',
          home: 'Launcher principal',
          unknown_sources: 'Orígenes desconocidos',
          settings: 'Ajustes de Android TV',
        };
        showToast(`${labels[section]} · Disponible en Android TV`);
      }
    },
    [showToast]
  );

  const handleCycleSleepTimer = useCallback(() => {
    const steps: Array<number | null> = [null, 15, 30, 60, 90];
    setSleepTimerMinutes((prev) => {
      const idx = steps.indexOf(prev);
      const next = steps[(idx + 1) % steps.length];
      showToast(
        next === null
          ? 'Temporizador desactivado'
          : `Temporizador: ${next} min para reposo`
      );
      return next;
    });
  }, [showToast]);

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
  const backgroundStyle = useMemo(() => {
    return isLight
      ? currentBackground.lightValue.startsWith('#')
        ? { backgroundColor: currentBackground.lightValue }
        : { backgroundImage: currentBackground.lightValue }
      : currentBackground.type === 'solid'
        ? { backgroundColor: currentBackground.value }
        : { backgroundImage: currentBackground.value };
  }, [isLight, currentBackground]);

  const handleLaunchFeatured = useCallback(() => {
    void handleLaunchPackage(FEATURED_GAME.packageName, FEATURED_GAME.name);
  }, [handleLaunchPackage]);

  const handleLaunchSuggestionCb = useCallback(
    (sug: AppSuggestion) => {
      void handleLaunchSuggestion(sug);
    },
    [handleLaunchSuggestion]
  );

  const handleOpenAllApps = useCallback(() => {
    setOverlay('apps');
  }, []);

  const handleOpenMaintenanceInfo = useCallback(() => {
    setOverlay('maintenance');
  }, []);

  const handleRefreshCatalogMemo = useCallback(() => {
    void loadLiveCatalog(false);
  }, [loadLiveCatalog]);

  const handleRefreshCatalogImmediate = useCallback(() => {
    void loadLiveCatalog('immediate');
  }, [loadLiveCatalog]);

  const handleToggleTheme = useCallback(() => {
    updateSettings((prev) => ({
      themeMode: prev.themeMode === 'dark' ? 'light' : 'dark',
    }));
  }, [updateSettings]);

  const handleOpenSearch = useCallback(() => setOverlay('search'), []);
  const handleOpenSettings = useCallback(() => setOverlay('settings'), []);

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
          overlay === 'settings'
            ? 'opacity-70 pointer-events-none'
            : overlay !== 'none'
              ? 'opacity-35 pointer-events-none'
              : 'opacity-100'
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
          onToggleTheme={handleToggleTheme}
          onOpenScreensaver={activateScreensaver}
          onOpenSearch={handleOpenSearch}
          onOpenUpdate={handleOpenUpdateModal}
          onOpenSettings={handleOpenSettings}
        />

        {activeTab === 'inicio' || effectiveAppsOnly ? (
          <GoogleTvHome
            allApps={apps}
            favoriteApps={favoriteApps}
            favoritePackages={settings.favoritePackages}
            liveCatalog={liveCatalog}
            isNative={isNative}
            showSuggestions={settings.showSuggestions}
            appsOnlyMode={effectiveAppsOnly}
            maintenanceNotice={isMaintenanceForced ? activeMaintenanceStatus : null}
            heroFadeColor={isLight ? currentBackground.fadeLight : currentBackground.fadeDark}
            onScrollTopChange={setTopBarVisible}
            onLaunchFeatured={handleLaunchFeatured}
            onLaunchApp={handleLaunchApp}
            onLaunchSuggestion={handleLaunchSuggestionCb}
            onToggleFavorite={handleToggleFavorite}
            onOpenAllApps={handleOpenAllApps}
            onOpenMaintenanceInfo={handleOpenMaintenanceInfo}
            onRefreshCatalog={handleRefreshCatalogMemo}
          />
        ) : (
          <LivePlatformsView
            allApps={apps}
            favoritePackages={settings.favoritePackages}
            series={liveCatalog.series}
            catalogFeedUrl={settings.catalogFeedUrl}
            isLoading={isLoadingCatalog}
            onScrollTopChange={setTopBarVisible}
            onRefreshFeed={handleRefreshCatalogImmediate}
            onOpenFeedSettings={handleOpenSettings}
            onLaunchSuggestion={handleLaunchSuggestionCb}
          />
        )}
      </div>

      {/* Animación limpia al abrir una aplicación */}
      <AnimatePresence>
        {launchingApp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
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
        hasAvailableUpdate={hasAvailableUpdate}
        remoteVersionName={remoteManifest?.versionName}
        sleepTimerMinutes={sleepTimerMinutes}
        musicServiceStatus={musicServiceStatus}
        catalogSource={liveCatalog.source}
        onUpdateSettings={updateSettings}
        onRefreshCatalog={handleRefreshCatalogImmediate}
        onOpenAndroidSettings={(section) => void handleOpenAndroidSettings(section)}
        onCycleSleepTimer={handleCycleSleepTimer}
        onOpenScreensaver={() => {
          setOverlay('none');
          activateScreensaver();
        }}
        onPlayBootIntro={handlePlayBootIntro}
        onOpenAccessibilitySettings={() => {
          void openSpotifyAccessibilitySettings().then((opened) => {
            if (!opened) {
              showToast('Accesibilidad · Disponible en Android TV');
            }
          });
        }}
        onOpenNotificationSettings={() => {
          void openSpotifyNotificationSettings().then((opened) => {
            if (!opened) {
              showToast('Notificaciones · Disponible en Android TV');
            }
          });
        }}
        onOpenUpdateModal={handleOpenUpdateModal}
        onOpenMaintenanceModal={() => setOverlay('maintenance')}
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
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
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 dark:bg-zinc-900/95 border border-amber-500/35 text-amber-400 hover:text-zinc-950 hover:bg-amber-400 text-xs font-bold shadow-md transition-colors active:scale-95 cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Panel Creador (PC)</span>
        </button>
      )}

      {/* Intro profesional de encendido de TV (4 segundos con logo VORA y logo oficial Google TV) */}
      <TvBootIntro
        isOpen={isBootIntroActive}
        onComplete={handleBootIntroComplete}
      />
    </div>
  );
}
