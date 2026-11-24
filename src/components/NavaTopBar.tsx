import { useEffect, useState } from 'react';
import { Download, Moon, Search, Settings, Sun } from 'lucide-react';
import type { ThemeMode } from '../types/launcher';

interface NavaTopBarProps {
  themeMode: ThemeMode;
  use24HourClock: boolean;
  hasAvailableUpdate: boolean;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  onOpenOta: () => void;
  onOpenSettings: () => void;
}

export function NavaTopBar({
  themeMode,
  use24HourClock,
  hasAvailableUpdate,
  onToggleTheme,
  onOpenSearch,
  onOpenOta,
  onOpenSettings,
}: NavaTopBarProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const formattedTime = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24HourClock,
  });

  const formattedDate = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="flex items-start justify-between gap-8 px-12 pt-9 pb-2 shrink-0">
      {/* Reloj minimalista en periferia superior izquierda */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-3.5">
          <span className="font-display text-4xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-white">
            {formattedTime}
          </span>
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
            CTV OS
          </span>
        </div>
        <span className="mt-1.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 capitalize">
          {formattedDate}
        </span>
      </div>

      {/* Acciones discretas estilo Nava TV */}
      <nav aria-label="Utilidades" className="flex items-center gap-2.5">
        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="top-search"
          onClick={onOpenSearch}
          className="tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-zinc-900/6 dark:bg-white/8 text-zinc-700 dark:text-zinc-200 border border-transparent focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105 whitespace-nowrap shrink-0"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span>Buscar</span>
        </button>

        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="top-theme"
          onClick={onToggleTheme}
          aria-label={themeMode === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
          className="tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-zinc-900/6 dark:bg-white/8 text-zinc-700 dark:text-zinc-200 border border-transparent focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105 whitespace-nowrap shrink-0"
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 shrink-0" />
          )}
          <span>{themeMode === 'dark' ? 'Día' : 'Noche'}</span>
        </button>

        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="top-ota"
          onClick={onOpenOta}
          className={`tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border border-transparent focus:scale-105 whitespace-nowrap shrink-0 ${
            hasAvailableUpdate
              ? 'bg-amber-500 text-zinc-950 font-semibold focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950'
              : 'bg-zinc-900/6 dark:bg-white/8 text-zinc-700 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950'
          }`}
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>{hasAvailableUpdate ? 'Actualizar' : 'OTA'}</span>
        </button>

        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="top-settings"
          onClick={onOpenSettings}
          aria-label="Abrir ajustes"
          className="tv-focusable flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-zinc-900/6 dark:bg-white/8 text-zinc-700 dark:text-zinc-200 border border-transparent focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-105 whitespace-nowrap shrink-0"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Ajustes</span>
        </button>
      </nav>
    </header>
  );
}
