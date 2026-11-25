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
  return Boolean(el.closest('[data-tv-hidden="true"], [aria-hidden="true"], [inert]'));
}

function getFocusableElements(
  scopeSelector?: string,
  rectCache?: Map<HTMLElement, DOMRect>
): HTMLElement[] {
  const root: ParentNode = scopeSelector
    ? document.querySelector(scopeSelector) || document
    : document;

  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-tv-focusable="true"]'));
  return nodes.filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
      return false;
    }
    if (el.tabIndex === -1 || el.offsetParent === null || isHiddenByAncestors(el)) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    if (rectCache) rectCache.set(el, rect);
    return rect.width > 0 && rect.height > 0;
  });
}

function getRect(el: HTMLElement, rectCache?: Map<HTMLElement, DOMRect>): DOMRect {
  const cached = rectCache?.get(el);
  if (cached) return cached;
  const r = el.getBoundingClientRect();
  rectCache?.set(el, r);
  return r;
}

function pickClosestHorizontally(
  candidates: HTMLElement[],
  targetX: number,
  rectCache?: Map<HTMLElement, DOMRect>
): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const el of candidates) {
    const rect = getRect(el, rectCache);
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
  rowCandidates: HTMLElement[],
  rectCache?: Map<HTMLElement, DOMRect>
): HTMLElement | null {
  const currRect = getRect(current, rectCache);
  const currCx = currRect.left + currRect.width / 2;
  const currCy = currRect.top + currRect.height / 2;

  if (direction === 'left' || direction === 'right') {
    const sameBand = rowCandidates.filter((el) => {
      if (el === current) return false;
      const r = getRect(el, rectCache);
      const cy = r.top + r.height / 2;
      const cx = r.left + r.width / 2;
      const sameRow = Math.abs(cy - currCy) < Math.max(48, currRect.height * 0.65);
      return sameRow && (direction === 'right' ? cx > currCx + 8 : cx < currCx - 8);
    });
    return pickClosestHorizontally(sameBand, currCx, rectCache);
  }

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const el of rowCandidates) {
    if (el === current) continue;
    const r = getRect(el, rectCache);
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
  candidates: HTMLElement[],
  rectCache?: Map<HTMLElement, DOMRect>
): HTMLElement | null {
  const currRect = getRect(current, rectCache);
  const currCx = currRect.left + currRect.width / 2;
  const currCy = currRect.top + currRect.height / 2;

  let bestEl: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of candidates) {
    if (el === current) continue;
    const rect = getRect(el, rectCache);
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

interface RowFocusMemory {
  tvId?: string;
  index: number;
  colIndex?: number;
  centerX: number;
}

function getRowVisibleItems(rowEl: HTMLElement): HTMLElement[] {
  return Array.from(rowEl.querySelectorAll<HTMLElement>('[data-tv-focusable="true"]')).filter(
    (el) => {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
        return false;
      }
      if (el.tabIndex === -1 || el.offsetParent === null || isHiddenByAncestors(el)) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
  );
}

function recordRowFocus(
  el: HTMLElement,
  rowMemory: Map<string, RowFocusMemory>,
  knownItems?: HTMLElement[],
  rectCache?: Map<HTMLElement, DOMRect>
) {
  const rowEl = el.closest<HTMLElement>('[data-tv-row]');
  if (!rowEl) return;
  const rowKey = rowEl.dataset.tvRow;
  if (!rowKey) return;

  const items = knownItems || getRowVisibleItems(rowEl);
  const index = items.indexOf(el);
  if (index === -1) return;

  const rect = getRect(el, rectCache);
  const centerX = rect.left + rect.width / 2;
  let colIndex: number | undefined;

  if (rowEl.dataset.tvRowType === 'grid') {
    const band = items
      .filter((item) => {
        const r = getRect(item, rectCache);
        return Math.abs(r.top - rect.top) < Math.max(36, rect.height * 0.6);
      })
      .sort((a, b) => getRect(a, rectCache).left - getRect(b, rectCache).left);
    const col = band.indexOf(el);
    if (col !== -1) {
      colIndex = col;
    }
  }

  rowMemory.set(rowKey, {
    tvId: el.dataset.tvId,
    index,
    colIndex,
    centerX,
  });
}

function restoreRowFocus(
  targetEntry: { rowEl: HTMLElement; items: HTMLElement[] },
  direction: 'up' | 'down',
  fallbackCenterX: number,
  rowMemory: Map<string, RowFocusMemory>,
  rectCache?: Map<HTMLElement, DOMRect>
): HTMLElement | null {
  const { rowEl, items } = targetEntry;
  if (items.length === 0) return null;

  const rowKey = rowEl.dataset.tvRow;
  const saved = rowKey ? rowMemory.get(rowKey) : undefined;

  if (rowEl.dataset.tvRowType === 'grid') {
    const ys = items.map((el) => getRect(el, rectCache).top);
    const edgeY = direction === 'down' ? Math.min(...ys) : Math.max(...ys);
    const edgeItems = items
      .filter((el) => Math.abs(getRect(el, rectCache).top - edgeY) < 40)
      .sort((a, b) => getRect(a, rectCache).left - getRect(b, rectCache).left);
    const pool = edgeItems.length > 0 ? edgeItems : items;

    if (saved) {
      if (saved.tvId) {
        const byId = pool.find((el) => el.dataset.tvId === saved.tvId);
        if (byId) return byId;
      }
      if (saved.colIndex !== undefined && saved.colIndex >= 0 && pool.length > 0) {
        return pool[Math.min(saved.colIndex, pool.length - 1)];
      }
      return pickClosestHorizontally(pool, saved.centerX, rectCache);
    }

    return pickClosestHorizontally(pool, fallbackCenterX, rectCache);
  }

  if (saved) {
    if (saved.tvId) {
      const byId = items.find((el) => el.dataset.tvId === saved.tvId);
      if (byId) return byId;
    }
    if (saved.index >= 0) {
      return items[Math.min(saved.index, items.length - 1)];
    }
    return pickClosestHorizontally(items, saved.centerX, rectCache);
  }

  return pickClosestHorizontally(items, fallbackCenterX, rectCache);
}

function findNextElement(
  current: HTMLElement | null,
  direction: 'up' | 'down' | 'left' | 'right',
  candidates: HTMLElement[],
  scopeSelector: string | undefined,
  rowMemory: Map<string, RowFocusMemory>,
  rectCache?: Map<HTMLElement, DOMRect>
): { next: HTMLElement | null; nextRowItems?: HTMLElement[] } {
  if (candidates.length === 0) return { next: null };
  if (!current || !candidates.includes(current)) {
    return { next: candidates.find((c) => c.dataset.tvInitial === 'true') || candidates[0] };
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
          return {
            next: findNextInGrid(current, direction, currentEntry.items, rectCache),
            nextRowItems: currentEntry.items,
          };
        }
        const currRect = getRect(current, rectCache);
        const currCx = currRect.left + currRect.width / 2;
        const directional = currentEntry.items.filter((el) => {
          if (el === current) return false;
          const r = getRect(el, rectCache);
          const cx = r.left + r.width / 2;
          return direction === 'right' ? cx > currCx + 4 : cx < currCx - 4;
        });
        return {
          next: pickClosestHorizontally(directional, currCx, rectCache),
          nextRowItems: currentEntry.items,
        };
      }

      if (isGrid) {
        const insideGrid = findNextInGrid(current, direction, currentEntry.items, rectCache);
        if (insideGrid) return { next: insideGrid, nextRowItems: currentEntry.items };
      }

      // Guardar la posición exacta en la fila actual antes de salir verticalmente
      recordRowFocus(current, rowMemory, currentEntry.items, rectCache);

      const targetIndex = direction === 'up' ? rowIndex - 1 : rowIndex + 1;
      if (targetIndex < 0 || targetIndex >= allRows.length) {
        return { next: null };
      }

      const targetEntry = allRows[targetIndex];
      const currRect = getRect(current, rectCache);
      const currCx = currRect.left + currRect.width / 2;

      return {
        next: restoreRowFocus(targetEntry, direction, currCx, rowMemory, rectCache),
        nextRowItems: targetEntry.items,
      };
    }
  }

  return { next: findNextGeometric(current, direction, candidates, rectCache) };
}

