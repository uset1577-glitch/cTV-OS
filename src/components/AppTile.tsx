import { useEffect, useRef, useState } from 'react';
import { AppWindow, Star } from 'lucide-react';
import type { InstalledApp } from '../types/launcher';

interface AppTileProps {
  app: InstalledApp;
  isFavorite: boolean;
  showPackageName?: boolean;
  focusId: string;
  onLaunch: (app: InstalledApp) => void;
  onToggleFavorite: (app: InstalledApp) => void;
}

export function AppTile({
  app,
  isFavorite,
  showPackageName = false,
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
      data-tv-supports-longpress="true"
      data-tv-id={focusId}
      onClick={() => onLaunch(app)}
      className="tv-focusable group relative w-full py-3 px-2 rounded-3xl flex flex-col items-center justify-start gap-3 text-center focus:scale-[1.08]"
    >
      <div
        data-tv-focus-box="true"
        className="relative w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-zinc-900/10 dark:border-white/15 group-focus:border-zinc-900 dark:group-focus:border-white group-focus:ring-4 group-focus:ring-zinc-900/20 dark:group-focus:ring-white/25 overflow-hidden flex items-center justify-center shrink-0 transition-all duration-200 shadow-lg"
      >
        {app.icon && !iconError ? (
          <img
            src={app.icon}
            alt={app.name}
            referrerPolicy="no-referrer"
            onError={() => setIconError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <AppWindow className="w-9 h-9 text-zinc-400" />
        )}

        {isFavorite && (
          <span
            aria-label="Fijada en Inicio"
            className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-zinc-950/90 text-amber-400 flex items-center justify-center border border-white/20"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400" />
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
}
