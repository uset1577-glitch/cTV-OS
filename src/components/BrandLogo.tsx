interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  forceLightText?: boolean;
}

export function BrandLogo({
  size = 'md',
  showWordmark = true,
  forceLightText = false,
}: BrandLogoProps) {
  const iconSize =
    size === 'lg' ? 'w-9 h-9' : size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0 select-none">
      {/* Monograma VORA minimalista de doble trazo paralelo */}
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSize} shrink-0`}
        aria-hidden="true"
      >
        <path
          d="M5.5 10L18 27.5L30.5 10"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            forceLightText
              ? 'stroke-white'
              : 'stroke-slate-900 dark:stroke-white'
          }
        />
        <path
          d="M11.5 10L18 19.2L24.5 10"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            forceLightText
              ? 'stroke-white/45'
              : 'stroke-slate-500/55 dark:stroke-white/45'
          }
        />
      </svg>

      {showWordmark && (
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <span
            className={`font-display text-[17px] font-bold tracking-[0.16em] leading-none ${
              forceLightText ? 'text-white' : 'text-slate-900 dark:text-white'
            }`}
          >
            VORA
          </span>
          <span
            aria-hidden="true"
            className={`w-px h-3.5 ${
              forceLightText
                ? 'bg-white/30'
                : 'bg-slate-900/20 dark:bg-white/25'
            }`}
          />
          <span
            className={`font-display text-[11px] font-medium tracking-[0.22em] leading-none ${
              forceLightText
                ? 'text-white/75'
                : 'text-slate-600 dark:text-zinc-400'
            }`}
          >
            TV OS
          </span>
        </div>
      )}
    </div>
  );
}
