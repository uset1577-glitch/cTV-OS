import { memo, useEffect, useRef, useState } from 'react';
import { Download, Monitor, Moon, Search, Settings, Sun } from 'lucide-react';
import { focusClosestInRow } from '../hooks/useSpatialNavigation';
import type { HomeTab, ThemeMode } from '../types/launcher';
import { BrandLogo } from './BrandLogo';

export interface TopBarFocusRequest {
  seq: number;
  targetX?: number;
}

interface NavaTopBarProps {
  activeTab: HomeTab;
  themeMode: ThemeMode;
  use24HourClock: boolean;
  hasAvailableUpdate: boolean;
  isVisible: boolean;
  isOverHero?: boolean;
  appsOnlyMode?: boolean;
  focusRequest?: TopBarFocusRequest | null;
  onSelectTab: (tab: HomeTab) => void;
  onToggleTheme: () => void;
  onOpenScreensaver: () => void;
  onOpenSearch: () => void;
  onOpenUpdate?: () => void;
  onOpenSettings: () => void;
}

export const NavaTopBar = memo(function NavaTopBar({
  activeTab,
  themeMode,
  use24HourClock,
  hasAvailableUpdate,
  isVisible,
  isOverHero = false,
  appsOnlyMode = false,
  focusRequest = null,
  onSelectTab,
  onToggleTheme,
  onOpenScreensaver,
  onOpenSearch,
  onOpenUpdate,
  onOpenSettings,
}: NavaTopBarProps) {
  const [now, setNow] = useState(() => new Date());
  const [localVisible, setLocalVisible] = useState(isVisible);
  const headerRef = useRef<HTMLElement | null>(null);
  const pendingFocusRef = useRef<TopBarFocusRequest | null>(null);
  const lastHandledSeqRef = useRef<number>(0);

  useEffect(() => {
    setLocalVisible(isVisible);
  }, [isVisible]);

  useEffect(() => {
    const handleVisibilityEvent = (e: Event) => {
      const next = (e as CustomEvent<boolean>).detail;
      if (typeof next === 'boolean') {
        setLocalVisible(next);
      }
    };
    window.addEventListener('voraTopBarVisibility', handleVisibilityEvent);
    return () => window.removeEventListener('voraTopBarVisibility', handleVisibilityEvent);
  }, []);

  const effectiveVisible = localVisible;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!focusRequest || focusRequest.seq === lastHandledSeqRef.current) return;
    pendingFocusRef.current = focusRequest;
  }, [focusRequest]);

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!effectiveVisible || !pending || pending.seq === lastHandledSeqRef.current) return;

    const rafId = window.requestAnimationFrame(() => {
      if (!headerRef.current) return;
      const focused = focusClosestInRow(
        headerRef.current,
        pending.targetX,
        `top-tab-${activeTab}`
      );
      if (focused) {
        lastHandledSeqRef.current = pending.seq;
        pendingFocusRef.current = null;
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [effectiveVisible, focusRequest, activeTab]);

  const formattedTime = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24HourClock,
  });

  const tabs: Array<{ id: HomeTab; label: string }> = appsOnlyMode
    ? [
        { id: 'inicio', label: 'Inicio' },
        { id: 'apps', label: 'Aplicaciones' },
      ]
    : [
        { id: 'inicio', label: 'Inicio' },
        { id: 'envivo', label: 'En vivo' },
        { id: 'apps', label: 'Aplicaciones' },
      ];

  const heroTone = isOverHero && !appsOnlyMode;

  return (
    <header
      ref={headerRef}
      data-tv-row="topbar"
      data-tv-over-dark={heroTone ? 'true' : undefined}
      data-tv-hidden={effectiveVisible ? undefined : 'true'}
      aria-hidden={!effectiveVisible}
      className={`fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-8 px-12 pt-5 pb-3.5 will-change-transform transition-transform duration-150 ease-out ${
        effectiveVisible
          ? 'translate-y-0 pointer-events-auto'
          : '-translate-y-full pointer-events-none'
      }`}
    >
      {/* Zona izquierda: Logo VORA TV OS + Pestañas */}
      <div className="flex items-center gap-8">
        <BrandLogo size="md" showWordmark forceLightText={heroTone} />

        <nav aria-label="Navegación principal" className="flex items-center gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                tabIndex={effectiveVisible ? 0 : -1}
                data-tv-focusable="true"
                data-tv-id={`top-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`tv-focusable px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 ${
                  isActive
                    ? heroTone
                      ? 'bg-white text-zinc-950 shadow-sm'
                      : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                    : heroTone
                      ? 'text-zinc-200 hover:text-white focus:bg-white/25 focus:text-white'
                      : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white focus:bg-zinc-900/15 dark:focus:bg-white/20'
                } focus:scale-105`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Zona derecha: Herramientas TV + Reloj */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          tabIndex={effectiveVisible ? 0 : -1}
          data-tv-focusable="true"
          data-tv-id="top-search"
          onClick={onOpenSearch}
          aria-label="Buscar aplicaciones y contenido"
          title="Buscar"
          className={`tv-focusable w-10 h-10 rounded-full flex items-center justify-center focus:scale-110 ${
            heroTone
              ? 'bg-white/14 text-white focus:bg-white focus:text-zinc-950'
              : 'bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950'
          }`}
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          tabIndex={effectiveVisible ? 0 : -1}
          data-tv-focusable="true"
          data-tv-id="top-theme"
          onClick={onToggleTheme}
          aria-label={themeMode === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
          title={themeMode === 'dark' ? 'Modo día' : 'Modo noche'}
          className={`tv-focusable w-10 h-10 rounded-full flex items-center justify-center focus:scale-110 ${
            heroTone
              ? 'bg-white/14 text-white focus:bg-white focus:text-zinc-950'
              : 'bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950'
          }`}
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          tabIndex={effectiveVisible ? 0 : -1}
          data-tv-focusable="true"
          data-tv-id="top-screensaver"
          onClick={onOpenScreensaver}
          aria-label="Activar salvapantallas"
          title="Salvapantallas"
          className={`tv-focusable w-10 h-10 rounded-full flex items-center justify-center focus:scale-110 ${
            heroTone
              ? 'bg-white/14 text-white focus:bg-white focus:text-zinc-950'
              : 'bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950'
          }`}
        >
          <Monitor className="w-4 h-4" />
        </button>

        {hasAvailableUpdate && (
          <button
            type="button"
            tabIndex={effectiveVisible ? 0 : -1}
            data-tv-focusable="true"
            data-tv-id="top-update"
            onClick={onOpenUpdate}
            aria-label="Nueva versión disponible para instalar"
            title="Nueva versión disponible"
            className="tv-focusable h-10 px-4 rounded-full flex items-center gap-2 text-xs font-bold whitespace-nowrap shrink-0 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 focus:scale-105 shadow-md"
          >
            <Download className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
            <span>Actualizar</span>
          </button>
        )}

        <button
          type="button"
          tabIndex={effectiveVisible ? 0 : -1}
          data-tv-focusable="true"
          data-tv-id="top-settings"
          onClick={onOpenSettings}
          aria-label="Ajustes del launcher"
          title="Ajustes"
          className={`tv-focusable w-10 h-10 rounded-full flex items-center justify-center focus:scale-110 ${
            heroTone
              ? 'bg-white/14 text-white focus:bg-white focus:text-zinc-950'
              : 'bg-zinc-900/10 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>

        <span
          className={`ml-2 font-display text-lg font-semibold tabular-nums whitespace-nowrap shrink-0 ${
            heroTone ? 'text-white/90' : 'text-zinc-800 dark:text-zinc-200'
          }`}
        >
          {formattedTime}
        </span>
      </div>
    </header>
  );
});
