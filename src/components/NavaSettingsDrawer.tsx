import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Accessibility,
  Bell,
  Bluetooth,
  Check,
  ChevronRight,
  CircleUserRound,
  Contrast,
  Download,
  Globe,
  HdmiPort,
  Home,
  Image as ImageIcon,
  Monitor,
  Moon,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sun,
  Timer,
  Volume2,
  Wifi,
} from 'lucide-react';
import { BACKGROUND_PRESETS, DEFAULT_FAVORITES } from '../data/presets';
import { focusElementById, useSpatialNavigation } from '../hooks/useSpatialNavigation';
import {
  getDateLocale,
  getLanguageLabel,
  getTranslations,
  SUPPORTED_LANGUAGES,
} from '../i18n/translations';
import type { TvSettingsSection } from '../native/launcherBridge';
import type { AppLanguage, AppVersionInfo, LauncherSettings, MusicServiceStatus } from '../types/launcher';
import { BrandLogo } from './BrandLogo';

interface NavaSettingsDrawerProps {
  isOpen: boolean;
  settings: LauncherSettings;
  appVersion: AppVersionInfo;
  isNative: boolean;
  isMaintenanceForced?: boolean;
  hasAvailableUpdate?: boolean;
  remoteVersionName?: string;
  sleepTimerMinutes?: number | null;
  musicServiceStatus: MusicServiceStatus;
  initialSubPanel?: ActiveSubPanel;
  onUpdateSettings: (patch: Partial<LauncherSettings>) => void;
  onToggleOledMode?: () => void;
  onOpenAndroidSettings: (section: TvSettingsSection) => void;
  onOpenDefaultLauncher?: () => void;
  onCycleSleepTimer?: () => void;
  onOpenScreensaver?: () => void;
  onOpenAccessibilitySettings: () => void;
  onOpenNotificationSettings: () => void;
  onOpenUpdateModal: () => void;
  onOpenMaintenanceModal?: () => void;
  onSelectLanguage?: (language: AppLanguage) => void;
  onClose: () => void;
}

export type SettingsSubPanel = 'none' | 'notifications' | 'profile' | 'language';
type ActiveSubPanel = SettingsSubPanel;