interface AxisScrollAnim {
  startPos: number;
  current: number;
  target: number;
  startTime: number;
  duration: number;
  retargeted: boolean;
  rafId: number;
  isAnimating: boolean;
}

const verticalScrollAnims = new WeakMap<HTMLElement, AxisScrollAnim>();
const horizontalScrollAnims = new WeakMap<HTMLElement, AxisScrollAnim>();
const boundScrollInterruptContainers = new WeakSet<HTMLElement>();

// Curva continua normalizada exactamente para que f(0)=0 y f(1)=1
function evalScrollCurve(t: number, retargeted: boolean): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (retargeted) {
    return 1 - Math.pow(1 - t, 3);
  }
  // Smoothstep cúbico ponderado hacia ease-out: f(0)=0, f'(0)=0.2, f(1)=1, f'(1)=0
  const s = t * t * (3 - 2 * t);
  const out = 1 - Math.pow(1 - t, 3);
  return s * 0.55 + out * 0.45;
}

function ensureInterruptListeners(container: HTMLElement) {
  if (boundScrollInterruptContainers.has(container)) return;
  boundScrollInterruptContainers.add(container);

  const cancelAnims = () => {
    const vAnim = verticalScrollAnims.get(container);
    if (vAnim && vAnim.isAnimating) {
      window.cancelAnimationFrame(vAnim.rafId);
      vAnim.isAnimating = false;
      vAnim.rafId = 0;
      vAnim.current = container.scrollTop;
      vAnim.target = container.scrollTop;
    }
    const hAnim = horizontalScrollAnims.get(container);
    if (hAnim && hAnim.isAnimating) {
      window.cancelAnimationFrame(hAnim.rafId);
      hAnim.isAnimating = false;
      hAnim.rafId = 0;
      hAnim.current = container.scrollLeft;
      hAnim.target = container.scrollLeft;
    }
  };

  container.addEventListener('wheel', cancelAnims, { passive: true });
  container.addEventListener('touchstart', cancelAnims, { passive: true });
}

