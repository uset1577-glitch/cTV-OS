import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface TvBootIntroProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const TvBootIntro = memo(function TvBootIntro({
  isOpen,
  onComplete,
}: TvBootIntroProps) {
  const [phase, setPhase] = useState<'reveal' | 'exit'>('reveal');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isOpen) return;

    setPhase('reveal');
    let completed = false;
    const finishIntro = () => {
      if (completed) return;
      completed = true;
      onCompleteRef.current();
    };

    const tExit = window.setTimeout(() => setPhase('exit'), 3350);
    const tDone = window.setTimeout(finishIntro, 4000);

    const handleKeySkip = (e: KeyboardEvent) => {
      if (
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.keyCode === 23 ||
        e.keyCode === 66 ||
        e.keyCode === 4
      ) {
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
      window.clearTimeout(tExit);
      window.clearTimeout(tDone);
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
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] bg-[#05070B] flex flex-col items-center justify-between py-12 px-8 overflow-hidden select-none cursor-default"
        >
          {/* Resplandor ambiental sutil detrás del logo */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: phase === 'exit' ? 0 : 0.6, scale: 1 }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-radial from-slate-300/14 via-slate-500/5 to-transparent will-change-[transform,opacity]"
            />
          </div>

          <div />

          {/* Únicamente el logo de VORA TV con fade-in elegante */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{
              opacity: phase === 'exit' ? 0 : 1,
              scale: phase === 'exit' ? 1.03 : 1,
            }}
            transition={{
              duration: phase === 'exit' ? 0.55 : 1.05,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative flex flex-col items-center justify-center text-center will-change-[transform,opacity]"
          >
            <svg
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-20 h-20 text-white"
              aria-hidden="true"
            >
              <path
                d="M5.5 10L18 27.5L30.5 10"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke="currentColor"
              />
              <path
                d="M11.5 10L18 19.2L24.5 10"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke="currentColor"
                strokeOpacity="0.42"
              />
            </svg>

            <div className="mt-5 flex items-center gap-3.5">
              <span className="font-display text-4xl sm:text-5xl font-bold tracking-[0.22em] text-white">
                VORA
              </span>
              <span className="font-display text-xl sm:text-2xl font-normal tracking-[0.24em] text-zinc-400">
                TV
              </span>
            </div>
          </motion.div>

          {/* Texto discreto en la parte inferior */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{
              opacity: phase === 'exit' ? 0 : 1,
              y: 0,
            }}
            transition={{
              duration: phase === 'exit' ? 0.45 : 0.9,
              delay: phase === 'exit' ? 0 : 0.45,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative text-xs font-medium tracking-wide text-zinc-400 text-center"
          >
            Diseñado para dispositivos con Android TV
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
