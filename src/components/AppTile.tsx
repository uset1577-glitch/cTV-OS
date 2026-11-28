import { memo, useEffect, useRef, useState } from 'react';
import { AppWindow, Star } from 'lucide-react';
import type { InstalledApp } from '../types/launcher';

interface AppTileProps {
  app: InstalledApp;
  isFavorite: boolean;
  showPackageName?: boolean;
  pinnedLabel?: string;
  focusId: string;
  onLaunch: (app: InstalledApp) => void;
  onToggleFavorite: (app: InstalledApp) => void;
}

export const AppTile = memo(function AppTile({
  app,
  isFavorite,
  showPackageName = false,
  pinnedLabel = 'Fijada en Inicio',
  focusId,
  onLaunch,
  onToggleFavorite,
}: AppTileProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [iconError, setIconError] = useState(false);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;

    const handleLongPress = () => {
      onToggleFavorite(app);
    };

    el.addEventListener('tv-longpress', handleLongPress);
    return () => {
      el.removeEventListener('tv-longpress', handleLongPress);
    };
  }, [app, onToggleFavorite]);

  return (
    <button
      ref={buttonRef}
      type="button"
      data-tv-focusable="true"
      data-tv-focus-wrapper="true"
      data-tv-supports-longpress="true"
      data-tv-id={focusId}
      onClick={() => onLaunch(app)}
      className="tv-card-contain group relative w-full py-3 px-2 rounded-3xl flex flex-col items-center justify-start gap-3 text-center focus:outline-none"
    >
      <div
        data-tv-focus-box="true"
        className="tv-focusable transform-gpu relative w-24 h-24 rounded-[22px] bg-slate-200/85 dark:bg-zinc-800/90 border-2 border-zinc-900/15 dark:border-white/20 group-focus:scale-[1.08] overflow-hidden p-1.5 flex items-center justify-center shrink-0 shadow-lg"
      >
        {app.icon && !iconError ? (
          <img
            src={app.icon}
            alt={app.name}
            referrerPolicy="no-referrer"
            onError={() => setIconError(true)}
            className="w-full h-full object-contain rounded-[16px]"
          />
        ) : (
          <AppWindow className="w-9 h-9 text-zinc-400" />
        )}

        {isFavorite && (
          <span
            aria-label={pinnedLabel}
            className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-zinc-950/90 text-white flex items-center justify-center border border-white/25"
          >
            <Star className="w-3.5 h-3.5 fill-white" />
          </span>
        )}
      </div>

      <div className="w-full min-w-0 px-1">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 group-focus:text-zinc-950 dark:group-focus:text-white group-focus:font-semibold truncate leading-tight">
          {app.name}
        </div>
        {showPackageName && (
          <div className="mt-0.5 text-[11px] font-mono-tabular text-zinc-500 dark:text-zinc-400 truncate">
            {app.packageName}
          </div>
        )}
      </div>
    </button>
  );
});
