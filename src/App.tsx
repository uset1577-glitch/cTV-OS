import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Shield } from 'lucide-react';
import { CreatorAdminPanel } from './components/CreatorAdminPanel';
import { DefaultLauncherGuideModal } from './components/DefaultLauncherGuideModal';
import { GoogleTvHome } from './components/GoogleTvHome';
import { LanguageSetupScreen } from './components/LanguageSetupScreen';
import { LivePlatformsView } from './components/LivePlatformsView';
import { MaintenanceNoticeModal } from './components/MaintenanceNoticeModal';
import { NavaAppsDrawer } from './components/NavaAppsDrawer';
import { NavaSearchOverlay } from './components/NavaSearchOverlay';
import { NavaSettingsDrawer } from './components/NavaSettingsDrawer';
import { NavaTopBar, type TopBarFocusRequest } from './components/NavaTopBar';
import { AppUpdateModal } from './components/AppUpdateModal';
import { TvBootIntro } from './components/TvBootIntro';
import { VoraScreensaver } from './components/VoraScreensaver';
import {
  BACKGROUND_PRESETS,
  DEFAULT_SETTINGS,
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
  smoothScrollVerticalTo,
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
  openDefaultLauncherSettings,
  openSpotifyAccessibilitySettings,
  openSpotifyNotificationSettings,
  openTvSettings,
  setNativeKeepScreenOn,
  startAppUpdateInstall,
  type TvSettingsSection,
} from './native/launcherBridge';
import {
  subscribeToLauncherStatus,
  testFirestoreConnection,
} from './services/firebase';
import {
  detectDeviceLanguage,
  getLanguageLabel,
  getTranslations,
  isValidAppLanguage,
} from './i18n/translations';
import type {
  AppDownloadProgress,
  AppLanguage,
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

const SETTINGS_STORAGE_KEY = 'vora_launcher_settings_v2';
const LANGUAGE_STORAGE_KEY = 'vora_launcher_language_v1';
const DISMISSED_UPDATE_SESSION_KEY = 'vora_dismissed_update_version';
const APP_LAUNCH_SAFETY_TIMEOUT_NATIVE_MS = 12_000;
const APP_LAUNCH_SAFETY_TIMEOUT_WEB_MS = 5_500;
const APP_LAUNCH_LOADING_HINT_MS = 3_500;

const REMOVED_LEGACY_PACKAGES = new Set(['com.mandoparty.tv', 'com.vora.arcade']);

function getSavedLanguagePreference(): AppLanguage | null {
  try {
    const dedicated = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isValidAppLanguage(dedicated)) {
      return dedicated;
    }
    const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings) as Partial<LauncherSettings>;
      if (isValidAppLanguage(parsed.language)) {
        return parsed.language;
      }
    }
  } catch {
    // Ignorar errores de lectura
  }
  return null;
}

function loadSavedSettings(): LauncherSettings {
  const savedLanguage = getSavedLanguagePreference();
  const initialLanguage = savedLanguage || detectDeviceLanguage();
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_SETTINGS,
        language: initialLanguage,
      };
    }
    const parsed = JSON.parse(raw) as Partial<LauncherSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      oledMode: Boolean(parsed.oledMode),
      language: isValidAppLanguage(parsed.language) ? parsed.language : initialLanguage,
      maintenanceMode: false,
      appsOnlyMode: false,
      updateRepo: parsed.updateRepo?.trim() ? parsed.updateRepo : DEFAULT_SETTINGS.updateRepo,
      favoritePackages: Array.isArray(parsed.favoritePackages)
        ? parsed.favoritePackages.filter((pkg) => !REMOVED_LEGACY_PACKAGES.has(pkg))
        : DEFAULT_SETTINGS.favoritePackages,
    };
  } catch {
    return {
      ...DEFAULT_SETTINGS,
      language: initialLanguage,
    };
  }
}

function focusFirstHomeAppOrSettings() {
  const firstApp = document.querySelector<HTMLElement>(
    '#gtv-home-shell [data-tv-row="apps"] [data-tv-focusable="true"]'
  );
  if (firstApp) {
    firstApp.focus({ preventScroll: false });
    return;
  }
  focusElementById('top-settings');
}

