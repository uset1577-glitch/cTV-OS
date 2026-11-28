import { memo, useCallback, useEffect, useRef, useState } from 'react';

interface TvBootIntroProps {
  isOpen: boolean;
  onComplete: () => void;
}

const VORA_LETTERS = [
  { char: 'V', anim: 'vora-intro-glyph-v', delay: '1.30s' },
  { char: 'O', anim: 'vora-intro-glyph-o', delay: '1.68s' },
  { char: 'R', anim: 'vora-intro-glyph-r', delay: '2.06s' },
  { char: 'A', anim: 'vora-intro-glyph-a', delay: '2.44s' },
] as const;

const TOTAL_INTRO_DURATION_MS = 6200;
const MIN_MANUAL_SKIP_MS = 2000;

export const TvBootIntro = memo(function TvBootIntro({
  isOpen,
  onComplete,
}: TvBootIntroProps) {
  const [timelineActive, setTimelineActive] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);
  const startedAtRef = useRef<number>(0);

  const finishIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setTimelineActive(false);
      return;
    }

    completedRef.current = false;
    setTimelineActive(false);

    let raf1 = 0;
    let raf2 = 0;
    let fallbackTimer = 0;

    // Esperar al primer frame pintado antes de arrancar el reloj de 6.2s
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        startedAtRef.current = performance.now();
        setTimelineActive(true);
        fallbackTimer = window.setTimeout(finishIntro, TOTAL_INTRO_DURATION_MS + 120);
      });
    });

    const handleKeySkip = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!startedAtRef.current || performance.now() - startedAtRef.current < MIN_MANUAL_SKIP_MS) {
        return;
      }
      if (
        e.key === 'Enter' ||
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.key === 'BrowserBack' ||
        e.key === 'GoBack' ||
        e.keyCode === 23 ||
        e.keyCode === 66 ||
        e.keyCode === 4
      ) {
        e.preventDefault();
        finishIntro();
      }
    };

    window.addEventListener('keydown', handleKeySkip);
    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      window.removeEventListener('keydown', handleKeySkip);
    };
  }, [isOpen, finishIntro]);

  if (!isOpen) return null;

  return (
    <div
      onAnimationEnd={(e) => {
        if (e.animationName === 'vora-intro-overlay') {
          finishIntro();
        }
      }}
      style={
        timelineActive
          ? {
              animation: 'vora-intro-overlay 6.2s cubic-bezier(0.22, 1, 0.36, 1) 0s 1 both',
            }
          : { opacity: 1 }
      }
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center px-8 overflow-hidden select-none cursor-default will-change-[opacity]"
    >
      <div
        style={
          timelineActive
            ? {
                animation: 'vora-intro-stage 6.2s cubic-bezier(0.22, 1, 0.36, 1) 0s 1 both',
              }
            : { opacity: 0 }
        }
        className="relative flex flex-col items-center justify-center text-center will-change-[transform,opacity]"
      >
        {/* Monograma geométrico VORA dibujado con ritmo pausado y ligera separación cromática */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Capa cromática izquierda (cian sutil) */}
          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={
              timelineActive
                ? {
                    animation:
                      'vora-intro-chroma-l 2.8s cubic-bezier(0.22, 1, 0.36, 1) 1.05s 1 both',
                  }
                : { opacity: 0 }
            }
            className="absolute inset-0 w-20 h-20 text-cyan-400 mix-blend-screen pointer-events-none will-change-[transform,opacity]"
          >
            <path
              d="M5.5 10L18 27.5L30.5 10"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="currentColor"
            />
          </svg>

          {/* Capa cromática derecha (coral sutil) */}
          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={
              timelineActive
                ? {
                    animation:
                      'vora-intro-chroma-r 2.8s cubic-bezier(0.22, 1, 0.36, 1) 1.05s 1 both',
                  }
                : { opacity: 0 }
            }
            className="absolute inset-0 w-20 h-20 text-rose-400 mix-blend-screen pointer-events-none will-change-[transform,opacity]"
          >
            <path
              d="M5.5 10L18 27.5L30.5 10"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="currentColor"
            />
          </svg>

          {/* Trazo principal blanco puro + acento limpio de color hacia el final */}
          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative w-20 h-20 text-white"
            aria-hidden="true"
          >
            <path
              d="M5.5 10L18 27.5"
              pathLength={100}
              strokeDasharray="100"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="currentColor"
              style={
                timelineActive
                  ? {
                      animation:
                        'vora-intro-stroke 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.45s 1 both',
                    }
                  : { strokeDashoffset: 100, opacity: 0 }
              }
            />
            <path
              d="M30.5 10L18 27.5"
              pathLength={100}
              strokeDasharray="100"
              strokeWidth="2.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="currentColor"
              style={
                timelineActive
                  ? {
                      animation:
                        'vora-intro-stroke 1.15s cubic-bezier(0.22, 1, 0.36, 1) 1.0s 1 both',
                    }
                  : { strokeDashoffset: 100, opacity: 0 }
              }
            />
            <path
              d="M11.5 10L18 19.2L24.5 10"
              pathLength={100}
              strokeDasharray="100"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="currentColor"
              strokeOpacity="0.46"
              style={
                timelineActive
                  ? {
                      animation:
                        'vora-intro-stroke 1.1s cubic-bezier(0.22, 1, 0.36, 1) 1.65s 1 both',
                    }
                  : { strokeDashoffset: 100, opacity: 0 }
              }
            />
            <path
              d="M11.5 10L18 19.2L24.5 10"
              pathLength={100}
              strokeDasharray="100"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="#F59E0B"
              style={
                timelineActive
                  ? {
                      animation:
                        'vora-intro-amber-stroke 1.3s cubic-bezier(0.22, 1, 0.36, 1) 3.85s 1 both',
                    }
                  : { strokeDashoffset: 100, opacity: 0 }
              }
            />
          </svg>
        </div>

        {/* Logotipo VORA TV OS con aparición geométrica tranquila por partes y micro-separación cromática */}
        <div className="relative mt-5 flex items-center gap-3.5">
          <div
            aria-hidden="true"
            style={
              timelineActive
                ? {
                    animation:
                      'vora-intro-chroma-l 2.45s cubic-bezier(0.22, 1, 0.36, 1) 1.45s 1 both',
                  }
                : { opacity: 0 }
            }
            className="absolute inset-0 flex items-center justify-center gap-3.5 text-cyan-400 mix-blend-screen pointer-events-none will-change-[transform,opacity]"
          >
            <span className="font-display text-4xl sm:text-5xl font-bold tracking-[0.22em]">
              VORA
            </span>
            <span className="w-px h-6 bg-cyan-400/50" />
            <span className="font-display text-lg sm:text-xl font-medium tracking-[0.26em]">
              TV OS
            </span>
          </div>

          <div
            aria-hidden="true"
            style={
              timelineActive
                ? {
                    animation:
                      'vora-intro-chroma-r 2.45s cubic-bezier(0.22, 1, 0.36, 1) 1.45s 1 both',
                  }
                : { opacity: 0 }
            }
            className="absolute inset-0 flex items-center justify-center gap-3.5 text-rose-400 mix-blend-screen pointer-events-none will-change-[transform,opacity]"
          >
            <span className="font-display text-4xl sm:text-5xl font-bold tracking-[0.22em]">
              VORA
            </span>
            <span className="w-px h-6 bg-rose-400/50" />
            <span className="font-display text-lg sm:text-xl font-medium tracking-[0.26em]">
              TV OS
            </span>
          </div>

          <div className="relative flex items-center font-display text-4xl sm:text-5xl font-bold tracking-[0.22em] text-white">
            {VORA_LETTERS.map((letter) => (
              <span key={letter.char} className="inline-block overflow-hidden">
                <span
                  style={
                    timelineActive
                      ? {
                          animation: `${letter.anim} 1.05s cubic-bezier(0.22, 1, 0.36, 1) ${letter.delay} 1 both`,
                        }
                      : { opacity: 0 }
                  }
                  className="inline-block will-change-[transform,opacity]"
                >
                  {letter.char}
                </span>
              </span>
            ))}
          </div>

          <span
            aria-hidden="true"
            style={
              timelineActive
                ? {
                    animation:
                      'vora-intro-divider 0.8s cubic-bezier(0.22, 1, 0.36, 1) 2.95s 1 both',
                  }
                : { opacity: 0 }
            }
            className="w-px h-6 bg-white/30 origin-center will-change-[transform,opacity]"
          />

          <span className="relative inline-block overflow-hidden">
            <span
              style={
                timelineActive
                  ? {
                      animation:
                        'vora-intro-tvos 1.05s cubic-bezier(0.22, 1, 0.36, 1) 3.20s 1 both',
                    }
                  : { opacity: 0 }
              }
              className="inline-block font-display text-lg sm:text-xl font-medium tracking-[0.26em] text-zinc-300 will-change-[transform,opacity]"
            >
              TV OS
            </span>
            <span
              aria-hidden="true"
              style={
                timelineActive
                  ? {
                      animation:
                        'vora-intro-tvos-accent 1.3s cubic-bezier(0.22, 1, 0.36, 1) 3.85s 1 both',
                    }
                  : { opacity: 0 }
              }
              className="absolute inset-0 inline-block font-display text-lg sm:text-xl font-medium tracking-[0.26em] text-amber-400 pointer-events-none will-change-[opacity]"
            >
              TV OS
            </span>
          </span>
        </div>

        {/* Línea geométrica de acento cromático limpio hacia el final */}
        <div className="relative mt-4 w-40 h-[2px] overflow-hidden rounded-full bg-white/10">
          <div
            style={
              timelineActive
                ? {
                    animation:
                      'vora-intro-bar 1.3s cubic-bezier(0.22, 1, 0.36, 1) 3.85s 1 both',
                    backgroundImage:
                      'linear-gradient(90deg, #22D3EE 0%, #F59E0B 52%, #FB7185 100%)',
                  }
                : {
                    opacity: 0,
                    backgroundImage:
                      'linear-gradient(90deg, #22D3EE 0%, #F59E0B 52%, #FB7185 100%)',
                  }
            }
            className="w-full h-full origin-left will-change-[transform,opacity]"
          />
        </div>
      </div>
    </div>
  );
});
