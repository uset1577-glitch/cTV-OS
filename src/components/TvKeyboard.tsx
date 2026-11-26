import { memo, useEffect, useRef, useState } from 'react';
import { ArrowUp, CornerDownLeft, Delete, Eraser, Space } from 'lucide-react';

interface TvKeyboardProps {
  query: string;
  recentSearches?: string[];
  onAppendChar: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  onSelectRecent?: (term: string) => void;
}

type KeyboardMode = 'letters' | 'symbols';

const NUMBER_ROW = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

const LETTER_ROW_1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const LETTER_ROW_2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'];
const LETTER_ROW_3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm', '-', '.'];

const SYMBOL_ROW_1 = ['á', 'é', 'í', 'ó', 'ú', 'ü', '@', '#', '&', '?'];
const SYMBOL_ROW_2 = ['!', ':', ';', "'", '"', '(', ')', '/', '+', '_'];
const SYMBOL_ROW_3 = ['¿', '¡', '*', '%', '=', ',', '$', '-', '.'];

const KEY_BASE_CLASS =
  'tv-focusable min-h-[44px] h-11 rounded-xl flex items-center justify-center font-display text-[15px] font-semibold select-none border transition-colors bg-white/85 dark:bg-white/[0.08] border-zinc-900/10 dark:border-white/10 text-zinc-900 dark:text-zinc-100 hover:bg-white dark:hover:bg-white/[0.15] focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:border-transparent focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:scale-[1.06] active:scale-95';

const ACTION_KEY_CLASS =
  'tv-focusable min-h-[44px] h-11 rounded-xl flex items-center justify-center gap-1.5 px-3 font-sans text-xs font-semibold select-none border transition-colors bg-zinc-300/80 dark:bg-white/[0.12] border-zinc-900/10 dark:border-white/12 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-white/[0.18] focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:border-transparent focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:scale-[1.05] active:scale-95 whitespace-nowrap';

