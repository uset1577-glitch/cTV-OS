import { useEffect, useRef } from 'react';

interface SpatialNavigationOptions {
  enabled?: boolean;
  onBack?: () => void;
  scopeSelector?: string;
}

function getFocusableElements(scopeSelector?: string): HTMLElement[] {
  const root: ParentNode = scopeSelector
    ? document.querySelector(scopeSelector) || document
    : document;

  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-tv-focusable="true"]'));
  return nodes.filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
  });
}

function findNextElement(
  current: HTMLElement | null,
  direction: 'up' | 'down' | 'left' | 'right',
  candidates: HTMLElement[]
): HTMLElement | null {
  if (candidates.length === 0) return null;
  if (!current || !candidates.includes(current)) {
    return candidates[0];
  }

  const currRect = current.getBoundingClientRect();
  const currCx = currRect.left + currRect.width / 2;
  const currCy = currRect.top + currRect.height / 2;

  let bestEl: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of candidates) {
    if (el === current) continue;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = cx - currCx;
    const dy = cy - currCy;

    let isValidDirection = false;
    let primaryDist = 0;
    let secondaryDist = 0;
    let hasPerpendicularOverlap = false;

    if (direction === 'right') {
      isValidDirection = dx > 8;
      primaryDist = dx;
      secondaryDist = Math.abs(dy);
      hasPerpendicularOverlap =
        Math.min(currRect.bottom, rect.bottom) - Math.max(currRect.top, rect.top) > 6;
    } else if (direction === 'left') {
      isValidDirection = dx < -8;
      primaryDist = -dx;
      secondaryDist = Math.abs(dy);
      hasPerpendicularOverlap =
        Math.min(currRect.bottom, rect.bottom) - Math.max(currRect.top, rect.top) > 6;
    } else if (direction === 'down') {
      isValidDirection = dy > 8;
      primaryDist = dy;
      secondaryDist = Math.abs(dx);
      hasPerpendicularOverlap =
        Math.min(currRect.right, rect.right) - Math.max(currRect.left, rect.left) > 6;
    } else {
      isValidDirection = dy < -8;
      primaryDist = -dy;
      secondaryDist = Math.abs(dx);
      hasPerpendicularOverlap =
        Math.min(currRect.right, rect.right) - Math.max(currRect.left, rect.left) > 6;
    }

    if (!isValidDirection) continue;

    // Prioritize items sharing the same row/column band for predictable TV navigation
    const alignmentPenalty = hasPerpendicularOverlap ? secondaryDist * 0.45 : secondaryDist * 2.6;
    const score = primaryDist + alignmentPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestEl = el;
    }
  }

  return bestEl;
}

export function focusElementById(id: string): boolean {
  const el = document.querySelector<HTMLElement>(`[data-tv-id="${id}"]`);
  if (el) {
    el.focus({ preventScroll: false });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    return true;
  }
  return false;
}

export function useSpatialNavigation({
  enabled = true,
  onBack,
  scopeSelector,
}: SpatialNavigationOptions) {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled) return;

    // Ensure initial focus exists inside active scope
    const ensureFocus = () => {
      const candidates = getFocusableElements(scopeSelector);
      const active = document.activeElement as HTMLElement | null;
      if (candidates.length > 0 && (!active || !candidates.includes(active))) {
        const preferred =
          candidates.find((c) => c.dataset.tvInitial === 'true') || candidates[0];
        preferred.focus({ preventScroll: true });
      }
    };

    const rafId = window.requestAnimationFrame(ensureFocus);

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isTextInput =
        active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') &&
        (active as HTMLInputElement).type !== 'button';

      // Map Android TV keyCodes as well as standard keyboard Arrow/Enter/Escape
      const key = e.key;
      const code = e.keyCode;

      if (key === 'Escape' || key === 'BrowserBack' || key === 'GoBack' || code === 4) {
        e.preventDefault();
        if (isTextInput) {
          active.blur();
        }
        onBackRef.current?.();
        return;
      }

      if (key === 'Backspace' && !isTextInput) {
        e.preventDefault();
        onBackRef.current?.();
        return;
      }

      if (isTextInput) {
        // Allow escaping out of an input with ArrowUp / ArrowDown
        if (key !== 'ArrowUp' && key !== 'ArrowDown') {
          return;
        }
      }

      let direction: 'up' | 'down' | 'left' | 'right' | null = null;
      if (key === 'ArrowUp' || code === 19) direction = 'up';
      else if (key === 'ArrowDown' || code === 20) direction = 'down';
      else if (key === 'ArrowLeft' || code === 21) direction = 'left';
      else if (key === 'ArrowRight' || code === 22) direction = 'right';

      if (direction) {
        e.preventDefault();
        const candidates = getFocusableElements(scopeSelector);
        const next = findNextElement(active, direction, candidates);
        if (next) {
          next.focus({ preventScroll: true });
          next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        } else if (candidates.length > 0 && (!active || !candidates.includes(active))) {
          candidates[0].focus({ preventScroll: true });
        }
        return;
      }

      // Context menu / 'M' / F2 shortcut for pinning favorites on remote
      if (key === 'ContextMenu' || key === 'F2' || key === 'm' || key === 'M') {
        if (active && active.dataset.tvFocusable === 'true') {
          e.preventDefault();
          active.dispatchEvent(new CustomEvent('tv-longpress', { bubbles: true }));
        }
        return;
      }

      // OK / Enter / DPAD_CENTER handling (supports short click + long press for Pin/Favorite)
      if (key === 'Enter' || key === ' ' || key === 'NumpadEnter' || code === 23 || code === 66) {
        if (active && active.dataset.tvFocusable === 'true') {
          e.preventDefault();
          if (e.repeat) return;

          longPressTriggeredRef.current = false;
          if (active.dataset.tvSupportsLongpress === 'true') {
            if (longPressTimerRef.current) {
              window.clearTimeout(longPressTimerRef.current);
            }
            longPressTimerRef.current = window.setTimeout(() => {
              longPressTriggeredRef.current = true;
              active.dispatchEvent(new CustomEvent('tv-longpress', { bubbles: true }));
            }, 520);
          } else {
            active.click();
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      const code = e.keyCode;
      if (key === 'Enter' || key === ' ' || key === 'NumpadEnter' || code === 23 || code === 66) {
        if (longPressTimerRef.current) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        const active = document.activeElement as HTMLElement | null;
        if (
          active &&
          active.dataset.tvFocusable === 'true' &&
          active.dataset.tvSupportsLongpress === 'true' &&
          !longPressTriggeredRef.current
        ) {
          active.click();
        }
        longPressTriggeredRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, scopeSelector]);
}
