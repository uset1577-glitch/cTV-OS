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
      className="tv-focusable group relative w-full h-[156px] rounded-3xl bg-white/90 dark:bg-white/[0.06] border border-zinc-900/8 dark:border-white/10 p-4 flex flex-col items-center justify-center gap-3 text-center focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-[1.06] focus:shadow-2xl"
    >
      {isFavorite && (
        <span
          aria-label="Fijada en la fila principal"
          className="absolute top-3.5 right-3.5 text-amber-500"
        >
          <Star className="w-4 h-4 fill-amber-500" />
        </span>
      )}

      <div className="w-15 h-15 rounded-2xl bg-zinc-100 dark:bg-zinc-800/90 flex items-center justify-center overflow-hidden shrink-0">
        {app.icon && !iconError ? (
          <img
            src={app.icon}
            alt={app.name}
            referrerPolicy="no-referrer"
            onError={() => setIconError(true)}
            className="w-full h-full object-contain p-1.5"
          />
        ) : (
          <AppWindow className="w-7 h-7 text-zinc-400" />
        )}
      </div>

      <div className="w-full min-w-0">
        <div className="text-[15px] font-semibold truncate leading-tight">
          {app.name}
        </div>
        {showPackageName && (
          <div className="mt-0.5 text-[11px] font-mono-tabular text-zinc-500 dark:text-zinc-400 group-focus:text-zinc-300 dark:group-focus:text-zinc-600 truncate">
            {app.packageName}
          </div>
        )}
      </div>
    </button>
  );
}
