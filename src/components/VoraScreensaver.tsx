import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Disc3 } from 'lucide-react';
import { BACKGROUND_PRESETS } from '../data/presets';
import type { SpotifyNowPlaying } from '../types/launcher';
import { BrandLogo } from './BrandLogo';

interface VoraScreensaverProps {
  isActive: boolean;
  use24HourClock: boolean;
  spotify: SpotifyNowPlaying | null;
  onDismiss: () => void;
}

export function VoraScreensaver({
  isActive,
  use24HourClock,
  spotify,
  onDismiss,
}: VoraScreensaverProps) {
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const activatedAtRef = useRef<number>(0);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Registrar instante de activación para evitar cierre accidental por el clic/tecla inicial
  useEffect(() => {
    if (isActive) {
      activatedAtRef.current = Date.now();
      lastMousePosRef.current = null;
    }
  }, [isActive]);

  // Rotar fondos cada 12 segundos
  useEffect(() => {
    if (!isActive) return;
    const interval = window.setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % BACKGROUND_PRESETS.length);
    }, 12_000);
    return () => window.clearInterval(interval);
  }, [isActive]);

  // Actualizar reloj cada segundo
  useEffect(() => {
    if (!isActive) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [isActive]);

  // Escuchar cualquier tecla del mando, clic o movimiento deliberado para salir del salvapantallas
  useEffect(() => {
    if (!isActive) return;

    const isWithinGracePeriod = () => Date.now() - activatedAtRef.current < 750;

    const handleKeyOrPress = (e: Event) => {
      if (isWithinGracePeriod()) return;
      e.stopPropagation();
      onDismiss();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isWithinGracePeriod()) return;
      if (!lastMousePosRef.current) {
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const dx = Math.abs(e.clientX - lastMousePosRef.current.x);
      const dy = Math.abs(e.clientY - lastMousePosRef.current.y);
      if (dx > 14 || dy > 14) {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyOrPress, true);
    window.addEventListener('mousedown', handleKeyOrPress, true);
    window.addEventListener('touchstart', handleKeyOrPress, true);
    window.addEventListener('pointerdown', handleKeyOrPress, true);
    window.addEventListener('mousemove', handleMouseMove, true);

    return () => {
      window.removeEventListener('keydown', handleKeyOrPress, true);
      window.removeEventListener('mousedown', handleKeyOrPress, true);
      window.removeEventListener('touchstart', handleKeyOrPress, true);
      window.removeEventListener('pointerdown', handleKeyOrPress, true);
      window.removeEventListener('mousemove', handleMouseMove, true);
    };
  }, [isActive, onDismiss]);

  if (!isActive) return null;

  const activePreset = BACKGROUND_PRESETS[currentBgIndex] || BACKGROUND_PRESETS[0];
  const timeString = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24HourClock,
  });

  const dateString = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const hasSpotifyTrack = Boolean(spotify?.isPlaying && spotify.track.trim());

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="fixed inset-0 z-50 bg-[#090C12] text-white flex flex-col items-center justify-between p-14 select-none overflow-hidden cursor-none"
        onClick={() => {
          if (Date.now() - activatedAtRef.current >= 750) {
            onDismiss();
          }
        }}
      >
        {/* Fondo fotográfico o gradiente ambiental con animación sutil de zoom */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            key={activePreset.id}
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1.12, opacity: 0.65 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3.5, ease: 'easeInOut' }}
            className="absolute inset-0 bg-cover bg-center filter blur-[1px] brightness-[0.75]"
            style={{ backgroundImage: activePreset.value }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60" />
        </div>

        {/* Cabecera: Marca VORA TV OS discreta */}
        <div className="relative z-10 w-full flex items-center justify-between">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/15 shadow-2xl">
            <BrandLogo size="sm" showWordmark forceLightText />
            <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase">
              Salvapantallas VORA
            </span>
          </div>
          <div className="text-xs font-medium text-white/70 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            Pulsa cualquier botón para volver
          </div>
        </div>

        {/* Centro: Gran Reloj, Fecha Cinematográfica y Spotify Now Playing */}
        <div className="relative z-10 flex flex-col items-center text-center gap-4 my-auto max-w-3xl">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="font-display font-bold text-8xl md:text-9xl tracking-tighter text-white drop-shadow-2xl tabular-nums font-mono-tabular"
          >
            {timeString}
          </motion.div>
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="font-display text-2xl md:text-3xl text-zinc-300 font-medium capitalize tracking-wide drop-shadow-lg"
          >
            {dateString}
          </motion.div>

          {/* Identificador de Spotify en reproducción */}
          <AnimatePresence>
            {hasSpotifyTrack && spotify && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="mt-5 flex items-center gap-4 bg-black/55 backdrop-blur-xl border border-[#1DB954]/40 rounded-2xl px-5 py-3.5 shadow-2xl max-w-xl"
              >
                {spotify.albumArt ? (
                  <img
                    src={spotify.albumArt}
                    alt={spotify.album || spotify.track}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover shadow-md shrink-0 border border-white/15"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#1DB954]/20 border border-[#1DB954]/40 flex items-center justify-center shrink-0">
                    <Disc3 className="w-6 h-6 text-[#1DB954] animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                )}

                <div className="flex flex-col items-start text-left min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1DB954]">
                    <span className="inline-flex items-end gap-0.5 h-3" aria-hidden="true">
                      <span className="w-0.5 h-2 bg-[#1DB954] rounded-full animate-pulse" />
                      <span className="w-0.5 h-3 bg-[#1DB954] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-0.5 h-1.5 bg-[#1DB954] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span>Spotify</span>
                  </div>
                  <p className="text-base md:text-lg text-zinc-200 truncate max-w-[26rem]">
                    Estás escuchando:{' '}
                    <strong className="text-white font-bold">{spotify.track}</strong>
                  </p>
                  {spotify.artist && (
                    <p className="text-xs text-zinc-400 truncate max-w-[26rem]">
                      {spotify.artist}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pie: Estado y fondo actual */}
        <div className="relative z-10 w-full flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              Fondo: <strong className="text-zinc-200">{activePreset.name}</strong>
            </span>
          </div>
          <div className="font-mono text-zinc-500">
            VORA TV OS · Reemplazo de Google TV Screensaver
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
