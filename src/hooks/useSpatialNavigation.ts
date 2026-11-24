import { useEffect, useRef } from 'react';

interface SpatialNavigationOptions {
  enabled?: boolean;
  onBack?: () => void;
  scopeSelector?: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

function isHiddenByAncestors(el: HTMLElement): boolean {
  return Boolean(
    el.closest('[data-tv-hidden="true"]') ||
      el.closest('[aria-hidden="true"]') ||
      el.closest('[inert]')
  );
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
    if (el.tabIndex === -1 || isHiddenByAncestors(el)) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
  });
}

function pickClosestHorizontally(candidates: HTMLElement[], targetX: number): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const dist = Math.abs(cx - targetX);
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }
  return best;
}

function findNextInGrid(
  current: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right',
  rowCandidates: HTMLElement[]
): HTMLElement | null {
  const currRect = current.getBoundingClientRect();
  const currCx = currRect.left + currRect.width / 2;
  const currCy = currRect.top + currRect.height / 2;

  if (direction === 'left' || direction === 'right') {
    const sameBand = rowCandidates.filter((el) => {
      if (el === current) return false;
      const r = el.getBoundingClientRect();
      const cy = r.top + r.height / 2;
      const cx = r.left + r.width / 2;
      const sameRow = Math.abs(cy - currCy) < Math.max(48, currRect.height * 0.65);
      return sameRow && (direction === 'right' ? cx > currCx + 8 : cx < currCx - 8);
    });
    return pickClosestHorizontally(sameBand, currCx);
  }

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const el of rowCandidates) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dy = cy - currCy;
    if (direction === 'down' && dy <= 24) continue;
    if (direction === 'up' && dy >= -24) continue;

    const primary = Math.abs(dy);
    const secondary = Math.abs(cx - currCx);
    const score = primary + secondary * 1.4;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function findNextGeometric(
  current: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right',
  candidates: HTMLElement[]
): HTMLElement | null {
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

    const alignmentPenalty = hasPerpendicularOverlap ? secondaryDist * 0.45 : secondaryDist * 2.6;
    const score = primaryDist + alignmentPenalty;

    if (score < bestScore) {
      bestScore = score;
      bestEl = el;
    }
  }

  return bestEl;
}

function findNextElement(
  current: HTMLElement | null,
  direction: 'up' | 'down' | 'left' | 'right',
  candidates: HTMLElement[],
  scopeSelector?: string
): HTMLElement | null {
  if (candidates.length === 0) return null;
  if (!current || !candidates.includes(current)) {
    return candidates.find((c) => c.dataset.tvInitial === 'true') || candidates[0];
  }

  const currentRow = current.closest<HTMLElement>('[data-tv-row]');
  if (currentRow) {
    const root: ParentNode = scopeSelector
      ? document.querySelector(scopeSelector) || document
      : document;

    const candidateSet = new Set(candidates);
    const allRows = Array.from(root.querySelectorAll<HTMLElement>('[data-tv-row]'))
      .map((rowEl) => ({
        rowEl,
        items: Array.from(rowEl.querySelectorAll<HTMLElement>('[data-tv-focusable="true"]')).filter(
          (el) => candidateSet.has(el)
        ),
      }))
      .filter((entry) => entry.items.length > 0);

    const rowIndex = allRows.findIndex((entry) => entry.rowEl === currentRow);
    if (rowIndex !== -1) {
      const currentEntry = allRows[rowIndex];
      const isGrid = currentRow.dataset.tvRowType === 'grid';

      if (direction === 'left' || direction === 'right') {
        if (isGrid) {
          return findNextInGrid(current, direction, currentEntry.items);
        }
        const currRect = current.getBoundingClientRect();
        const currCx = currRect.left + currRect.width / 2;
        const directional = currentEntry.items.filter((el) => {
          if (el === current) return false;
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          return direction === 'right' ? cx > currCx + 4 : cx < currCx - 4;
        });
        return pickClosestHorizontally(directional, currCx);
      }

      if (isGrid) {
        const insideGrid = findNextInGrid(current, direction, currentEntry.items);
        if (insideGrid) return insideGrid;
      }

      const targetIndex = direction === 'up' ? rowIndex - 1 : rowIndex + 1;
      if (targetIndex < 0 || targetIndex >= allRows.length) {
        return null;
      }

      const targetEntry = allRows[targetIndex];
      const currRect = current.getBoundingClientRect();
      const currCx = currRect.left + currRect.width / 2;

      if (targetEntry.rowEl.dataset.tvRowType === 'grid') {
        const ys = targetEntry.items.map((el) => el.getBoundingClientRect().top);
        const edgeY = direction === 'down' ? Math.min(...ys) : Math.max(...ys);
        const edgeItems = targetEntry.items.filter(
          (el) => Math.abs(el.getBoundingClientRect().top - edgeY) < 40
        );
        return pickClosestHorizontally(
          edgeItems.length > 0 ? edgeItems : targetEntry.items,
          currCx
        );
      }

      return pickClosestHorizontally(targetEntry.items, currCx);
    }
  }

  return findNextGeometric(current, direction, candidates);
}

