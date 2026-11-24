import { useEffect, useState } from 'react';
import { Download, Moon, Search, Settings, Sun } from 'lucide-react';
import type { HomeTab, ThemeMode } from '../types/launcher';

interface NavaTopBarProps {
  activeTab: HomeTab;
  themeMode: ThemeMode;
  use24HourClock: boolean;
  hasAvailableUpdate: boolean;
  onSelectTab: (tab: HomeTab) => void;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  onOpenUpdate?: () => void;
  onOpenSettings: () => void;
}

export function NavaTopBar({
  activeTab,
  themeMode,
  use24HourClock,
  hasAvailableUpdate,
  onSelectTab,
  onToggleTheme,
  onOpenSearch,
  onOpenUpdate,
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

  const tabs: Array<{ id: HomeTab; label: string }> = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'envivo', label: 'En vivo' },
    { id: 'apps', label: 'Aplicaciones' },
  ];

  return (
    <header className="relative z-20 flex items-center justify-between gap-8 px-12 pt-6 pb-3 shrink-0">
      {/* Zona izquierda Google TV 2025: Perfil compacto + Pestañas limpias */}
      <div className="flex items-center gap-7">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-display text-sm font-bold flex items-center justify-center shrink-0">
            C
          </div>
          <span className="font-display text-lg font-semibold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap shrink-0">
            CTV OS
          </span>
        </div>

        <nav aria-label="Navegación principal" className="flex items-center gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-tv-focusable="true"
                data-tv-id={`top-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`tv-focusable px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white focus:bg-zinc-900/15 dark:focus:bg-white/20'
                } focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:scale-105`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Zona derecha: Herramientas compactas + Reloj */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="top-search"
          onClick={onOpenSearch}
          aria-label="Buscar aplicaciones y contenido"
          title="Buscar"
          className="tv-focusable w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900/8 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-110"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="top-theme"
          onClick={onToggleTheme}
          aria-label={themeMode === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
          title={themeMode === 'dark' ? 'Modo día' : 'Modo noche'}
          className="tv-focusable w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900/8 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-110"
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {hasAvailableUpdate && (
          <button
            type="button"
            data-tv-focusable="true"
            data-tv-id="top-update"
            onClick={onOpenUpdate}
            aria-label="Nueva versión disponible para instalar"
            title="Nueva versión disponible"
            className="tv-focusable h-10 px-4 rounded-full flex items-center gap-2 text-xs font-bold whitespace-nowrap shrink-0 bg-amber-500 text-zinc-950 focus:bg-white focus:text-zinc-950 focus:scale-105 shadow-md shadow-amber-500/20"
          >
            <Download className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
            <span>Actualizar</span>
          </button>
        )}

        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="top-settings"
          onClick={onOpenSettings}
          aria-label="Ajustes del launcher"
          title="Ajustes"
          className="tv-focusable w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900/8 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:scale-110"
        >
          <Settings className="w-4 h-4" />
        </button>

        <span className="ml-2 font-display text-lg font-medium tabular-nums text-zinc-700 dark:text-zinc-200 whitespace-nowrap shrink-0">
          {formattedTime}
        </span>
      </div>
    </header>
  );
}
