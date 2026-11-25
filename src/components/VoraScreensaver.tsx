import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Disc3 } from 'lucide-react';
import type { SpotifyNowPlaying } from '../types/launcher';
import { BrandLogo } from './BrandLogo';

const SCREENSAVER_WALLPAPERS = [
  '/src/assets/images/screensaver_alpine_dusk_1795629260581.jpg',
  '/src/assets/images/screensaver_aurora_fjord_1795629260722.jpg',
  '/src/assets/images/screensaver_ocean_horizon_1795629260598.jpg',
  '/src/assets/images/screensaver_forest_mist_1795629261261.jpg',
  '/src/assets/images/screensaver_desert_stars_1795629260936.jpg',
];

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

  useEffect(() => {
    if (isActive) {
      activatedAtRef.current = Date.now();
      lastMousePosRef.current = null;
      setNow(new Date());
    }
  }, [isActive]);

  // Precargar todas las imágenes del salvapantallas para transiciones instantáneas
  useEffect(() => {
    SCREENSAVER_WALLPAPERS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Rotar fondos fotográficos cada 18 segundos
  useEffect(() => {
    if (!isActive) return;
    const interval = window.setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % SCREENSAVER_WALLPAPERS.length);
    }, 18_000);
    return () => window.clearInterval(interval);
  }, [isActive]);

  // Actualizar reloj cada segundo
  useEffect(() => {
    if (!isActive) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [isActive]);

  // Salir al pulsar cualquier botón o mover el puntero deliberadamente
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
      if (dx > 16 || dy > 16) {
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

  const currentWallpaper =
    SCREENSAVER_WALLPAPERS[currentBgIndex] || SCREENSAVER_WALLPAPERS[0];

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
        transition={{ duration: 0.7, ease: 'easeInOut' }}
        className="fixed inset-0 z-50 bg-black text-white select-none overflow-hidden cursor-none"
        onClick={() => {
          if (Date.now() - activatedAtRef.current >= 750) {
            onDismiss();
          }
        }}
      >
        {/* Galería fotográfica a pantalla completa con transición suave */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <AnimatePresence mode="sync">
            <motion.img
              key={currentWallpaper}
              src={currentWallpaper}
              alt=""
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1.07 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 2.0, ease: 'easeInOut' },
                scale: { duration: 18, ease: 'linear' },
              }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          {/* Scrim sutil superior e inferior para garantizar legibilidad en las esquinas */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
        </div>

        {/* Esquina superior izquierda: únicamente VORA TV OS */}
        <div className="relative z-10 px-12 pt-9 flex items-start justify-start pointer-events-none">
          <BrandLogo size="sm" showWordmark forceLightText />
        </div>

        {/* Zona inferior ordenada: Spotify a la izquierda (solo si hay música), reloj compacto a la derecha */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-12 pb-10 flex items-end justify-between gap-8 pointer-events-none">
          {/* Esquina inferior izquierda: Spotify (únicamente cuando detecta reproducción) */}
          <div className="min-w-0 max-w-lg">
            <AnimatePresence>
              {hasSpotifyTrack && spotify && (
                <motion.div
                  key={`playing-${spotify.track}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3.5"
                >
                  {spotify.albumArt ? (
                    <img
                      src={spotify.albumArt}
                      alt={spotify.album || spotify.track}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-lg object-cover shadow-lg shrink-0"
                    />
                  ) : (
                    <Disc3
                      className="w-8 h-8 text-[#1DB954] shrink-0 animate-spin drop-shadow"
                      style={{ animationDuration: '6s' }}
                    />
                  )}

                  <div className="min-w-0">
                    <p className="text-base md:text-lg text-white/85 truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                      Estás escuchando:{' '}
                      <strong className="font-semibold text-white">{spotify.track}</strong>
                    </p>
                    {spotify.artist && (
                      <p className="text-xs md:text-sm text-white/70 truncate drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                        {spotify.artist}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Esquina inferior derecha: reloj compacto y fecha sutil */}
          <div className="text-right shrink-0">
            <div className="font-display font-semibold text-3xl md:text-4xl tracking-tight text-white tabular-nums font-mono-tabular drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
              {timeString}
            </div>
            <div className="text-xs md:text-sm text-white/75 capitalize mt-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
              {dateString}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
