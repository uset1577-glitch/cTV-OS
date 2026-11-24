import { useEffect, useRef } from 'react';

interface SpatialNavigationOptions {
  enabled?: boolean;
  onBack?: () => void;
  scopeSelector?: string;
}

const activeScrollRafs = new WeakMap<HTMLElement, number>();
let activeGliderRaf = 0;
let activeGliderEl: HTMLDivElement | null = null;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 3.6);
}

function animateScrollAxis(
  container: HTMLElement,
  axis: 'top' | 'left',
  target: number,
  durationMs: number
) {
  const maxScroll =
    axis === 'top'
      ? Math.max(0, container.scrollHeight - container.clientHeight)
      : Math.max(0, container.scrollWidth - container.clientWidth);
  const clampedTarget = Math.min(maxScroll, Math.max(0, target));
  const start = axis === 'top' ? container.scrollTop : container.scrollLeft;

  const existingRaf = activeScrollRafs.get(container);
  if (existingRaf) {
    window.cancelAnimationFrame(existingRaf);
    activeScrollRafs.delete(container);
  }

  if (Math.abs(clampedTarget - start) < 1 || prefersReducedMotion()) {
    if (axis === 'top') container.scrollTop = clampedTarget;
    else container.scrollLeft = clampedTarget;
    return;
  }

  const startTime = performance.now();
  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    const eased = easeOutQuart(progress);
    const nextVal = start + (clampedTarget - start) * eased;

    if (axis === 'top') container.scrollTop = nextVal;
    else container.scrollLeft = nextVal;

    if (progress < 1) {
      const id = window.requestAnimationFrame(step);
      activeScrollRafs.set(container, id);
    } else {
      activeScrollRafs.delete(container);
    }
  };

  const id = window.requestAnimationFrame(step);
  activeScrollRafs.set(container, id);
}

function getVisualFocusBox(el: HTMLElement): HTMLElement {
  return el.querySelector<HTMLElement>('[data-tv-focus-box="true"]') || el;
}

function parseRadiusPx(radiusStr: string, minSide: number): number {
  if (!radiusStr) return 14;
  const first = radiusStr.split(' ')[0] || '14px';
  if (first.endsWith('%')) {
    return (parseFloat(first) / 100) * minSide;
  }
  const parsed = parseFloat(first);
  if (Number.isNaN(parsed)) return 14;
  return Math.min(parsed, minSide / 2);
}

function stopFocusGlider() {
  if (activeGliderRaf) {
    window.cancelAnimationFrame(activeGliderRaf);
    activeGliderRaf = 0;
  }
  if (activeGliderEl) {
    activeGliderEl.style.opacity = '0';
  }
}

function glideFocusRing(fromEl: HTMLElement | null, toEl: HTMLElement) {
  if (prefersReducedMotion() || !fromEl || fromEl === toEl) return;

  const fromBox = getVisualFocusBox(fromEl);
  const toBox = getVisualFocusBox(toEl);
  const fromRect = fromBox.getBoundingClientRect();
  if (fromRect.width <= 0 || fromRect.height <= 0) return;

  const fromStyle = window.getComputedStyle(fromBox);
  const toStyle = window.getComputedStyle(toBox);
  const fromRadius = parseRadiusPx(
    fromStyle.borderRadius,
    Math.min(fromRect.width, fromRect.height)
  );

  if (!activeGliderEl) {
    const div = document.createElement('div');
    div.setAttribute('data-tv-focus-glider', 'true');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.pointerEvents = 'none';
    div.style.zIndex = '9999';
    div.style.border = '2.5px solid rgba(251, 191, 36, 0.95)';
    div.style.willChange = 'transform, width, height, border-radius, opacity';
    div.style.opacity = '0';
    document.body.appendChild(div);
    activeGliderEl = div;
  }

  if (activeGliderRaf) {
    window.cancelAnimationFrame(activeGliderRaf);
  }

  const glider = activeGliderEl;
  const startTime = performance.now();
  const durationMs = 190;

  const step = (now: number) => {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / durationMs);
    const eased = easeOutCubic(t);

    const liveToRect = toBox.getBoundingClientRect();
    if (liveToRect.width <= 0 || liveToRect.height <= 0) {
      glider.style.opacity = '0';
      activeGliderRaf = 0;
      return;
    }

    const toRadius = parseRadiusPx(
      toStyle.borderRadius,
      Math.min(liveToRect.width, liveToRect.height)
    );

    const x = fromRect.left + (liveToRect.left - fromRect.left) * eased;
    const y = fromRect.top + (liveToRect.top - fromRect.top) * eased;
    const w = fromRect.width + (liveToRect.width - fromRect.width) * eased;
    const h = fromRect.height + (liveToRect.height - fromRect.height) * eased;
    const r = fromRadius + (toRadius - fromRadius) * eased;

    // Se desvanece con suavidad al llegar y ceder el foco a la tarjeta destino
    const opacity = t < 0.72 ? 0.95 : Math.max(0, 0.95 * (1 - (t - 0.72) / 0.28));

    glider.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    glider.style.width = `${w.toFixed(1)}px`;
    glider.style.height = `${h.toFixed(1)}px`;
    glider.style.borderRadius = `${r.toFixed(1)}px`;
    glider.style.opacity = opacity.toFixed(3);

    if (t < 1) {
      activeGliderRaf = window.requestAnimationFrame(step);
    } else {
      glider.style.opacity = '0';
      activeGliderRaf = 0;
    }
  };

  activeGliderRaf = window.requestAnimationFrame(step);
}