function getPendingScrollDelta(container: HTMLElement, axis: 'top' | 'left'): number {
  const store = axis === 'top' ? verticalScrollAnims : horizontalScrollAnims;
  const anim = store.get(container);
  if (!anim || !anim.isAnimating) return 0;
  const currentPos = axis === 'top' ? container.scrollTop : container.scrollLeft;
  return anim.target - currentPos;
}

function animateContainerAxis(
  container: HTMLElement,
  axis: 'top' | 'left',
  targetPos: number,
  instant = false
) {
  const maxPos =
    axis === 'top'
      ? Math.max(0, container.scrollHeight - container.clientHeight)
      : Math.max(0, container.scrollWidth - container.clientWidth);
  const clampedTarget = Math.min(maxPos, Math.max(0, targetPos));
  const store = axis === 'top' ? verticalScrollAnims : horizontalScrollAnims;
  const existing = store.get(container);

  if (instant || prefersReducedMotion()) {
    if (existing?.isAnimating) {
      window.cancelAnimationFrame(existing.rafId);
      existing.isAnimating = false;
      existing.rafId = 0;
    }
    if (axis === 'top') {
      container.scrollTop = clampedTarget;
    } else {
      container.scrollLeft = clampedTarget;
    }
    return;
  }

  ensureInterruptListeners(container);

  const now = performance.now();
  const currentActual = axis === 'top' ? container.scrollTop : container.scrollLeft;
  const wasAnimating = Boolean(existing?.isAnimating);
  const currentPos = wasAnimating && existing ? existing.current : currentActual;

  if (Math.abs(clampedTarget - currentPos) < 0.75) {
    if (existing?.isAnimating) {
      window.cancelAnimationFrame(existing.rafId);
      existing.isAnimating = false;
      existing.rafId = 0;
    }
    if (axis === 'top') {
      container.scrollTop = clampedTarget;
    } else {
      container.scrollLeft = clampedTarget;
    }
    return;
  }

  // Duración corta y fluida (220-265 ms vertical, 200-235 ms horizontal)
  const duration = axis === 'top' ? (wasAnimating ? 215 : 250) : wasAnimating ? 185 : 220;

  const anim: AxisScrollAnim = existing || {
    startPos: currentPos,
    current: currentPos,
    target: clampedTarget,
    startTime: now,
    duration,
    retargeted: wasAnimating,
    rafId: 0,
    isAnimating: false,
  };

  anim.startPos = currentPos;
  anim.current = currentPos;
  anim.target = clampedTarget;
  anim.startTime = now;
  anim.duration = duration;
  anim.retargeted = wasAnimating;
  store.set(container, anim);

  if (anim.isAnimating) return;
  anim.isAnimating = true;

  const step = (frameNow: number) => {
    if (!anim.isAnimating || !container.isConnected) {
      anim.isAnimating = false;
      anim.rafId = 0;
      return;
    }

    const elapsed = frameNow - anim.startTime;
    const progress = Math.min(1, Math.max(0, elapsed / anim.duration));
    const eased = evalScrollCurve(progress, anim.retargeted);
    const nextPos = anim.startPos + (anim.target - anim.startPos) * eased;
    anim.current = nextPos;

    if (axis === 'top') {
      container.scrollTop = nextPos;
    } else {
      container.scrollLeft = nextPos;
    }

    if (progress >= 1) {
      anim.current = anim.target;
      anim.isAnimating = false;
      anim.rafId = 0;
      return;
    }

    anim.rafId = window.requestAnimationFrame(step);
  };

  anim.rafId = window.requestAnimationFrame(step);
}