export function NavaSettingsDrawer({
  isOpen,
  settings,
  appVersion,
  isNative,
  isMaintenanceForced = false,
  hasAvailableUpdate = false,
  remoteVersionName,
  sleepTimerMinutes = null,
  musicServiceStatus,
  initialSubPanel = 'none',
  onUpdateSettings,
  onToggleOledMode,
  onOpenAndroidSettings,
  onOpenDefaultLauncher,
  onCycleSleepTimer,
  onOpenScreensaver,
  onOpenAccessibilitySettings,
  onOpenNotificationSettings,
  onOpenUpdateModal,
  onOpenMaintenanceModal,
  onSelectLanguage,
  onClose,
}: NavaSettingsDrawerProps) {
  const [now, setNow] = useState(() => new Date());
  const [subPanel, setSubPanel] = useState<ActiveSubPanel>('none');
  const t = getTranslations(settings.language).settings;
  const dateLocale = getDateLocale(settings.language);
  const currentLanguageName = getLanguageLabel(settings.language);

  useEffect(() => {
    if (!isOpen) return;
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSubPanel(initialSubPanel);
      window.requestAnimationFrame(() => {
        if (initialSubPanel === 'profile') {
          focusElementById('quick-profile-theme');
        } else if (initialSubPanel === 'notifications') {
          focusElementById('quick-notif-update');
        } else if (initialSubPanel === 'language') {
          focusElementById(`quick-lang-${settings.language}`);
        } else {
          focusElementById('quick-screensaver');
        }
      });
    } else {
      setSubPanel('none');
    }
  }, [isOpen, initialSubPanel, settings.language]);

  useSpatialNavigation({
    enabled: isOpen,
    onBack: () => {
      if (subPanel !== 'none') {
        setSubPanel('none');
        window.requestAnimationFrame(() => focusElementById('quick-screensaver'));
      } else {
        onClose();
      }
    },
    scopeSelector: '#vora-quick-panel',
  });

  const formattedTime = now.toLocaleTimeString(dateLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !settings.use24HourClock,
  });

  const formattedDate = now.toLocaleDateString(dateLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const hasAlerts = hasAvailableUpdate || isMaintenanceForced;

  const quickTiles = [
    {
      id: 'quick-screensaver',
      label: t.tiles.screensaver,
      icon: ImageIcon,
      isInitial: true,
      onClick: () => {
        onClose();
        if (onOpenScreensaver) {
          onOpenScreensaver();
        } else {
          onOpenAndroidSettings('screensaver');
        }
      },
    },
    {
      id: 'quick-inputs',
      label: t.tiles.inputs,
      icon: HdmiPort,
      onClick: () => {
        onClose();
        onOpenAndroidSettings('inputs');
      },
    },
    {
      id: 'quick-picture',
      label: t.tiles.picture,
      icon: SlidersHorizontal,
      onClick: () => {
        onClose();
        onOpenAndroidSettings('display');
      },
    },
    {
      id: 'quick-sound',
      label: t.tiles.sound,
      icon: Volume2,
      onClick: () => {
        onClose();
        onOpenAndroidSettings('sound');
      },
    },
    {
      id: 'quick-wifi',
      label: t.tiles.wifi,
      icon: Wifi,
      onClick: () => {
        onClose();
        onOpenAndroidSettings('wifi');
      },
    },
    {
      id: 'quick-bluetooth',
      label: t.tiles.bluetooth,
      icon: Bluetooth,
      onClick: () => {
        onClose();
        onOpenAndroidSettings('bluetooth');
      },
    },
    {
      id: 'quick-timer',
      label: t.tiles.timer,
      badge: sleepTimerMinutes !== null ? `${sleepTimerMinutes}m` : undefined,
      icon: Timer,
      onClick: () => {
        onCycleSleepTimer?.();
      },
    },
    {
      id: 'quick-accessibility',
      label: t.tiles.accessibility,
      icon: Accessibility,
      onClick: () => {
        onClose();
        onOpenAndroidSettings('accessibility');
      },
    },
  ];

  const handleFeaturedClick = () => {
    if (isMaintenanceForced && onOpenMaintenanceModal) {
      onClose();
      onOpenMaintenanceModal();
      return;
    }
    if (hasAvailableUpdate) {
      onClose();
      onOpenUpdateModal();
      return;
    }
    setSubPanel((prev) => {
      const next = prev === 'profile' ? 'none' : 'profile';
      if (next === 'profile') {
        window.requestAnimationFrame(() => {
          focusElementById('quick-profile-theme');
        });
      }
      return next;
    });
  };

  const featuredTitle = isMaintenanceForced
    ? t.featured.maintenanceTitle
    : hasAvailableUpdate
      ? t.featured.updateTitle(remoteVersionName || '')
      : sleepTimerMinutes !== null
        ? t.featured.timerTitle(sleepTimerMinutes)
        : t.featured.prefsTitle;

  const activeThemeLabel = settings.oledMode
    ? t.oledCardTitle
    : settings.themeMode === 'dark'
      ? t.themeDark
      : t.themeLight;

  const featuredSubtitle = isMaintenanceForced
    ? t.featured.maintenanceSubtitle
    : hasAvailableUpdate
      ? t.featured.updateSubtitle
      : sleepTimerMinutes !== null
        ? t.featured.timerSubtitle
        : t.featured.prefsSubtitle(
            activeThemeLabel,
            currentLanguageName,
            appVersion.versionName
          );

  const handleLanguageChoose = (lang: AppLanguage) => {
    if (onSelectLanguage) {
      onSelectLanguage(lang);
    } else {
      onUpdateSettings({ language: lang });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="vora-quick-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t.dialogAria}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          className="fixed inset-0 z-40 bg-black/35 flex justify-end p-3 sm:p-5"
        >
          <motion.aside
            id="vora-quick-panel"
            data-tv-scroll-container="true"
            onClick={(e) => e.stopPropagation()}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[420px] h-full min-h-0 rounded-3xl bg-[#0D0E11]/88 border border-white/14 text-white px-5 py-5 overflow-y-auto overscroll-contain tv-drawer-scrollbar flex flex-col gap-4 shadow-[0_24px_60px_rgba(0,0,0,0.75)]"
          >
            {/* 1. Cabecera estilo Google TV: Fecha y hora a la izquierda + Ajustes, Notificaciones y Perfil arriba a la derecha */}
            <div
              data-tv-row="quick-header"
              data-tv-scroll-top="true"
              className="flex items-start justify-between gap-3 shrink-0 pb-1"
            >
              <div className="min-w-0">
                <div className="font-display text-3xl font-semibold tracking-tight text-white tabular-nums leading-none">
                  {formattedTime}
                </div>
                <div className="text-xs font-medium text-zinc-400 mt-1.5 capitalize">
                  {formattedDate}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="quick-header-settings"
                  onClick={() => {
                    onClose();
                    onOpenAndroidSettings('settings');
                  }}
                  aria-label={t.systemSettingsAria}
                  title={t.systemSettingsTitle}
                  className="tv-focusable w-9 h-9 rounded-full bg-white/[0.08] border border-white/12 text-zinc-200 flex items-center justify-center hover:bg-white/[0.15] focus:bg-white focus:text-black focus:border-white focus:scale-105"
                >
                  <Settings className="w-4 h-4 stroke-[2]" />
                </button>

                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="quick-header-notifications"
                  onClick={() =>
                    setSubPanel((prev) =>
                      prev === 'notifications' ? 'none' : 'notifications'
                    )
                  }
                  aria-label={t.notificationsAria}
                  title={t.notificationsTitle}
                  className={`tv-focusable relative w-9 h-9 rounded-full border flex items-center justify-center focus:bg-white focus:text-black focus:border-white focus:scale-105 ${
                    subPanel === 'notifications'
                      ? 'bg-white text-black border-white'
                      : 'bg-white/[0.08] border-white/12 text-zinc-200 hover:bg-white/[0.15]'
                  }`}
                >
                  <Bell className="w-4 h-4 stroke-[2]" />
                  {hasAlerts && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white"
                    />
                  )}
                </button>

                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="quick-header-profile"
                  onClick={() =>
                    setSubPanel((prev) => (prev === 'profile' ? 'none' : 'profile'))
                  }
                  aria-label={t.accountAria}
                  title={t.accountTitle}
                  className={`tv-focusable w-9 h-9 rounded-full border flex items-center justify-center focus:bg-white focus:text-black focus:border-white focus:scale-105 ${
                    subPanel === 'profile'
                      ? 'bg-white text-black border-white'
                      : 'bg-white/[0.08] border-white/12 text-zinc-200 hover:bg-white/[0.15]'
                  }`}
                >
                  <CircleUserRound className="w-4.5 h-4.5 stroke-[2]" />
                </button>
              </div>
            </div>

            {/* 2. Cuadrícula de tarjetas redondeadas en 2 columnas: icono + etiqueta corta a la izquierda */}
            <div
              data-tv-row="quick-grid"
              data-tv-row-type="grid"
              className="grid grid-cols-2 gap-2.5 shrink-0"
            >
              {quickTiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    data-tv-focusable="true"
                    data-tv-initial={tile.isInitial ? 'true' : undefined}
                    data-tv-id={tile.id}
                    onClick={tile.onClick}
                    className="tv-focusable group flex items-center justify-between gap-2 px-3.5 py-3.5 rounded-2xl bg-white/[0.08] border border-white/10 text-zinc-100 hover:bg-white/[0.14] hover:border-white/20 focus:bg-white focus:text-black focus:border-white focus:scale-[1.03] text-left min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-5 h-5 shrink-0 stroke-[1.9] text-zinc-200 group-focus:text-black" />
                      <span className="text-[13.5px] font-medium tracking-tight truncate">
                        {tile.label}
                      </span>
                    </div>
                    {tile.badge && (
                      <span className="font-mono-tabular text-[11px] font-semibold text-zinc-300 group-focus:text-black shrink-0">
                        {tile.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 3. Tarjeta destacada más clara/translúcida para accesos o avisos */}
            <div data-tv-row="quick-featured" className="shrink-0 space-y-2">
              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="quick-featured-card"
                onClick={handleFeaturedClick}
                className="tv-focusable group w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-white/[0.14] border border-white/20 text-left text-white hover:bg-white/[0.18] focus:bg-white focus:text-black focus:border-white focus:scale-[1.02]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold tracking-tight truncate">
                    {featuredTitle}
                  </div>
                  <div className="text-xs text-zinc-300 group-focus:text-zinc-700 truncate mt-0.5">
                    {featuredSubtitle}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-zinc-300 group-focus:text-black" />
              </button>

              </div>

            {/* 3b. Modo OLED activable/desactivable para televisores no-OLED */}
            <div data-tv-row="quick-oled" className="shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={settings.oledMode}
                data-tv-focusable="true"
                data-tv-id="quick-oled-btn"
                onClick={() => {
                  if (onToggleOledMode) {
                    onToggleOledMode();
                  } else {
                    onUpdateSettings({ oledMode: !settings.oledMode });
                  }
                }}
                className={`tv-focusable group w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left focus:bg-white focus:text-black focus:border-white focus:scale-[1.02] ${
                  settings.oledMode
                    ? 'bg-white/14 border-white/35 text-white'
                    : 'bg-white/[0.08] border-white/12 text-zinc-100 hover:bg-white/[0.14] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Contrast className="w-4.5 h-4.5 shrink-0 text-zinc-200 group-focus:text-black" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-tight truncate">
                      {t.oledCardTitle}
                    </div>
                    <div className="text-[11px] text-zinc-400 group-focus:text-zinc-700 truncate">
                      {t.oledCardSubtitle}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 border ${
                    settings.oledMode
                      ? 'bg-white text-black border-white group-focus:bg-zinc-900 group-focus:text-white group-focus:border-zinc-900'
                      : 'bg-white/[0.08] text-zinc-300 border-white/15 group-focus:bg-zinc-200 group-focus:text-zinc-900 group-focus:border-zinc-300'
                  }`}
                >
                  {settings.oledMode ? t.oledOn : t.oledOff}
                </span>
              </button>
            </div>

            {/* 3c. Acceso directo para cambiar idioma en cualquier momento */}
            <div data-tv-row="quick-language" className="shrink-0">
              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="quick-language-btn"
                onClick={() =>
                  setSubPanel((prev) => {
                    const next = prev === 'language' ? 'none' : 'language';
                    if (next === 'language') {
                      window.requestAnimationFrame(() => {
                        focusElementById(`quick-lang-${settings.language}`);
                      });
                    }
                    return next;
                  })
                }
                className={`tv-focusable group w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left focus:bg-white focus:text-black focus:border-white focus:scale-[1.02] ${
                  subPanel === 'language'
                    ? 'bg-white/16 border-white/30 text-white'
                    : 'bg-white/[0.08] border-white/12 text-zinc-100 hover:bg-white/[0.14] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Globe className="w-4.5 h-4.5 shrink-0 text-zinc-200 group-focus:text-black" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-tight truncate">
                      {t.languageCardTitle}
                    </div>
                    <div className="text-[11px] text-zinc-400 group-focus:text-zinc-700 truncate">
                      {t.languageCardSubtitle(currentLanguageName)}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-zinc-400 group-focus:text-black" />
              </button>
            </div>

            {/* 3d. Acceso directo para fijar VORA TV OS como launcher predeterminado */}
            <div data-tv-row="quick-default-launcher" className="shrink-0">
              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="quick-default-launcher-btn"
                onClick={() => {
                  if (onOpenDefaultLauncher) {
                    onOpenDefaultLauncher();
                  } else {
                    onClose();
                    onOpenAndroidSettings('home');
                  }
                }}
                className="tv-focusable group w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/[0.08] border border-white/12 text-left text-zinc-100 hover:bg-white/[0.14] hover:border-white/20 focus:bg-white focus:text-black focus:border-white focus:scale-[1.02]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Home className="w-4.5 h-4.5 shrink-0 text-zinc-200 group-focus:text-black" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-tight truncate">
                      {t.defaultLauncherTitle}
                    </div>
                    <div className="text-[11px] text-zinc-400 group-focus:text-zinc-700 truncate">
                      {t.defaultLauncherSubtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-zinc-400 group-focus:text-black" />
              </button>
            </div>

            {/* Subpanel contextual limpio para cambiar idioma */}
            {subPanel === 'language' && (
              <div className="rounded-2xl bg-white/[0.06] border border-white/12 p-3.5 space-y-2.5 shrink-0">
                <div className="px-0.5">
                  <div className="text-xs font-semibold text-zinc-200">
                    {t.languagePanelTitle}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {t.languagePanelHint}
                  </div>
                </div>

                <div
                  data-tv-row="quick-language-grid"
                  data-tv-row-type="grid"
                  className="grid grid-cols-2 gap-2"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const selected = settings.language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        data-tv-focusable="true"
                        data-tv-id={`quick-lang-${lang.code}`}
                        onClick={() => handleLanguageChoose(lang.code)}
                        className={`tv-focusable group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left focus:bg-white focus:text-black focus:border-white ${
                          selected
                            ? 'bg-white/15 border-white/45 text-white'
                            : 'bg-white/[0.06] border-white/10 text-zinc-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {lang.nativeName}
                          </div>
                          <div className="text-[10px] font-mono-tabular text-zinc-400 group-focus:text-zinc-600">
                            {lang.shortCode}
                          </div>
                        </div>
                        {selected && (
                          <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.8]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subpanel contextual limpio en escala de grises (solo visible al abrir Notificaciones o Perfil) */}
            {subPanel === 'notifications' && (
              <div
                data-tv-row="quick-notif-panel"
                className="rounded-2xl bg-white/[0.06] border border-white/12 p-3.5 space-y-2 shrink-0"
              >
                <div className="text-xs font-semibold text-zinc-300 px-0.5">
                  {t.notificationsPanelTitle}
                </div>

                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="quick-notif-update"
                  onClick={() => {
                    onClose();
                    onOpenUpdateModal();
                  }}
                  className="tv-focusable group w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-xs font-medium text-zinc-100 focus:bg-white focus:text-black focus:border-white"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Download className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {hasAvailableUpdate
                        ? t.newVersionLabel(remoteVersionName || '')
                        : t.checkUpdates}
                    </span>
                  </div>
                  <span className="font-mono-tabular text-[11px] text-zinc-400 group-focus:text-zinc-700 shrink-0">
                    v{appVersion.versionName}
                  </span>
                </button>
              </div>
            )}

            {subPanel === 'profile' && (
              <div className="rounded-2xl bg-white/[0.06] border border-white/12 p-3.5 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-xs font-semibold text-zinc-300">
                    {t.profilePanelTitle}
                  </span>
                  <span className="font-mono-tabular text-[11px] text-zinc-400">
                    v{appVersion.versionName}
                  </span>
                </div>

                <div data-tv-row="quick-profile-toggles" className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id="quick-profile-theme"
                    onClick={() =>
                      onUpdateSettings({
                        themeMode: settings.themeMode === 'dark' ? 'light' : 'dark',
                      })
                    }
                    className="tv-focusable group flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-xs font-medium text-zinc-100 focus:bg-white focus:text-black focus:border-white"
                  >
                    <span className="flex items-center gap-2">
                      {settings.themeMode === 'dark' ? (
                        <Moon className="w-3.5 h-3.5" />
                      ) : (
                        <Sun className="w-3.5 h-3.5" />
                      )}
                      <span>{t.themeLabel}</span>
                    </span>
                    <span className="text-zinc-400 group-focus:text-zinc-700">
                      {settings.themeMode === 'dark' ? t.themeDark : t.themeLight}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id="quick-profile-clock"
                    onClick={() =>
                      onUpdateSettings({ use24HourClock: !settings.use24HourClock })
                    }
                    className="tv-focusable group flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-xs font-medium text-zinc-100 focus:bg-white focus:text-black focus:border-white"
                  >
                    <span>{t.clockLabel}</span>
                    <span className="font-mono-tabular text-zinc-400 group-focus:text-zinc-700">
                      {settings.use24HourClock ? '24h' : '12h'}
                    </span>
                  </button>
                </div>

                <div
                  data-tv-row="quick-profile-bgs"
                  data-tv-row-type="grid"
                  className="grid grid-cols-3 gap-1.5"
                >
                  {BACKGROUND_PRESETS.map((preset) => {
                    const selected = settings.backgroundId === preset.id;
                    const presetTitle = t.presetNames[preset.id] || preset.name;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        data-tv-focusable="true"
                        data-tv-id={`quick-bg-${preset.id}`}
                        onClick={() => onUpdateSettings({ backgroundId: preset.id })}
                        className={`tv-focusable rounded-xl p-1.5 text-left border ${
                          selected
                            ? 'border-white bg-white/15'
                            : 'border-white/10 bg-white/[0.04]'
                        } focus:scale-[1.03]`}
                      >
                        <div
                          className="h-7 w-full rounded-lg relative overflow-hidden mb-1 grayscale"
                          style={{
                            background:
                              settings.themeMode === 'light'
                                ? preset.lightValue
                                : preset.swatch,
                          }}
                        >
                          {selected && (
                            <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white text-black flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-medium text-zinc-200 truncate">
                          {presetTitle}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div data-tv-row="quick-profile-tv" className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id="quick-profile-account"
                    onClick={() => {
                      onClose();
                      onOpenAndroidSettings('account');
                    }}
                    className="tv-focusable flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.07] border border-white/10 text-xs font-medium text-zinc-100 focus:bg-white focus:text-black focus:border-white"
                  >
                    <span className="truncate">{t.accountsTv}</span>
                    <CircleUserRound className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  <button
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id="quick-profile-home"
                    aria-label={t.defaultLauncherTitle}
                    onClick={() => {
                      if (onOpenDefaultLauncher) {
                        onOpenDefaultLauncher();
                      } else {
                        onClose();
                        onOpenAndroidSettings('home');
                      }
                    }}
                    className="tv-focusable flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.07] border border-white/10 text-xs font-medium text-zinc-100 focus:bg-white focus:text-black focus:border-white"
                  >
                    <span className="truncate">{t.mainLauncher}</span>
                    <Home className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>

                <div data-tv-row="quick-profile-mode" className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id="quick-profile-appsonly"
                    onClick={() => {
                      if (!isMaintenanceForced) {
                        onUpdateSettings({ appsOnlyMode: !settings.appsOnlyMode });
                      }
                    }}
                    className="tv-focusable group flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.07] border border-white/10 text-xs font-medium text-zinc-100 focus:bg-white focus:text-black focus:border-white"
                  >
                    <span className="truncate">{t.appsOnly}</span>
                    <span className="text-[11px] text-zinc-400 group-focus:text-zinc-700 shrink-0">
                      {settings.appsOnlyMode ? t.yes : t.no}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id="quick-profile-reset"
                    onClick={() =>
                      onUpdateSettings({ favoritePackages: DEFAULT_FAVORITES })
                    }
                    className="tv-focusable flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.07] border border-white/10 text-xs font-medium text-zinc-100 focus:bg-white focus:text-black focus:border-white"
                  >
                    <span className="truncate">{t.favoritesReset}</span>
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>

                <div data-tv-row="quick-profile-ota">
                  <button
                    type="button"
                    data-tv-focusable="true"
                    data-tv-id="quick-profile-update"
                    onClick={() => {
                      onClose();
                      onOpenUpdateModal();
                    }}
                    className="tv-focusable w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.07] border border-white/10 text-xs font-medium text-zinc-100 focus:bg-white focus:text-black focus:border-white"
                  >
                    <span>{t.checkOtaUpdates}</span>
                    <Monitor className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* 4. Pie limpio con logotipo/texto "VORA TV OS" y acceso rápido a Ajustes */}
            <div
              data-tv-row="quick-footer"
              className="mt-auto pt-3 border-t border-white/12 flex items-center justify-between gap-3 shrink-0"
            >
              <BrandLogo size="sm" showWordmark forceLightText />

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="quick-footer-settings"
                onClick={() => {
                  onClose();
                  onOpenAndroidSettings('settings');
                }}
                className="tv-focusable inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.08] border border-white/14 text-xs font-medium text-zinc-100 hover:bg-white/[0.15] focus:bg-white focus:text-black focus:border-white focus:scale-105 shrink-0"
              >
                <Settings className="w-3.5 h-3.5 stroke-[2]" />
                <span>{t.footerSettings}</span>
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