function findVerticalScrollContainer(el: HTMLElement): HTMLElement | null {
  const tagged = el.closest<HTMLElement>('[data-tv-scroll-container="true"]');
  if (tagged) return tagged;

  // Fallback: detectar cualquier contenedor ascendente con scroll vertical activo
  let curr = el.parentElement;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    const style = window.getComputedStyle(curr);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      curr.scrollHeight > curr.clientHeight
    ) {
      return curr;
    }
    curr = curr.parentElement;
  }
  return null;
}

function findHorizontalRail(el: HTMLElement): HTMLElement | null {
  const row = el.closest<HTMLElement>('[data-tv-row]');
  if (row && row.scrollWidth > row.clientWidth + 4) {
    return row;
  }
  return null;
}

// Desplazamiento nativo por compositor de Chromium: lecturas agrupadas antes de escribir para evitar reflow
function scrollFocusedElementIntoView(el: HTMLElement, instant = false) {
  const behavior: ScrollBehavior =
    instant || prefersReducedMotion() ? 'auto' : 'smooth';
  const visualBox = el.querySelector<HTMLElement>('[data-tv-focus-box="true"]') || el;
  const vParent = findVerticalScrollContainer(el);
  const hRail = findHorizontalRail(el);

  let nextScrollTop: number | null = null;
  let nextScrollLeft: number | null = null;

  // Fase 1: Lectura única de geometría
  const boxRect = visualBox.getBoundingClientRect();

  if (vParent) {
    if (el.closest('[data-tv-scroll-top="true"]')) {
      if (vParent.scrollTop > 1) {
        nextScrollTop = 0;
      }
    } else {
      const parentRect = vParent.getBoundingClientRect();
      const needsScrollDown = boxRect.bottom > parentRect.bottom - 18;
      const needsScrollUp = boxRect.top < parentRect.top + 84;

      if (needsScrollDown || needsScrollUp) {
        const desiredTop =
          parentRect.top + Math.max(92, Math.min(180, (parentRect.height - boxRect.height) * 0.35));
        const deltaY = boxRect.top - desiredTop;
        const maxTop = Math.max(0, vParent.scrollHeight - vParent.clientHeight);
        const rawNext = vParent.scrollTop + deltaY;
        nextScrollTop = Math.min(maxTop, Math.max(0, rawNext < 72 ? 0 : rawNext));
      }
    }
  }

  if (hRail) {
    const railRect = hRail.getBoundingClientRect();
    const boxCenter = boxRect.left + boxRect.width / 2;
    const railCenter = railRect.left + railRect.width / 2;
    const deltaX = boxCenter - railCenter;
    if (Math.abs(deltaX) > 24) {
      const maxLeft = Math.max(0, hRail.scrollWidth - hRail.clientWidth);
      nextScrollLeft = Math.min(maxLeft, Math.max(0, hRail.scrollLeft + deltaX));
    }
  }

  // Fase 2: Escrituras agrupadas
  if (vParent && nextScrollTop !== null) {
    vParent.scrollTo({ top: nextScrollTop, behavior });
  }
  if (hRail && nextScrollLeft !== null) {
    hRail.scrollTo({ left: nextScrollLeft, behavior });
  }
}

export function focusElementById(id: string): boolean {
  const el = document.querySelector<HTMLElement>(`[data-tv-id="${id}"]`);
  if (el && !isHiddenByAncestors(el)) {
    el.focus({ preventScroll: true });
    scrollFocusedElementIntoView(el);
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

      if (isTextInput && key !== 'ArrowUp' && key !== 'ArrowDown') {
        return;
      }

      let direction: 'up' | 'down' | 'left' | 'right' | null = null;
      if (key === 'ArrowUp' || code === 19) direction = 'up';
      else if (key === 'ArrowDown' || code === 20) direction = 'down';
      else if (key === 'ArrowLeft' || code === 21) direction = 'left';
      else if (key === 'ArrowRight' || code === 22) direction = 'right';

      if (direction) {
        e.preventDefault();
        const candidates = getFocusableElements(scopeSelector);
        const next = findNextElement(active, direction, candidates, scopeSelector);
        if (next) {
          next.focus({ preventScroll: true });
          scrollFocusedElementIntoView(next, e.repeat);
        } else if (candidates.length > 0 && (!active || !candidates.includes(active))) {
          const fallback =
            candidates.find((c) => c.dataset.tvInitial === 'true') || candidates[0];
          fallback.focus({ preventScroll: true });
          scrollFocusedElementIntoView(fallback, e.repeat);
        }
        return;
      }

      if (key === 'ContextMenu' || key === 'F2' || key === 'm' || key === 'M') {
        if (active && active.dataset.tvFocusable === 'true') {
          e.preventDefault();
          active.dispatchEvent(new CustomEvent('tv-longpress', { bubbles: true }));
        }
        return;
      }

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