export default function App() {
  const [settings, setSettings] = useState<LauncherSettings>(loadSavedSettings);
  const [needsLanguageSetup, setNeedsLanguageSetup] = useState<boolean>(
    () => !getSavedLanguagePreference()
  );
  const [activeTab, setActiveTab] = useState<HomeTab>('inicio');
  const [overlay, setOverlay] = useState<LauncherOverlay>('none');
  const [isBootIntroActive, setIsBootIntroActive] = useState(true);
  const [apps, setApps] = useState<InstalledApp[]>(() => {
    try {
      const cached = localStorage.getItem('vora_installed_apps_cache');
      if (cached) {
        const parsed = JSON.parse(cached) as InstalledApp[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((app) => !REMOVED_LEGACY_PACKAGES.has(app.packageName));
        }
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
  const [launchingExtended, setLaunchingExtended] = useState(false);
  const [appVersion, setAppVersion] = useState<AppVersionInfo>({
    versionName: '1.0.0',
    versionCode: 100,
    packageName: 'com.vora.tv',
  });
  const [isVersionLoaded, setIsVersionLoaded] = useState(false);
  const setTopBarVisible = useCallback((visible: boolean) => {
    window.dispatchEvent(new CustomEvent('voraTopBarVisibility', { detail: visible }));
  }, []);
  const [topBarFocusRequest, setTopBarFocusRequest] = useState<TopBarFocusRequest | null>(null);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const lastCatalogFetchRef = useRef<number>(0);
  const lastCatalogDateRef = useRef<string>(getDailyDateKey());
  const lastRemoteStatusFetchRef = useRef<number>(0);
  const hasAutoPromptedUpdateRef = useRef(false);
  const appsRef = useRef<InstalledApp[]>(apps);
  const favoritePackagesRef = useRef<string[]>(settings.favoritePackages);
  const catalogInFlightRef = useRef<Promise<void> | null>(null);
  const catalogInitializedRef = useRef(false);
  const launchingTimerRef = useRef<number | null>(null);
  const launchingStageTimerRef = useRef<number | null>(null);
  const suppressLaunchUntilRef = useRef<number>(0);
  const isLaunchLockedRef = useRef<boolean>(false);
  const [defaultLauncherGuideInfo, setDefaultLauncherGuideInfo] = useState<{
    currentHomePackage?: string;
    currentHomeLabel?: string;
  }>({});
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

  const clearLaunchingIntro = useCallback(() => {
    if (launchingTimerRef.current) {
      window.clearTimeout(launchingTimerRef.current);
      launchingTimerRef.current = null;
    }
    if (launchingStageTimerRef.current) {
      window.clearTimeout(launchingStageTimerRef.current);
      launchingStageTimerRef.current = null;
    }
    isLaunchLockedRef.current = false;
    setLaunchingExtended(false);
    setLaunchingApp(null);
  }, []);

  useEffect(() => {
    const handleVisibilityHidden = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        clearLaunchingIntro();
      }
    };
    const handleResumeOrHide = () => {
      clearLaunchingIntro();
    };
    document.addEventListener('visibilitychange', handleVisibilityHidden);
    window.addEventListener('pagehide', handleResumeOrHide);
    window.addEventListener('voraTvResume', handleResumeOrHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityHidden);
      window.removeEventListener('pagehide', handleResumeOrHide);
      window.removeEventListener('voraTvResume', handleResumeOrHide);
    };
  }, [clearLaunchingIntro]);

  useEffect(() => {
    if (!launchingApp) return;
    const handleCancelLaunchKey = (e: KeyboardEvent) => {
      const code = e.keyCode;
      if (
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.key === 'BrowserBack' ||
        e.key === 'GoBack' ||
        code === 4
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        clearLaunchingIntro();
      }
    };
    window.addEventListener('keydown', handleCancelLaunchKey, true);
    return () => {
      window.removeEventListener('keydown', handleCancelLaunchKey, true);
    };
  }, [launchingApp, clearLaunchingIntro]);

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
        !isBootIntroActive &&
        !needsLanguageSetup &&
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
  }, [isScreensaverActive, isBootIntroActive, needsLanguageSetup, overlay, showCreatorAdmin]);

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

  const tApp = useMemo(() => getTranslations(settings.language).app, [settings.language]);

  // Sincronizar clase .dark, modo OLED y atributo lang en <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.oledMode || settings.themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (settings.oledMode) {
      root.dataset.oled = 'true';
    } else {
      delete root.dataset.oled;
    }
    root.lang = settings.language;
  }, [settings.themeMode, settings.oledMode, settings.language]);

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
          if (resolvedPatch.language && isValidAppLanguage(resolvedPatch.language)) {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, resolvedPatch.language);
          }
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
    if (!isVersionLoaded || isBootIntroActive || needsLanguageSetup) return;
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
  }, [
    isVersionLoaded,
    isBootIntroActive,
    needsLanguageSetup,
    settings.updateRepo,
    appVersion.versionCode,
    appVersion.versionName,
  ]);

  const closeOverlayToHome = useCallback(
    (focusTargetId?: string) => {
      suppressLaunchUntilRef.current = performance.now() + 440;
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
        if (focusTargetId) {
          focusElementById(focusTargetId);
        } else {
          focusFirstHomeAppOrSettings();
        }
      });
    },
    [overlay, remoteManifest, effectiveAppsOnly, loadLauncherData, loadLiveCatalog]
  );

  const handleBootIntroComplete = useCallback(() => {
    suppressLaunchUntilRef.current = performance.now() + 440;
    setIsBootIntroActive(false);
    if (!needsLanguageSetup) {
      window.requestAnimationFrame(() => {
        focusFirstHomeAppOrSettings();
      });
    }
  }, [needsLanguageSetup]);

  const handleCompleteLanguageSetup = useCallback(
    (selectedLanguage: AppLanguage) => {
      suppressLaunchUntilRef.current = performance.now() + 480;
      updateSettings({ language: selectedLanguage });
      setNeedsLanguageSetup(false);
      window.requestAnimationFrame(() => {
        focusFirstHomeAppOrSettings();
      });
    },
    [updateSettings]
  );

  const handleSelectLanguageFromSettings = useCallback(
    (selectedLanguage: AppLanguage) => {
      updateSettings({ language: selectedLanguage });
      const nextToast = getTranslations(selectedLanguage).app.toast.languageChanged(
        getLanguageLabel(selectedLanguage)
      );
      showToast(nextToast);
    },
    [updateSettings, showToast]
  );

  const handleToggleOledMode = useCallback(() => {
    const nextOled = !settings.oledMode;
    updateSettings({ oledMode: nextOled });
    showToast(nextOled ? tApp.toast.oledEnabled : tApp.toast.oledDisabled);
  }, [settings.oledMode, updateSettings, showToast, tApp]);

  const handleOpenDefaultLauncher = useCallback(async () => {
    const res = await openDefaultLauncherSettings();
    if (res.alreadyDefault) {
      showToast(tApp.toast.defaultLauncherAlready);
      return;
    }
    if (res.opened && !res.needsGuide) {
      return;
    }
    setDefaultLauncherGuideInfo({
      currentHomePackage: res.currentDefaultPackage,
      currentHomeLabel: res.currentDefaultLabel,
    });
    setOverlay('default_launcher_guide');
  }, [showToast, tApp]);

  const handleReachTopBoundary = useCallback(
    ({ currentElement, centerX }: { currentElement: HTMLElement | null; centerX: number }) => {
      if (currentElement?.closest('[data-tv-row="topbar"]')) {
        return;
      }
      const scrollContainer = document.querySelector<HTMLElement>(
        '#gtv-home-shell [data-tv-scroll-container="true"]'
      );
      if (scrollContainer && scrollContainer.scrollTop > 0) {
        smoothScrollVerticalTo(scrollContainer, 0);
      }
      setTopBarVisible(true);
      setTopBarFocusRequest((prev) => ({
        seq: (prev?.seq ?? 0) + 1,
        targetX: centerX,
      }));
    },
    []
  );

  useSpatialNavigation({
    enabled:
      overlay === 'none' &&
      !isBootIntroActive &&
      !needsLanguageSetup &&
      !isScreensaverActive &&
      !showCreatorAdmin &&
      !launchingApp,
    onBack: () => {
      setTopBarVisible(true);
      if (activeTab !== 'inicio') {
        setActiveTab('inicio');
        window.requestAnimationFrame(() => {
          focusFirstHomeAppOrSettings();
        });
      } else {
        focusFirstHomeAppOrSettings();
      }
    },
    onReachTopBoundary: handleReachTopBoundary,
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

  const startLaunchingIntro = useCallback(
    (name: string, icon?: string) => {
      clearLaunchingIntro();
      isLaunchLockedRef.current = true;
      setLaunchingApp({ name, icon });
      setLaunchingExtended(false);
      launchingStageTimerRef.current = window.setTimeout(() => {
        setLaunchingExtended(true);
      }, APP_LAUNCH_LOADING_HINT_MS);
      const safetyTimeoutMs = isNative
        ? APP_LAUNCH_SAFETY_TIMEOUT_NATIVE_MS
        : APP_LAUNCH_SAFETY_TIMEOUT_WEB_MS;
      launchingTimerRef.current = window.setTimeout(() => {
        clearLaunchingIntro();
      }, safetyTimeoutMs);
    },
    [clearLaunchingIntro, isNative]
  );

  const handleLaunchPackage = useCallback(
    async (packageName: string, displayName: string, icon?: string) => {
      if (performance.now() < suppressLaunchUntilRef.current || isLaunchLockedRef.current) {
        return;
      }
      startLaunchingIntro(displayName, icon);

      const result = await launchAndroidApp(packageName);
      if (!result.isNative) {
        showToast(tApp.toast.launchingWeb(displayName, packageName));
      } else if (!result.ok) {
        clearLaunchingIntro();
        showToast(result.error || tApp.toast.notInstalled(displayName, packageName));
      }
    },
    [startLaunchingIntro, clearLaunchingIntro, showToast, tApp]
  );

  const handleLaunchApp = useCallback(
    (app: InstalledApp) => {
      void handleLaunchPackage(app.packageName, app.name, app.icon);
    },
    [handleLaunchPackage]
  );

  const handleLaunchSuggestion = useCallback(
    async (suggestion: AppSuggestion) => {
      if (performance.now() < suppressLaunchUntilRef.current || isLaunchLockedRef.current) {
        return;
      }
      const matchedApp = apps.find((a) => a.packageName === suggestion.packageName);
      startLaunchingIntro(`${suggestion.tag} · ${suggestion.title}`, matchedApp?.icon);

      const res = await launchSuggestionUri(suggestion.deepLinkUrl, suggestion.packageName);
      if (!res.isNative) {
        showToast(tApp.toast.openingSuggestionWeb(suggestion.title, suggestion.appName));
      } else if (res.openedStore) {
        showToast(tApp.toast.openingPlayStore(suggestion.appName));
      } else if (!res.ok) {
        clearLaunchingIntro();
        showToast(res.error || tApp.toast.openFailed(suggestion.appName));
      }
    },
    [apps, startLaunchingIntro, clearLaunchingIntro, showToast, tApp]
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
      showToast(removed ? tApp.toast.favRemoved(app.name) : tApp.toast.favAdded(app.name));
    },
    [updateSettings, showToast, tApp]
  );

  const handleOpenAndroidSettings = useCallback(
    async (section: TvSettingsSection, packageName?: string) => {
      const opened = await openTvSettings(section, packageName);
      if (!opened) {
        const label = tApp.tvSections[section] || section;
        showToast(tApp.toast.tvSectionNativeOnly(label));
      }
    },
    [showToast, tApp]
  );

  const handleCycleSleepTimer = useCallback(() => {
    const steps: Array<number | null> = [null, 15, 30, 60, 90];
    setSleepTimerMinutes((prev) => {
      const idx = steps.indexOf(prev);
      const next = steps[(idx + 1) % steps.length];
      showToast(
        next === null ? tApp.toast.sleepTimerOff : tApp.toast.sleepTimerSet(next)
      );
      return next;
    });
  }, [showToast, tApp]);

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
          setUpdateMessage(prog.message || tApp.toast.downloadFailed);
          setUpdateStatus('error');
        }
      }
    );
    cleanupUpdateRef.current = cleanup;
  }, [remoteManifest, tApp]);

  useEffect(() => {
    return () => {
      if (cleanupUpdateRef.current) cleanupUpdateRef.current();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (launchingTimerRef.current) window.clearTimeout(launchingTimerRef.current);
      if (launchingStageTimerRef.current) window.clearTimeout(launchingStageTimerRef.current);
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

  const isOled = Boolean(settings.oledMode);
  const isLight = !isOled && settings.themeMode === 'light';
  const backgroundStyle = useMemo(() => {
    if (isOled) {
      return { backgroundColor: '#000000' };
    }
    return isLight
      ? currentBackground.lightValue.startsWith('#')
        ? { backgroundColor: currentBackground.lightValue }
        : { backgroundImage: currentBackground.lightValue }
      : currentBackground.type === 'solid'
        ? { backgroundColor: currentBackground.value }
        : { backgroundImage: currentBackground.value };
  }, [isOled, isLight, currentBackground]);

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
    updateSettings((prev) => {
      if (prev.oledMode) {
        return { oledMode: false, themeMode: 'light' };
      }
      return { themeMode: prev.themeMode === 'dark' ? 'light' : 'dark' };
    });
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
          language={settings.language}
          themeMode={settings.themeMode}
          use24HourClock={settings.use24HourClock}
          hasAvailableUpdate={hasAvailableUpdate}
          isVisible
          isOverHero={activeTab === 'inicio' && !effectiveAppsOnly}
          appsOnlyMode={effectiveAppsOnly}
          focusRequest={topBarFocusRequest}
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
            language={settings.language}
            isNative={isNative}
            showSuggestions={settings.showSuggestions}
            appsOnlyMode={effectiveAppsOnly}
            oledMode={isOled}
            maintenanceNotice={isMaintenanceForced ? activeMaintenanceStatus : null}
            heroFadeColor={
              isOled
                ? '#000000'
                : isLight
                  ? currentBackground.fadeLight
                  : currentBackground.fadeDark
            }
            onScrollTopChange={setTopBarVisible}
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
            language={settings.language}
            catalogFeedUrl={settings.catalogFeedUrl}
            isLoading={isLoadingCatalog}
            onScrollTopChange={setTopBarVisible}
            onRefreshFeed={handleRefreshCatalogImmediate}
            onOpenFeedSettings={handleOpenSettings}
            onLaunchSuggestion={handleLaunchSuggestionCb}
          />
        )}
      </div>

      {/* Animación cinematográfica ligera en GPU (solo transform y opacity) al abrir una aplicación */}
      <AnimatePresence>
        {launchingApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: isOled
                ? '#000000'
                : 'radial-gradient(circle at 50% 42%, rgba(28, 39, 62, 0.94) 0%, rgba(7, 10, 16, 0.98) 72%)',
            }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 pointer-events-none will-change-[opacity]"
          >
            {/* Resplandor ambiental estático mediante gradiente radial (cero blur costoso) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background:
                  'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(99, 102, 241, 0.08) 44%, transparent 70%)',
              }}
              className="absolute w-[420px] h-[420px] rounded-full pointer-events-none will-change-[transform,opacity]"
            />

            <motion.div
              initial={{ scale: 0.88, y: 14, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center gap-5 z-10 px-8 max-w-lg text-center will-change-[transform,opacity]"
            >
              {launchingApp.icon ? (
                <div className="relative">
                  <div
                    aria-hidden="true"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(245, 158, 11, 0.32) 0%, rgba(99, 102, 241, 0.18) 55%, transparent 74%)',
                    }}
                    className="absolute -inset-5 rounded-[36px] pointer-events-none"
                  />
                  <img
                    src={launchingApp.icon}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="relative w-28 h-28 rounded-2xl object-cover shadow-2xl border border-white/20"
                  />
                </div>
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-zinc-800 border border-white/20 flex items-center justify-center shadow-2xl">
                  <span className="text-3xl font-bold text-white">
                    {launchingApp.name.charAt(0)}
                  </span>
                </div>
              )}

              <div className="text-center space-y-1.5">
                <h2 className="font-display text-2xl lg:text-3xl font-bold text-white tracking-wide [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
                  {launchingApp.name}
                </h2>
                <p className="text-xs font-medium text-amber-400 tracking-wider uppercase">
                  {launchingExtended ? tApp.launchingExtended : tApp.launchingNormal}
                </p>
              </div>

              {/* Barra ligera GPU (transform y opacity) + puntos de espera */}
              <div className="w-44 h-1 rounded-full bg-white/12 overflow-hidden">
                <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 vora-indeterminate-bar" />
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 vora-dot-wave [animation-delay:-0.32s]" />
                <span className="w-2 h-2 rounded-full bg-amber-400 vora-dot-wave [animation-delay:-0.16s]" />
                <span className="w-2 h-2 rounded-full bg-amber-400 vora-dot-wave" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <NavaAppsDrawer
        isOpen={overlay === 'apps'}
        language={settings.language}
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
        language={settings.language}
        apps={apps}
        liveCatalog={liveCatalog}
        favoritePackages={settings.favoritePackages}
        appsOnlyMode={effectiveAppsOnly}
        onLaunchApp={handleLaunchApp}
        onLaunchSuggestion={handleLaunchSuggestionCb}
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
        onUpdateSettings={updateSettings}
        onToggleOledMode={handleToggleOledMode}
        onSelectLanguage={handleSelectLanguageFromSettings}
        onOpenAndroidSettings={(section) => void handleOpenAndroidSettings(section)}
        onOpenDefaultLauncher={() => void handleOpenDefaultLauncher()}
        onCycleSleepTimer={handleCycleSleepTimer}
        onOpenScreensaver={() => {
          setOverlay('none');
          activateScreensaver();
        }}
        onOpenAccessibilitySettings={() => {
          void openSpotifyAccessibilitySettings().then((opened) => {
            if (!opened) {
              showToast(tApp.toast.accessibilityNativeOnly);
            }
          });
        }}
        onOpenNotificationSettings={() => {
          void openSpotifyNotificationSettings().then((opened) => {
            if (!opened) {
              showToast(tApp.toast.notificationsNativeOnly);
            }
          });
        }}
        onOpenUpdateModal={handleOpenUpdateModal}
        onOpenMaintenanceModal={() => setOverlay('maintenance')}
        onClose={() => closeOverlayToHome('top-settings')}
      />

      <AppUpdateModal
        isOpen={overlay === 'update'}
        language={settings.language}
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
        language={settings.language}
        status={activeMaintenanceStatus}
        onAcknowledge={() => closeOverlayToHome()}
      />

      <DefaultLauncherGuideModal
        isOpen={overlay === 'default_launcher_guide'}
        language={settings.language}
        currentHomePackage={defaultLauncherGuideInfo.currentHomePackage}
        currentHomeLabel={defaultLauncherGuideInfo.currentHomeLabel}
        onOpenCurrentLauncherDetails={() =>
          void handleOpenAndroidSettings('app_details', defaultLauncherGuideInfo.currentHomePackage)
        }
        onOpenTvAppsSettings={() => void handleOpenAndroidSettings('apps')}
        onClose={() => closeOverlayToHome('top-settings')}
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
        language={settings.language}
        use24HourClock={settings.use24HourClock}
        spotify={spotifyNowPlaying}
        onDismiss={() => setIsScreensaverActive(false)}
      />

      {/* Botón flotante para el creador en PC (SOLO en navegador web de escritorio, NUNCA en Android TV) */}
      {!isNative && !needsLanguageSetup && (
        <button
          type="button"
          onClick={() => setShowCreatorAdmin(true)}
          title={tApp.creatorAdminTitle}
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 dark:bg-zinc-900/95 border border-amber-500/35 text-amber-400 hover:text-zinc-950 hover:bg-amber-400 text-xs font-bold shadow-md transition-colors active:scale-95 cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{tApp.creatorAdminBtn}</span>
        </button>
      )}

      {/* Selector de idioma solo en el primer inicio tras la intro */}
      <LanguageSetupScreen
        isOpen={!isBootIntroActive && needsLanguageSetup}
        initialLanguage={settings.language}
        onSelectLanguage={handleCompleteLanguageSetup}
      />

      {/* Intro cinematográfica estilo A24 independiente de la carga para no cortarse */}
      <TvBootIntro
        isOpen={isBootIntroActive}
        onComplete={handleBootIntroComplete}
      />
    </div>
  );
}
