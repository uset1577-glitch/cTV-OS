import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FolderGit2,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation';
import type {
  AppVersionInfo,
  OtaDownloadProgress,
  OtaModalStatus,
  OtaVersionManifest,
} from '../types/launcher';

interface OtaUpdateModalProps {
  isOpen: boolean;
  repoSlug: string;
  currentVersion: AppVersionInfo;
  remoteManifest: OtaVersionManifest | null;
  status: OtaModalStatus;
  progress: OtaDownloadProgress | null;
  errorMessage: string | null;
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

export function OtaUpdateModal({
  isOpen,
  repoSlug,
  currentVersion,
  remoteManifest,
  status,
  progress,
  errorMessage,
  isNative,
  onUpdateRepo,
  onCheckAgain,
  onStartDownload,
  onOpenUnknownSources,
  onClose,
}: OtaUpdateModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [repoInput, setRepoInput] = useState(repoSlug);
  const isDefaultPlaceholder = repoSlug.includes('tu-usuario');

  useSpatialNavigation({
    enabled: isOpen,
    onBack: onClose,
    scopeSelector: '#ota-modal-root',
  });

  useEffect(() => {
    if (isOpen) {
      setRepoInput(repoSlug);
      const id = window.requestAnimationFrame(() => {
        const primary =
          document.querySelector<HTMLElement>('#ota-modal-root [data-tv-initial="true"]') ||
          closeBtnRef.current;
        primary?.focus();
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [isOpen, status, repoSlug]);

  const handleSaveAndCheck = () => {
    const trimmed = repoInput.trim();
    if (!trimmed) return;
    onUpdateRepo(trimmed);
    onCheckAgain(trimmed);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="ota-modal-root"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ota-modal-title"
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
            className="w-full max-w-2xl rounded-3xl bg-[#F4F5F7] dark:bg-[#111520] border border-zinc-900/10 dark:border-white/15 p-8 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex items-start justify-between gap-6 mb-5">
              <div>
                <p className="text-xs font-mono-tabular text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5" />
                  <span>GitHub Releases · {repoSlug}</span>
                </p>
                <h2
                  id="ota-modal-title"
                  className="font-display text-2xl font-bold text-zinc-900 dark:text-white"
                >
                  Actualización OTA
                </h2>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                data-tv-focusable="true"
                data-tv-id="ota-close-x"
                onClick={onClose}
                aria-label="Cerrar ventana de actualización"
                className="tv-focusable p-2.5 rounded-full bg-zinc-900/8 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector directo de repositorio de GitHub */}
            <div className="rounded-2xl bg-white dark:bg-[#090B10] border border-zinc-900/8 dark:border-white/10 p-4 mb-5">
              <label htmlFor="ota-repo-input" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                Repositorio de GitHub (usuario/repositorio):
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="ota-repo-input"
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="ej: tu-nombre/cTV-OS"
                  data-tv-focusable="true"
                  data-tv-id="ota-repo-input"
                  className="tv-focusable flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-900/10 dark:border-white/10 text-sm font-mono-tabular text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-id="ota-save-repo-btn"
                  onClick={handleSaveAndCheck}
                  className="tv-focusable px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold whitespace-nowrap focus:ring-2 focus:ring-amber-500 focus:scale-105"
                >
                  Guardar y buscar
                </button>
              </div>

              {isDefaultPlaceholder && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Escribe tu usuario de GitHub para consultar los releases de tu APK.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="rounded-2xl bg-white dark:bg-[#090B10] border border-zinc-900/8 dark:border-white/10 p-4">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Versión instalada</div>
                <div className="font-mono-tabular text-xl font-semibold text-zinc-900 dark:text-white mt-1">
                  v{currentVersion.versionName}
                </div>
                <div className="font-mono-tabular text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Build {currentVersion.versionCode}
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#090B10] border border-zinc-900/8 dark:border-white/10 p-4">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Último Release</div>
                <div className="font-mono-tabular text-xl font-semibold text-amber-600 dark:text-amber-400 mt-1">
                  {remoteManifest ? `v${remoteManifest.versionName}` : '—'}
                </div>
                <div className="font-mono-tabular text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {remoteManifest
                    ? `Build ${remoteManifest.versionCode}${
                        remoteManifest.fileSizeBytes
                          ? ` · ${formatBytes(remoteManifest.fileSizeBytes)}`
                          : ''
                      }`
                    : status === 'checking'
                      ? 'Consultando Releases...'
                      : 'Sin consultar'}
                </div>
              </div>
            </div>

            {status === 'checking' && (
              <div className="rounded-2xl bg-white dark:bg-[#090B10] border border-zinc-900/8 dark:border-white/10 p-5 flex items-center gap-4 mb-5">
                <RefreshCw className="w-6 h-6 text-amber-500 animate-spin shrink-0" />
                <div>
                  <div className="text-base font-semibold text-zinc-900 dark:text-white">
                    Buscando actualización...
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Consultando Releases en GitHub para {repoSlug}
                  </div>
                </div>
              </div>
            )}

            {status === 'up_to_date' && (
              <div className="rounded-2xl bg-white dark:bg-[#090B10] border border-emerald-500/30 p-5 flex items-center gap-4 mb-5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                  <div className="text-base font-semibold text-zinc-900 dark:text-white">
                    Launcher actualizado
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Ya cuentas con la última versión disponible (v{currentVersion.versionName}).
                  </div>
                </div>
              </div>
            )}

            {status === 'update_available' && remoteManifest && (
              <div className="rounded-2xl bg-white dark:bg-[#090B10] border border-amber-500/35 p-5 mb-5">
                <div className="text-base font-semibold text-zinc-900 dark:text-white mb-1.5">
                  Nueva versión disponible: v{remoteManifest.versionName}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                  {remoteManifest.releaseNotes ||
                    'Mejoras de rendimiento y fluidez para Android TV.'}
                </p>
              </div>
            )}

            {(status === 'downloading' || status === 'installing') && progress && (
              <div className="rounded-2xl bg-white dark:bg-[#090B10] border border-zinc-900/10 dark:border-white/12 p-5 mb-5">
                <div className="flex items-center justify-between text-sm mb-2.5">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {status === 'installing'
                      ? 'Abriendo instalador APK (FileProvider)...'
                      : 'Descargando APK...'}
                  </span>
                  <span className="font-mono-tabular text-amber-600 dark:text-amber-400 font-semibold">
                    {progress.percent}% · {formatBytes(progress.downloadedBytes)} /{' '}
                    {formatBytes(progress.totalBytes)}
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-[width] duration-150"
                    style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                  />
                </div>

                {progress.message && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">{progress.message}</p>
                )}
              </div>
            )}

            {status === 'permission_required' && (
              <div className="rounded-2xl bg-white dark:bg-[#090B10] border border-amber-500/40 p-5 flex items-start gap-4 mb-5">
                <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-base font-semibold text-zinc-900 dark:text-white">
                    Permiso necesario en Android TV
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                    Activa &ldquo;Instalar aplicaciones desconocidas&rdquo; para CTV OS y vuelve a
                    pulsar Instalar.
                  </p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="rounded-2xl bg-white dark:bg-[#090B10] border border-amber-500/30 p-5 mb-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-base font-semibold text-zinc-900 dark:text-white">
                      No se pudo verificar la actualización
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                      {errorMessage || 'Verifica el nombre del repositorio o la conexión.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isNative && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                En Android TV real, el launcher descarga el APK mediante el plugin nativo y lanza el instalador con FileProvider.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              {status === 'permission_required' && (
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-initial="true"
                  data-tv-id="ota-grant-permission"
                  onClick={onOpenUnknownSources}
                  className="tv-focusable px-5 py-3 rounded-full bg-amber-500 text-zinc-950 font-semibold text-sm focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
                >
                  Abrir permisos
                </button>
              )}

              {status === 'update_available' && (
                <button
                  type="button"
                  data-tv-focusable="true"
                  data-tv-initial="true"
                  data-tv-id="ota-install-btn"
                  onClick={onStartDownload}
                  className="tv-focusable inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 text-zinc-950 font-semibold text-sm focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar e instalar APK</span>
                </button>
              )}

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-initial={
                  status !== 'update_available' && status !== 'permission_required'
                    ? 'true'
                    : undefined
                }
                data-tv-id="ota-recheck-btn"
                onClick={() => onCheckAgain()}
                disabled={status === 'checking' || status === 'downloading'}
                className="tv-focusable inline-flex items-center gap-2 px-5 py-3 rounded-full bg-zinc-900/8 dark:bg-white/10 text-zinc-900 dark:text-white font-semibold text-sm disabled:opacity-50 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Buscar de nuevo</span>
              </button>

              <button
                type="button"
                data-tv-focusable="true"
                data-tv-id="ota-close-btn"
                onClick={onClose}
                className="tv-focusable px-5 py-3 rounded-full bg-zinc-900/5 dark:bg-white/6 text-zinc-700 dark:text-zinc-300 font-semibold text-sm focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
