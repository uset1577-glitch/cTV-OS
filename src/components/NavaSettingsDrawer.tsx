import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Download,
  Home,
  Moon,
  RotateCcw,
  Settings,
  Sun,
  Wifi,
  X,
} from 'lucide-react';
import { BACKGROUND_PRESETS, DEFAULT_FAVORITES } from '../data/presets';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import type { AppVersionInfo, LauncherSettings } from '../types/launcher';

interface NavaSettingsDrawerProps {
  isOpen: boolean;
  settings: LauncherSettings;
  appVersion: AppVersionInfo;
  isNative: boolean;
  onUpdateSettings: (patch: Partial<LauncherSettings>) => void;
  onOpenAndroidSettings: (section: 'settings' | 'wifi' | 'home' | 'unknown_sources') => void;
  onOpenOtaModal: () => void;
  onClose: () => void;
}

export function NavaSettingsDrawer({
  isOpen,
  settings,
  appVersion,
  isNative,
  onUpdateSettings,
  onOpenAndroidSettings,
  onOpenOtaModal,
  onClose,
}: NavaSettingsDrawerProps) {
  const [repoInput, setRepoInput] = useState(settings.otaRepo);
  const [repoSaved, setRepoSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRepoInput(settings.otaRepo);
    }
  }, [isOpen, settings.otaRepo]);

  useSpatialNavigation({
    enabled: isOpen,
    onBack: onClose,
    scopeSelector: '#nava-settings-drawer',
  });

  const handleSaveRepo = () => {
    onUpdateSettings({ otaRepo: repoInput.trim() });
    setRepoSaved(true);
    window.setTimeout(() => setRepoSaved(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="nava-settings-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Ajustes de CgamesTV"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-40 bg-black/55 flex justify-end"
        >
          <motion.div
            initial={{ x: 56, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className="w-full max-w-2xl h-full bg-[#F4F5F7] dark:bg-[#0D1017] border-l border-zinc-900/10 dark:border-white/10 p-9 overflow-y-auto no-scrollbar flex flex-col gap-7"
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
                  Ajustes de CTV OS
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Personalización ligera, sistema Android TV y OTA
                </p>
              </div>
              <button
                type="button"
                data-tv-focusable="true"
                data-tv-initial="true"
                data-tv-id="settings-close"
                onClick={onClose}
                aria-label="Cerrar ajustes"
                className="tv-focusable p-2.5 rounded-full bg-zinc-900/8 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Apariencia Día / Noche y Fondos */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                Apariencia y fondo limpio
              </h3>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="settings-theme-toggle"
                onClick={() =>
                  onUpdateSettings({
                    themeMode: settings.themeMode === 'dark' ? 'light' : 'dark',
                  })
                }
                className="tv-focusable w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-white dark:bg-white/[0.06] border border-zinc-900/8 dark:border-white/10 text-left focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.015] group"
              >
                <div className="flex items-center gap-3.5">
                  {settings.themeMode === 'dark' ? (
                    <Moon className="w-5 h-5 shrink-0" />
                  ) : (
                    <Sun className="w-5 h-5 shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold text-sm">Modo de tema</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 group-focus:text-zinc-300 dark:group-focus:text-zinc-600">
                      Alterna entre modo Día claro y Noche oscuro
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold shrink-0">
                  {settings.themeMode === 'dark' ? 'Noche' : 'Día'}
                </span>
              </button>

              <div className="grid grid-cols-3 gap-3">
                {BACKGROUND_PRESETS.map((preset) => {
                  const selected = settings.backgroundId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-tv-focusable="true"
                      data-tv-id={`settings-bg-${preset.id}`}
                      onClick={() => onUpdateSettings({ backgroundId: preset.id })}
                      className={`tv-focusable rounded-2xl p-2.5 text-left border ${
                        selected
                          ? 'border-amber-500 bg-white dark:bg-white/10'
                          : 'border-zinc-900/8 dark:border-white/10 bg-white/70 dark:bg-white/[0.04]'
                      } focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:scale-[1.03]`}
                    >
                      <div
                        className="h-12 w-full rounded-xl mb-2 relative overflow-hidden border border-black/10"
                        style={{
                          background:
                            settings.themeMode === 'light'
                              ? preset.lightValue
                              : preset.swatch,
                        }}
                      >
                        {selected && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                        {preset.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preferencias rápidas */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                Preferencias
              </h3>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="settings-suggestions"
                onClick={() => onUpdateSettings({ showSuggestions: !settings.showSuggestions })}
                className="tv-focusable w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white dark:bg-white/[0.06] border border-zinc-900/8 dark:border-white/10 text-left focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.015]"
              >
                <span className="text-sm font-semibold">Sugerencias de YouTube, Netflix, Max y Prime</span>
                <span className="text-sm font-semibold">
                  {settings.showSuggestions ? 'Visibles' : 'Ocultas'}
                </span>
              </button>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="settings-clock"
                onClick={() => onUpdateSettings({ use24HourClock: !settings.use24HourClock })}
                className="tv-focusable w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white dark:bg-white/[0.06] border border-zinc-900/8 dark:border-white/10 text-left focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.015]"
              >
                <span className="text-sm font-semibold">Formato de reloj</span>
                <span className="font-mono-tabular text-sm font-semibold">
                  {settings.use24HourClock ? '24h' : '12h'}
                </span>
              </button>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="settings-pkg"
                onClick={() => onUpdateSettings({ showPackageNames: !settings.showPackageNames })}
                className="tv-focusable w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white dark:bg-white/[0.06] border border-zinc-900/8 dark:border-white/10 text-left focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.015]"
              >
                <span className="text-sm font-semibold">Mostrar nombre de paquete Android</span>
                <span className="text-sm font-semibold">
                  {settings.showPackageNames ? 'Visible' : 'Oculto'}
                </span>
              </button>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="settings-reset-favs"
                onClick={() => onUpdateSettings({ favoritePackages: DEFAULT_FAVORITES })}
                className="tv-focusable w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white dark:bg-white/[0.06] border border-zinc-900/8 dark:border-white/10 text-left focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.015]"
              >
                <span className="text-sm font-semibold">Restaurar fila de favoritos inicial</span>
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Sistema Android TV */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                Sistema Android TV
              </h3>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="settings-home"
                onClick={() => onOpenAndroidSettings('home')}
                className="tv-focusable w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white dark:bg-white/[0.06] border border-zinc-900/8 dark:border-white/10 text-left focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.015] group"
              >
                <div>
                  <div className="text-sm font-semibold">Definir como Launcher principal</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 group-focus:text-zinc-300 dark:group-focus:text-zinc-600">
                    {isNative ? 'Selector de pantalla de inicio' : 'Disponible en Android TV'}
                  </div>
                </div>
                <Home className="w-4 h-4 shrink-0" />
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="settings-wifi"
                  onClick={() => onOpenAndroidSettings('wifi')}
                  className="tv-focusable flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white dark:bg-white/[0.06] border border-zinc-900/8 dark:border-white/10 text-sm font-semibold focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.02]"
                >
                  <span>Wi-Fi</span>
                  <Wifi className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="settings-android"
                  onClick={() => onOpenAndroidSettings('settings')}
                  className="tv-focusable flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white dark:bg-white/[0.06] border border-zinc-900/8 dark:border-white/10 text-sm font-semibold focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.02]"
                >
                  <span>Ajustes TV</span>
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* OTA GitHub Releases */}
            <div className="rounded-2xl bg-white dark:bg-white/[0.06] border border-zinc-900/8 dark:border-white/10 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Actualización OTA (GitHub Releases)
                </span>
                <span className="font-mono-tabular text-xs text-zinc-500 dark:text-zinc-400">
                  v{appVersion.versionName} · {appVersion.versionCode}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  data-tv-focusable="true"
                  data-tv-id="settings-ota-repo"
                  placeholder="usuario/repositorio"
                  className="tv-focusable flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-[#090B10] border border-zinc-900/10 dark:border-white/12 text-sm font-mono-tabular text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="settings-ota-save"
                  onClick={handleSaveRepo}
                  className="tv-focusable px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:scale-105 whitespace-nowrap shrink-0"
                >
                  {repoSaved ? 'Guardado' : 'Guardar'}
                </button>
              </div>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="settings-ota-open"
                onClick={onOpenOtaModal}
                className="tv-focusable w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-zinc-950 font-semibold text-sm focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.02]"
              >
                <Download className="w-4 h-4" />
                <span>Buscar actualización ahora</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
