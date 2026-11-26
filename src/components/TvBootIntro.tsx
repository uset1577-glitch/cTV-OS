import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface TvBootIntroProps {
  isOpen: boolean;
  onComplete: () => void;
}

// Logo oficial de Google (Vector SVG auténtico, sin IA)
function AuthenticGoogleTvLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Icono 'G' oficial de Google con sus cuatro colores de marca */}
      <svg
        viewBox="0 0 24 24"
        className="w-6 h-6 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          fill="#EA4335"
        />
      </svg>

      {/* Tipografía auténtica Google TV */}
      <div className="flex items-center gap-1.5">
        <span className="font-sans text-[17px] font-medium tracking-tight text-white/95">
          Google
        </span>
        <span className="px-1.5 py-0.5 rounded-[5px] bg-white/15 border border-white/20 text-[11px] font-bold tracking-wider uppercase text-white/95 leading-none">
          TV
        </span>
      </div>
    </div>
  );
}

export const TvBootIntro = memo(function TvBootIntro({
  isOpen,
  onComplete,
}: TvBootIntroProps) {
  const [phase, setPhase] = useState<'dots' | 'vora' | 'ready' | 'exit'>('dots');
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Secuencia de encendido de exactamente 4 segundos (4000 ms)
  useEffect(() => {
    if (!isOpen) return;

    setPhase('dots');
    setProgress(0);
    let completed = false;
    const finishIntro = () => {
      if (completed) return;
      completed = true;
      onCompleteRef.current();
    };

    // Sonido sutil sintetizado de inicio de TV (acorde armónico elegante de encendido)
    const playStartupChime = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }

        const now = ctx.currentTime;
        const notes = [261.63, 329.63, 392.0, 523.25]; // Do mayor (C4, E4, G4, C5)
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);

          gain.gain.setValueAtTime(0.001, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.045, now + i * 0.12 + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 1.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 1.5);
        });
      } catch {
        // Silencioso si el navegador bloquea audio inicial
      }
    };

    playStartupChime();

    // Cronograma exacto de 4000 ms:
    // 0ms - 750ms: Puntos de luz Google TV respirando
    // 750ms - 2500ms: Revelación del monograma VORA TV OS
    // 2500ms - 3600ms: Acreditación oficial Google TV + "Sistema preparado"
    // 3600ms - 4000ms: Disolución cinemática suave hacia el inicio
    const tVora = window.setTimeout(() => setPhase('vora'), 750);
    const tReady = window.setTimeout(() => setPhase('ready'), 2500);
    const tExit = window.setTimeout(() => setPhase('exit'), 3600);
    const tDone = window.setTimeout(finishIntro, 4000);

    const startTime = performance.now();
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / 3900) * 100));
      setProgress(pct);
    }, 40);

    // Permitir omitir si el usuario presiona OK/Escape o toca la pantalla
    const handleKeySkip = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 23 || e.keyCode === 66 || e.keyCode === 4) {
        e.preventDefault();
        finishIntro();
      }
    };
    const handlePointerSkip = () => {
      finishIntro();
    };

    window.addEventListener('keydown', handleKeySkip);
    window.addEventListener('pointerdown', handlePointerSkip, { once: true });

    return () => {
      window.clearTimeout(tVora);
      window.clearTimeout(tReady);
      window.clearTimeout(tExit);
      window.clearTimeout(tDone);
      window.clearInterval(interval);
      window.removeEventListener('keydown', handleKeySkip);
      window.removeEventListener('pointerdown', handlePointerSkip);
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="tv-boot-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === 'exit' ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] bg-[#07090E] flex flex-col items-center justify-between p-12 overflow-hidden select-none cursor-default"
        >
          {/* Resplandor ambiental de fondo */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40"
          >
            <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-600/20 via-amber-500/15 to-transparent blur-[120px] animate-pulse" />
          </div>

          {/* Zona superior: Espaciador sutil */}
          <div className="w-full flex items-center justify-between opacity-50 text-[11px] font-mono tracking-widest text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              VORA TV OS · 4K UHD
            </span>
            <span className="hidden sm:inline">PULSA OK PARA SALTAR</span>
          </div>

          {/* Zona central: Animación cinemática del Logo VORA + Google TV */}
          <div className="relative flex flex-col items-center justify-center text-center my-auto">
            {/* 1. Cuatro puntos de luz oficiales Google TV respirando antes de converger */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: phase === 'dots' ? [0.9, 1.1, 1] : 1,
                opacity: phase === 'dots' ? 1 : 0.85,
              }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="flex items-center gap-3 mb-6"
            >
              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                className="w-3 h-3 rounded-full bg-[#4285F4] shadow-[0_0_12px_#4285F4]"
              />
              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0.15 }}
                className="w-3 h-3 rounded-full bg-[#EA4335] shadow-[0_0_12px_#EA4335]"
              />
              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 }}
                className="w-3 h-3 rounded-full bg-[#FBBC05] shadow-[0_0_12px_#FBBC05]"
              />
              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0.45 }}
                className="w-3 h-3 rounded-full bg-[#34A853] shadow-[0_0_12px_#34A853]"
              />
            </motion.div>

            {/* 2. Monograma VORA de doble trazo paralelo de alta precisión */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <svg
                viewBox="0 0 36 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-20 h-20 text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.4)]"
                aria-hidden="true"
              >
                <path
                  d="M5.5 10L18 27.5L30.5 10"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  stroke="currentColor"
                />
                <path
                  d="M11.5 10L18 19.2L24.5 10"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  stroke="currentColor"
                  strokeOpacity="0.45"
                />
              </svg>
            </motion.div>

            {/* 3. Título VORA TV OS */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-4 flex items-center gap-3.5"
            >
              <span className="font-display text-4xl font-extrabold tracking-[0.22em] text-white">
                VORA
              </span>
              <span aria-hidden="true" className="w-px h-6 bg-white/30" />
              <span className="font-display text-lg font-semibold tracking-[0.28em] text-zinc-300">
                TV OS
              </span>
            </motion.div>

            {/* 4. Mención destacada con el logo REAL de Google TV (sin IA) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="mt-6 flex flex-col items-center gap-2"
            >
              <span className="text-[12px] font-medium tracking-wider uppercase text-zinc-400">
                Desarrollado para
              </span>
              <div className="px-4 py-2 rounded-2xl bg-white/[0.06] border border-white/10 shadow-lg backdrop-blur-md">
                <AuthenticGoogleTvLogo />
              </div>
            </motion.div>
          </div>

          {/* Zona inferior: Barra de progreso sutil y estado de inicio */}
          <div className="w-full max-w-md flex flex-col items-center gap-2.5">
            <div className="w-full flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span>
                {phase === 'ready' || phase === 'exit'
                  ? 'Sistema preparado'
                  : 'Cargando entretenimiento...'}
              </span>
              <span className="tabular-nums font-mono text-[11px] text-zinc-400">{progress}%</span>
            </div>

            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-400 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
