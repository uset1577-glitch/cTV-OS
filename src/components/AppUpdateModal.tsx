import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import type {
  AppDownloadProgress,
  AppUpdateManifest,
  AppUpdateModalStatus,
  AppVersionInfo,
} from '../types/launcher';
import { BrandLogo } from './BrandLogo';

interface AppUpdateModalProps {
  isOpen: boolean;
  updateRepo: string;
  currentVersion: AppVersionInfo;
  remoteManifest: AppUpdateManifest | null;
  status: AppUpdateModalStatus;
  progress: AppDownloadProgress | null;
  message: string | null;
  isNative: boolean;
  onUpdateRepo: (newRepo: string) => void;
  onCheckAgain: (customRepo?: string) => void;
  onStartDownload: () => void;
  onOpenUnknownSources: () => void;
  onClose: () => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function AppUpdateModal({
  isOpen,
  updateRepo,
  currentVersion,
  remoteManifest,
  status,
  progress,
  message,
  isNative,
  onUpdateRepo,
  onCheckAgain,
  onStartDownload,
  onOpenUnknownSources,
  onClose,
}: AppUpdateModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [repoInput, setRepoInput] = useState(updateRepo);

  useSpatialNavigation({
    enabled: isOpen,
    onBack: onClose,
    scopeSelector: '#app-update-modal-root',
  });

  useEffect(() => {
    if (isOpen) {
      setRepoInput(updateRepo);
      const id = window.requestAnimationFrame(() => {
        const primary =
          document.querySelector<HTMLElement>('#app-update-modal-root [data-tv-initial="true"]') ||
          closeBtnRef.current;
        primary?.focus();
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [isOpen, status, updateRepo]);

  const handleSaveAndCheck = () => {
    const trimmed = repoInput.trim();
    onUpdateRepo(trimmed);
    onCheckAgain(trimmed);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="app-update-modal-root"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-update-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="w-full max-w-xl rounded-3xl bg-[#E5E7EB] dark:bg-[#111114] border border-zinc-900/12 dark:border-white/15 p-8 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar"
          >
            <div data-tv-row="update-header" className="flex items-start justify-between gap-6 mb-6">
              <div className="flex items-center gap-3.5">
                <BrandLogo size="lg" showWordmark={false} />
                <div>
                  <h2
                    id="app-update-modal-title"
                    className="font-display text-2xl font-bold text-zinc-900 dark:text-white leading-tight"
                  >
                    Actualización de la app
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Versión actual: v{currentVersion.versionName} (Build {currentVersion.versionCode}) {isNative ? '· Android TV' : '· Web'}
                  </p>
                </div>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                data-tv-focusable="true"
                data-tv-id="update-close-x"
                onClick={onClose}
                aria-label="Cerrar ventana"
                className="tv-focusable p-2.5 rounded-full bg-zinc-900/10 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {status === 'checking' && (
              <div className="rounded-2xl bg-white dark:bg-[#09090B] border border-zinc-900/10 dark:border-white/10 p-6 flex items-center gap-4 mb-6">
                <RefreshCw className="w-7 h-7 text-zinc-800 dark:text-zinc-200 animate-spin shrink-0" />
                <div>
                  <div className="text-base font-semibold text-zinc-900 dark:text-white">
                    Comprobando versión...
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Buscando si hay una nueva versión disponible para tu TV
                  </div>
                </div>
              </div>
            )}

            {(status === 'up_to_date' || (status === 'idle' && !remoteManifest)) && (
              <div className="rounded-2xl bg-white dark:bg-[#09090B] border border-zinc-900/12 dark:border-white/15 p-6 flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-zinc-900/10 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-base font-bold text-zinc-900 dark:text-white">
                    Tu aplicación está actualizada
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-300 mt-0.5">
                    {message ||
                      `Tienes instalada la versión más reciente (v${currentVersion.versionName}).`}
                  </div>
                </div>
              </div>
            )}

            {status === 'update_available' && remoteManifest && (
              <div className="rounded-2xl bg-white dark:bg-[#09090B] border border-zinc-900/15 dark:border-white/20 p-6 mb-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    <Sparkles className="w-4 h-4" />
                    <span>Nueva actualización disponible</span>
                  </div>
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    No es obligatoria
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-4">
                  <div className="font-display text-3xl font-bold text-zinc-900 dark:text-white">
                    v{remoteManifest.versionName}
                  </div>
                  {remoteManifest.fileSizeBytes && (
                    <span className="text-xs font-mono-tabular text-zinc-500 dark:text-zinc-400">
                      {formatBytes(remoteManifest.fileSizeBytes)}
                    </span>
                  )}
                </div>

                <div className="rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-900/10 dark:border-white/15 px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug">
                  Actualización opcional: puedes omitirla si prefieres, pero esto podría mejorar tu
                  calidad del launcher.
                </div>

                <div className="rounded-xl bg-zinc-100 dark:bg-white/[0.04] p-4 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                  {remoteManifest.releaseNotes ||
                    '• Mejoras de fluidez y estabilidad en Android TV.\n• Corrección de errores y nueva experiencia en tu televisor.'}
                </div>
              </div>
            )}

            {(status === 'downloading' || status === 'installing') && progress && (
              <div className="rounded-2xl bg-white dark:bg-[#09090B] border border-zinc-900/10 dark:border-white/12 p-6 mb-6">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {status === 'installing'
                      ? 'Abriendo instalador del sistema...'
                      : 'Descargando actualización...'}
                  </span>
                  <span className="font-mono-tabular text-zinc-900 dark:text-white font-bold">
                    {progress.percent}%
                    {progress.totalBytes > 0 &&
                      ` · ${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)}`}
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-white transition-[width] duration-150"
                    style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                  />
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
                  {progress.message ||
                    'Al finalizar la descarga se abrirá el instalador de Android TV automáticamente.'}
                </p>
              </div>
            )}

            {status === 'permission_required' && (
              <div className="rounded-2xl bg-white dark:bg-[#09090B] border border-zinc-900/15 dark:border-white/20 p-6 flex items-start gap-4 mb-6">
                <ShieldAlert className="w-7 h-7 text-zinc-800 dark:text-zinc-200 shrink-0 mt-0.5" />
                <div>
                  <div className="text-base font-bold text-zinc-900 dark:text-white">
                    Permiso necesario en Android TV
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                    Para instalar la actualización, activa el permiso &ldquo;Instalar aplicaciones
                    desconocidas&rdquo; para VORA TV OS en los ajustes de tu TV.
                  </p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <div data-tv-row="update-advanced-toggle">
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="update-toggle-advanced"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="tv-focusable inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white focus:outline-none focus:text-zinc-900 dark:focus:text-white"
                >
                  <span>Servidor de descargas</span>
                  {showAdvanced ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {showAdvanced && (
                <div className="mt-3 p-4 rounded-2xl bg-white dark:bg-[#09090B] border border-zinc-900/10 dark:border-white/10 space-y-2">
                  <label
                    htmlFor="update-repo-input"
                    className="block text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    Repositorio o servidor de compilación (opcional):
                  </label>
                  <div data-tv-row="update-advanced-form" className="flex items-center gap-2">
                    <input
                      id="update-repo-input"
                      type="text"
                      value={repoInput}
                      onChange={(e) => setRepoInput(e.target.value)}
                      placeholder="usuario/vora-tv-os"
                      data-tv-focusable="true"
                      data-tv-id="update-repo-input"
                      className="tv-focusable flex-1 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-900/10 dark:border-white/10 text-xs font-mono-tabular text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white"
                    />
                    <button
                      type="button"
                      data-tv-focusable="true"
                      data-tv-id="update-save-repo"
                      onClick={handleSaveAndCheck}
                      className="tv-focusable px-3 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold whitespace-nowrap focus:scale-105"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div data-tv-row="update-actions" className="flex flex-wrap items-center justify-end gap-3">
              {status === 'permission_required' && (
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-initial="true"
                  data-tv-id="update-grant-permission"
                  onClick={onOpenUnknownSources}
                  className="tv-focusable px-6 py-3 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-sm focus:scale-105"
                >
                  Abrir permisos de Android
                </button>
              )}

              {status === 'update_available' && (
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-initial="true"
                  data-tv-id="update-install-btn"
                  onClick={onStartDownload}
                  className="tv-focusable inline-flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-sm focus:scale-105"
                >
                  <Download className="w-4 h-4" />
                  <span>Actualizar ahora</span>
                </button>
              )}

              {status !== 'downloading' && status !== 'installing' && (
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-initial={
                    status !== 'update_available' && status !== 'permission_required'
                      ? 'true'
                      : undefined
                  }
                  data-tv-id="update-check-btn"
                  onClick={() => onCheckAgain()}
                  disabled={status === 'checking'}
                  className="tv-focusable inline-flex items-center gap-2 px-5 py-3 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold text-sm disabled:opacity-50 focus:scale-105"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Buscar actualizaciones</span>
                </button>
              )}

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="update-close-btn"
                onClick={onClose}
                className="tv-focusable px-5 py-3 rounded-full bg-zinc-900/6 dark:bg-white/8 text-zinc-700 dark:text-zinc-300 font-semibold text-sm focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
              >
                {status === 'update_available' ? 'Más tarde' : 'Cerrar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