export const TvKeyboard = memo(function TvKeyboard({
  query,
  recentSearches = [],
  onAppendChar,
  onBackspace,
  onClear,
  onSubmit,
  onSelectRecent,
}: TvKeyboardProps) {
  const [mode, setMode] = useState<KeyboardMode>('letters');
  const [shift, setShift] = useState(false);
  const backspaceRef = useRef<HTMLButtonElement | null>(null);
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  useEffect(() => {
    const btn = backspaceRef.current;
    if (!btn) return;
    const handleLongPress = () => {
      onClearRef.current();
    };
    btn.addEventListener('tv-longpress', handleLongPress);
    return () => btn.removeEventListener('tv-longpress', handleLongPress);
  }, []);

  const formatChar = (ch: string) => (shift && mode === 'letters' ? ch.toUpperCase() : ch);

  const handleKeyPress = (rawChar: string) => {
    const out = formatChar(rawChar);
    onAppendChar(out);
    if (shift && mode === 'letters') {
      setShift(false);
    }
  };

  const row1 = mode === 'letters' ? LETTER_ROW_1 : SYMBOL_ROW_1;
  const row2 = mode === 'letters' ? LETTER_ROW_2 : SYMBOL_ROW_2;
  const row3 = mode === 'letters' ? LETTER_ROW_3 : SYMBOL_ROW_3;

  return (
    <div
      className="flex flex-col gap-2 p-3.5 rounded-2xl bg-zinc-200/75 dark:bg-white/[0.04] border border-zinc-900/10 dark:border-white/10"
      aria-label="Teclado en pantalla VORA"
    >
      {/* Fila 0: Números + Retroceso */}
      <div
        data-tv-row="kb-row-0"
        data-tv-no-memory="true"
        data-tv-allow-horizontal-exit="true"
        className="grid grid-cols-12 gap-1.5"
      >
        {NUMBER_ROW.map((num, idx) => (
          <button
            key={idx}
            type="button"
            data-tv-focusable="true"
            data-tv-id={`kb-key-${num}`}
            data-kb-char="true"
            onClick={() => onAppendChar(num)}
            className={`${KEY_BASE_CLASS} font-mono-tabular col-span-1`}
          >
            {num}
          </button>
        ))}
        <button
          ref={backspaceRef}
          type="button"
          data-tv-focusable="true"
          data-tv-supports-longpress="true"
          data-tv-id="kb-backspace"
          onClick={onBackspace}
          aria-label="Borrar carácter (mantén pulsado para limpiar)"
          title="Borrar (mantén OK para limpiar todo)"
          className={`${ACTION_KEY_CLASS} col-span-2 px-2`}
        >
          <Delete className="w-4 h-4 shrink-0" />
        </button>
      </div>

      {/* Fila 1 */}
      <div
        data-tv-row="kb-row-1"
        data-tv-no-memory="true"
        data-tv-allow-horizontal-exit="true"
        className="grid grid-cols-10 gap-1.5"
      >
        {row1.map((ch, idx) => {
          const display = formatChar(ch);
          return (
            <button
              key={idx}
              type="button"
              data-tv-focusable="true"
              data-tv-id={`kb-r1-${idx}`}
              data-kb-char="true"
              onClick={() => handleKeyPress(ch)}
              className={KEY_BASE_CLASS}
            >
              {display}
            </button>
          );
        })}
      </div>

      {/* Fila 2 */}
      <div
        data-tv-row="kb-row-2"
        data-tv-no-memory="true"
        data-tv-allow-horizontal-exit="true"
        className="grid grid-cols-10 gap-1.5"
      >
        {row2.map((ch, idx) => {
          const display = formatChar(ch);
          return (
            <button
              key={idx}
              type="button"
              data-tv-focusable="true"
              data-tv-initial={idx === 4 ? 'true' : undefined}
              data-tv-id={`kb-r2-${idx}`}
              data-kb-char="true"
              onClick={() => handleKeyPress(ch)}
              className={KEY_BASE_CLASS}
            >
              {display}
            </button>
          );
        })}
      </div>

      {/* Fila 3: Modificador estable + 9 teclas */}
      <div
        data-tv-row="kb-row-3"
        data-tv-no-memory="true"
        data-tv-allow-horizontal-exit="true"
        className="grid grid-cols-10 gap-1.5"
      >
        <button
          key="kb-r3-mod"
          type="button"
          data-tv-focusable="true"
          data-tv-id="kb-r3-mod"
          onClick={() => {
            if (mode === 'letters') {
              setShift((prev) => !prev);
            } else {
              setMode('letters');
            }
          }}
          aria-label={
            mode === 'letters'
              ? shift
                ? 'Desactivar mayúsculas'
                : 'Activar mayúsculas'
              : 'Volver a letras'
          }
          aria-pressed={mode === 'letters' ? shift : undefined}
          className={`${ACTION_KEY_CLASS} px-1 text-[11px] ${
            mode === 'letters' && shift
              ? '!bg-zinc-900 !text-white dark:!bg-white dark:!text-zinc-950'
              : ''
          }`}
        >
          {mode === 'letters' ? (
            <ArrowUp className="w-4 h-4 shrink-0 stroke-[2.4]" />
          ) : (
            <span>ABC</span>
          )}
        </button>

        {row3.map((ch, idx) => {
          const display = formatChar(ch);
          return (
            <button
              key={idx}
              type="button"
              data-tv-focusable="true"
              data-tv-id={`kb-r3-${idx}`}
              data-kb-char="true"
              onClick={() => handleKeyPress(ch)}
              className={KEY_BASE_CLASS}
            >
              {display}
            </button>
          );
        })}
      </div>

      {/* Fila 4: Controles inferiores */}
      <div
        data-tv-row="kb-row-4"
        data-tv-no-memory="true"
        data-tv-allow-horizontal-exit="true"
        className="grid grid-cols-12 gap-1.5 pt-0.5"
      >
        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="kb-mode-toggle"
          onClick={() => setMode((prev) => (prev === 'letters' ? 'symbols' : 'letters'))}
          className={`${ACTION_KEY_CLASS} col-span-3`}
        >
          <span>{mode === 'letters' ? '123 / á' : 'ABC'}</span>
        </button>

        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="kb-space"
          onClick={() => onAppendChar(' ')}
          aria-label="Espacio"
          className={`${KEY_BASE_CLASS} col-span-4 gap-1.5 text-xs`}
        >
          <Space className="w-4 h-4 shrink-0 opacity-75" />
          <span>Espacio</span>
        </button>

        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="kb-clear"
          onClick={() => {
            if (query) onClear();
          }}
          aria-label="Limpiar búsqueda"
          className={`${ACTION_KEY_CLASS} col-span-2 px-2 ${
            !query ? 'opacity-45' : ''
          }`}
        >
          <Eraser className="w-4 h-4 shrink-0" />
        </button>

        <button
          type="button"
          data-tv-focusable="true"
          data-tv-id="kb-submit"
          onClick={onSubmit}
          className="tv-focusable min-h-[44px] h-11 col-span-3 rounded-xl flex items-center justify-center gap-1.5 px-3 font-sans text-xs font-bold select-none bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-200 dark:focus:ring-offset-zinc-950 focus:scale-[1.05] active:scale-95 whitespace-nowrap"
        >
          <span>Ir</span>
          <CornerDownLeft className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>

      {/* Búsquedas recientes rápidas */}
      {recentSearches.length > 0 && onSelectRecent && (
        <div className="pt-2 mt-0.5 border-t border-zinc-900/10 dark:border-white/10">
          <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2">
            Búsquedas recientes
          </div>
          <div
            data-tv-row="kb-recent"
            data-tv-no-memory="true"
            data-tv-allow-horizontal-exit="true"
            className="flex flex-wrap gap-1.5"
          >
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                data-tv-focusable="true"
                data-tv-id={`kb-recent-${term}`}
                onClick={() => onSelectRecent(term)}
                className="tv-focusable min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium bg-white/75 dark:bg-white/[0.07] border border-zinc-900/10 dark:border-white/10 text-zinc-800 dark:text-zinc-200 focus:bg-zinc-900 focus:text-white dark:focus:bg-white dark:focus:text-zinc-950 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white focus:scale-105 truncate max-w-[140px]"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