function isHiddenByAncestors(el: HTMLElement): boolean {
  if (
    el.closest('[data-tv-hidden="true"]') ||
    el.closest('[aria-hidden="true"]') ||
    el.closest('[inert]')
  ) {
    return true;
  }
  return false;
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

      // Vertical: intentar moverse dentro del grid si aplica; si no, pasar estrictamente a la fila adyacente
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
  const marked = el.closest<HTMLElement>('[data-tv-scroll-container="true"]');
  if (marked) return marked;

  let parent = el.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      parent.scrollHeight > parent.clientHeight + 4
    ) {
      return parent;
    }
    parent = parent.parentElement;
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

function scrollFocusedElementIntoView(el: HTMLElement) {
  const visualBox = getVisualFocusBox(el);
  const vParent = findVerticalScrollContainer(el);

  if (vParent) {
    if (el.closest('[data-tv-scroll-top="true"]')) {
      animateScrollAxis(vParent, 'top', 0, 240);
    } else {
      const parentRect = vParent.getBoundingClientRect();
      const boxRect = visualBox.getBoundingClientRect();

      // Solo desplazar si el elemento queda cerca/fuera del margen cómodo vertical
      const needsScrollDown = boxRect.bottom > parentRect.bottom - 20;
      const needsScrollUp = boxRect.top < parentRect.top + 84;

      if (needsScrollDown || needsScrollUp) {
        const desiredTop =
          parentRect.top + Math.max(92, Math.min(180, (parentRect.height - boxRect.height) * 0.36));
        const deltaY = boxRect.top - desiredTop;
        const nextTop = vParent.scrollTop + deltaY;
        animateScrollAxis(vParent, 'top', nextTop < 72 ? 0 : nextTop, 240);
      }
    }
  }

  const hRail = findHorizontalRail(el);
  if (hRail) {
    const railRect = hRail.getBoundingClientRect();
    const boxRect = visualBox.getBoundingClientRect();
    const boxCenter = boxRect.left + boxRect.width / 2;
    const railCenter = railRect.left + railRect.width / 2;
    const deltaX = boxCenter - railCenter;
    animateScrollAxis(hRail, 'left', hRail.scrollLeft + deltaX, 180);
  }
}

export function focusElementById(id: string): boolean {
  const el = document.querySelector<HTMLElement>(`[data-tv-id="${id}"]`);
  if (el && !isHiddenByAncestors(el)) {
    const prev = document.activeElement as HTMLElement | null;
    el.focus({ preventScroll: true });
    scrollFocusedElementIntoView(el);
    if (prev && prev !== el) {
      glideFocusRing(prev, el);
    }
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
    if (!enabled) {
      stopFocusGlider();
      return;
    }

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
          const prevActive = active && candidates.includes(active) ? active : null;
          next.focus({ preventScroll: true });
          scrollFocusedElementIntoView(next);
          glideFocusRing(prevActive, next);
        } else if (candidates.length > 0 && (!active || !candidates.includes(active))) {
          const fallback =
            candidates.find((c) => c.dataset.tvInitial === 'true') || candidates[0];
          fallback.focus({ preventScroll: true });
          scrollFocusedElementIntoView(fallback);
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
      stopFocusGlider();
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, scopeSelector]);
}