export function smoothScrollVerticalTo(
  container: HTMLElement,
  targetTop: number,
  instant = false
) {
  animateContainerAxis(container, 'top', targetTop, instant);
}

function findVerticalScrollContainer(el: HTMLElement): HTMLElement | null {
  const tagged = el.closest<HTMLElement>('[data-tv-scroll-container="true"]');
  if (tagged) return tagged;

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

interface ScrollPlan {
  vParent: HTMLElement | null;
  nextScrollTop: number | null;
  hRail: HTMLElement | null;
  nextScrollLeft: number | null;
  maxDist: number;
}

// Fase 1 pura (solo lectura de geometría antes de mutar el foco, evitando forced reflows)
function computeScrollPlan(
  el: HTMLElement,
  rectCache?: Map<HTMLElement, DOMRect>
): ScrollPlan {
  const visualBox = el.querySelector<HTMLElement>('[data-tv-focus-box="true"]') || el;
  const vParent = findVerticalScrollContainer(el);
  const hRail = findHorizontalRail(el);

  let nextScrollTop: number | null = null;
  let nextScrollLeft: number | null = null;
  let distY = 0;
  let distX = 0;

  const boxRect = getRect(visualBox, rectCache);

  if (vParent) {
    const pendingY = getPendingScrollDelta(vParent, 'top');
    const projectedTop = boxRect.top - pendingY;
    const projectedBottom = boxRect.bottom - pendingY;
    const effectiveScrollTop = vParent.scrollTop + pendingY;

    if (el.closest('[data-tv-scroll-top="true"]')) {
      if (effectiveScrollTop > 1) {
        nextScrollTop = 0;
        distY = effectiveScrollTop;
      }
    } else {
      const parentRect = getRect(vParent, rectCache);
      const topSafeMargin = parentRect.top < 40 ? 88 : 20;
      const bottomSafeMargin = 24;
      const needsScrollDown = projectedBottom > parentRect.bottom - bottomSafeMargin;
      const needsScrollUp = projectedTop < parentRect.top + topSafeMargin;

      if (needsScrollDown || needsScrollUp) {
        const minInset = parentRect.top < 40 ? 96 : 24;
        const maxInset = parentRect.top < 40 ? 190 : 140;
        const desiredTop =
          parentRect.top +
          Math.max(minInset, Math.min(maxInset, (parentRect.height - boxRect.height) * 0.34));
        const deltaY = projectedTop - desiredTop;
        const maxTop = Math.max(0, vParent.scrollHeight - vParent.clientHeight);
        const rawNext = effectiveScrollTop + deltaY;
        nextScrollTop = Math.min(maxTop, Math.max(0, rawNext < 24 ? 0 : rawNext));
        distY = Math.abs(nextScrollTop - effectiveScrollTop);
      }
    }
  }

  if (hRail) {
    const pendingX = getPendingScrollDelta(hRail, 'left');
    const railRect = getRect(hRail, rectCache);
    const projectedLeft = boxRect.left - pendingX;
    const projectedRight = boxRect.right - pendingX;
    const boxCenter = projectedLeft + boxRect.width / 2;
    const railCenter = railRect.left + railRect.width / 2;
    const deltaX = boxCenter - railCenter;
    const clippedEdge =
      projectedLeft < railRect.left + 12 || projectedRight > railRect.right - 12;

    if (Math.abs(deltaX) > 20 || clippedEdge) {
      const maxLeft = Math.max(0, hRail.scrollWidth - hRail.clientWidth);
      const effectiveScrollLeft = hRail.scrollLeft + pendingX;
      nextScrollLeft = Math.min(maxLeft, Math.max(0, effectiveScrollLeft + deltaX));
      distX = Math.abs(nextScrollLeft - effectiveScrollLeft);
    }
  }

  return {
    vParent,
    nextScrollTop,
    hRail,
    nextScrollLeft,
    maxDist: Math.max(distY, distX),
  };
}

function applyScrollPlan(plan: ScrollPlan, instant = false) {
  if (plan.vParent && plan.nextScrollTop !== null) {
    animateContainerAxis(plan.vParent, 'top', plan.nextScrollTop, instant);
  }
  if (plan.hRail && plan.nextScrollLeft !== null) {
    animateContainerAxis(plan.hRail, 'left', plan.nextScrollLeft, instant);
  }
}

function scrollFocusedElementIntoView(el: HTMLElement, instant = false): number {
  const plan = computeScrollPlan(el);
  applyScrollPlan(plan, instant);
  return plan.maxDist;
}

export function focusElementById(id: string): boolean {
  const el = document.querySelector<HTMLElement>(`[data-tv-id="${id}"]`);
  if (el && !isHiddenByAncestors(el)) {
    const plan = computeScrollPlan(el);
    applyScrollPlan(plan, false);
    el.focus({ preventScroll: true });
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
  const rowMemoryRef = useRef<Map<string, RowFocusMemory>>(new Map());
  const lastFocusedRowKeyRef = useRef<string | null>(null);
  const pendingFocusElRef = useRef<HTMLElement | null>(null);
  const pendingFocusTimerRef = useRef<number | null>(null);
  const lastPointerDownAtRef = useRef<number>(0);
  const lastRememberedElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const clearPendingFocus = () => {
      if (pendingFocusTimerRef.current !== null) {
        window.clearTimeout(pendingFocusTimerRef.current);
        pendingFocusTimerRef.current = null;
      }
      pendingFocusElRef.current = null;
    };

    const rememberTarget = (
      el: HTMLElement,
      knownItems?: HTMLElement[],
      rectCache?: Map<HTMLElement, DOMRect>
    ) => {
      lastRememberedElRef.current = el;
      recordRowFocus(el, rowMemoryRef.current, knownItems, rectCache);
      const rowKey = el.closest<HTMLElement>('[data-tv-row]')?.dataset.tvRow;
      if (rowKey) {
        lastFocusedRowKeyRef.current = rowKey;
      }
    };

    const flushPendingFocus = (): HTMLElement | null => {
      const target = pendingFocusElRef.current;
      if (pendingFocusTimerRef.current !== null) {
        window.clearTimeout(pendingFocusTimerRef.current);
        pendingFocusTimerRef.current = null;
      }
      pendingFocusElRef.current = null;
      if (target && target.isConnected && !isHiddenByAncestors(target)) {
        target.focus({ preventScroll: true });
        rememberTarget(target);
        return target;
      }
      return null;
    };

    // Sincroniza el inicio del desplazamiento (250 ms) con el cambio de foco (~85 ms + 160 ms transición = 245 ms)
    const navigateToTarget = (
      next: HTMLElement,
      knownItems?: HTMLElement[],
      rectCache?: Map<HTMLElement, DOMRect>
    ) => {
      const plan = computeScrollPlan(next, rectCache);
      applyScrollPlan(plan, false);
      rememberTarget(next, knownItems, rectCache);

      if (plan.maxDist > 6 && !prefersReducedMotion()) {
        pendingFocusElRef.current = next;
        if (pendingFocusTimerRef.current === null) {
          const syncDelayMs = Math.min(88, Math.max(55, Math.round(plan.maxDist * 0.2)));
          pendingFocusTimerRef.current = window.setTimeout(() => {
            pendingFocusTimerRef.current = null;
            const target = pendingFocusElRef.current;
            pendingFocusElRef.current = null;
            if (target && target.isConnected && !isHiddenByAncestors(target)) {
              lastRememberedElRef.current = target;
              target.focus({ preventScroll: true });
            }
          }, syncDelayMs);
        }
      } else {
        clearPendingFocus();
        lastRememberedElRef.current = next;
        next.focus({ preventScroll: true });
      }
    };

    const restoreAfterDomChange = () => {
      if (pendingFocusElRef.current && pendingFocusElRef.current.isConnected) {
        return;
      }
      const rectCache = new Map<HTMLElement, DOMRect>();
      const candidates = getFocusableElements(scopeSelector, rectCache);
      if (candidates.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && active.isConnected && candidates.includes(active)) {
        return;
      }

      const root: ParentNode = scopeSelector
        ? document.querySelector(scopeSelector) || document
        : document;
      const candidateSet = new Set(candidates);

      if (lastFocusedRowKeyRef.current) {
        const allRows = Array.from(root.querySelectorAll<HTMLElement>('[data-tv-row]'))
          .map((rowEl) => ({
            rowEl,
            items: Array.from(rowEl.querySelectorAll<HTMLElement>('[data-tv-focusable="true"]')).filter(
              (el) => candidateSet.has(el)
            ),
          }))
          .filter((entry) => entry.items.length > 0);

        const preferredKey =
          lastFocusedRowKeyRef.current === 'series' &&
          !allRows.some((r) => r.rowEl.dataset.tvRow === 'series')
            ? 'series-filters'
            : lastFocusedRowKeyRef.current;

        const targetEntry = allRows.find((entry) => entry.rowEl.dataset.tvRow === preferredKey);
        if (targetEntry) {
          const saved = rowMemoryRef.current.get(preferredKey);
          const restored = restoreRowFocus(
            targetEntry,
            'down',
            saved?.centerX ?? window.innerWidth * 0.25,
            rowMemoryRef.current,
            rectCache
          );
          if (restored) {
            navigateToTarget(restored, targetEntry.items, rectCache);
            return;
          }
        }
      }

      const preferred =
        candidates.find((c) => c.dataset.tvInitial === 'true') || candidates[0];
      navigateToTarget(preferred, undefined, rectCache);
    };

    const ensureFocus = () => {
      if (pendingFocusElRef.current && pendingFocusElRef.current.isConnected) {
        return;
      }
      const candidates = getFocusableElements(scopeSelector);
      const active = document.activeElement as HTMLElement | null;
      if (candidates.length > 0 && (!active || !candidates.includes(active))) {
        restoreAfterDomChange();
      } else if (active && candidates.includes(active)) {
        rememberTarget(active);
      }
    };

    const rafId = window.requestAnimationFrame(ensureFocus);
    let mutationRafId = 0;

    const scopeRoot = scopeSelector
      ? document.querySelector(scopeSelector) || document.body
      : document.body;

    const observer =
      typeof MutationObserver !== 'undefined' && scopeRoot
        ? new MutationObserver(() => {
            if (pendingFocusElRef.current && pendingFocusElRef.current.isConnected) {
              return;
            }
            const active = document.activeElement as HTMLElement | null;
            if (active && active !== document.body && active.isConnected) {
              return;
            }
            if (mutationRafId) return;
            mutationRafId = window.requestAnimationFrame(() => {
              mutationRafId = 0;
              restoreAfterDomChange();
            });
          })
        : null;

    observer?.observe(scopeRoot, { childList: true, subtree: true });

    const handlePointerDown = () => {
      lastPointerDownAtRef.current = Date.now();
      clearPendingFocus();
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.dataset.tvFocusable !== 'true') return;
      if (scopeSelector) {
        const rootNode = document.querySelector(scopeSelector);
        if (rootNode && !rootNode.contains(target)) return;
      }
      if (lastRememberedElRef.current !== target) {
        rememberTarget(target);
      }

      const fromPointer = Date.now() - lastPointerDownAtRef.current < 320;
      if (!fromPointer && pendingFocusElRef.current !== target && lastRememberedElRef.current !== target) {
        scrollFocusedElementIntoView(target, false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const active =
        (pendingFocusElRef.current?.isConnected ? pendingFocusElRef.current : null) ||
        (document.activeElement as HTMLElement | null);
      const isTextInput =
        active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') &&
        (active as HTMLInputElement).type !== 'button';

      const key = e.key;
      const code = e.keyCode;

      if (key === 'Escape' || key === 'BrowserBack' || key === 'GoBack' || code === 4) {
        e.preventDefault();
        clearPendingFocus();
        if (isTextInput) {
          active.blur();
        }
        onBackRef.current?.();
        return;
      }

      if (key === 'Backspace' && !isTextInput) {
        e.preventDefault();
        clearPendingFocus();
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
        const rectCache = new Map<HTMLElement, DOMRect>();
        const candidates = getFocusableElements(scopeSelector, rectCache);
        const { next, nextRowItems } = findNextElement(
          active,
          direction,
          candidates,
          scopeSelector,
          rowMemoryRef.current,
          rectCache
        );
        if (next) {
          navigateToTarget(next, nextRowItems, rectCache);
        } else if (candidates.length > 0 && (!active || !candidates.includes(active))) {
          restoreAfterDomChange();
        }
        return;
      }

      if (key === 'ContextMenu' || key === 'F2' || key === 'm' || key === 'M') {
        const target = flushPendingFocus() || active;
        if (target && target.dataset.tvFocusable === 'true') {
          e.preventDefault();
          target.dispatchEvent(new CustomEvent('tv-longpress', { bubbles: true }));
        }
        return;
      }

      if (key === 'Enter' || key === ' ' || key === 'NumpadEnter' || code === 23 || code === 66) {
        const target = flushPendingFocus() || active;
        if (target && target.dataset.tvFocusable === 'true') {
          e.preventDefault();
          if (e.repeat) return;

          longPressTriggeredRef.current = false;
          if (target.dataset.tvSupportsLongpress === 'true') {
            if (longPressTimerRef.current) {
              window.clearTimeout(longPressTimerRef.current);
            }
            longPressTimerRef.current = window.setTimeout(() => {
              longPressTriggeredRef.current = true;
              target.dispatchEvent(new CustomEvent('tv-longpress', { bubbles: true }));
            }, 520);
          } else {
            target.click();
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
        const active = flushPendingFocus() || (document.activeElement as HTMLElement | null);
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

    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('focusin', handleFocusIn);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (mutationRafId) {
        window.cancelAnimationFrame(mutationRafId);
      }
      clearPendingFocus();
      observer?.disconnect();
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, scopeSelector]);
}
