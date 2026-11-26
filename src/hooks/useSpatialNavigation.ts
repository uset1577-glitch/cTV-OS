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

function isElementDisabledOrHidden(el: HTMLElement): boolean {
  return (
    el.hasAttribute('disabled') ||
    el.getAttribute('aria-disabled') === 'true' ||
    el.tabIndex === -1
  );
}

function getRect(el: HTMLElement, rectCache?: Map<HTMLElement, DOMRect>): DOMRect {
  const cached = rectCache?.get(el);
  if (cached) return cached;
  const r = el.getBoundingClientRect();
  rectCache?.set(el, r);
  return r;
}

function isVisibleFocusable(el: HTMLElement, rectCache?: Map<HTMLElement, DOMRect>): boolean {
  if (isElementDisabledOrHidden(el)) return false;
  if (isHiddenByAncestors(el)) return false;
  const rect = getRect(el, rectCache);
  return rect.width > 0 && rect.height > 0;
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
    if (isElementDisabledOrHidden(el)) return false;
    if (el.offsetParent === null || isHiddenByAncestors(el)) return false;
    const rect = getRect(el, rectCache);
    return rect.width > 0 && rect.height > 0;
  });
}

function getRowItemsFast(rowEl: HTMLElement): HTMLElement[] {
  const nodes = rowEl.querySelectorAll<HTMLElement>('[data-tv-focusable="true"]');
  const items: HTMLElement[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    if (!isElementDisabledOrHidden(el)) {
      items.push(el);
    }
  }
  return items;
}

function pickClosestHorizontally(
  candidates: HTMLElement[],
  targetX: number,
  rectCache?: Map<HTMLElement, DOMRect>
): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < candidates.length; i++) {
    const el = candidates[i];
    const rect = getRect(el, rectCache);
    if (rect.width <= 0 || rect.height <= 0) continue;
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
    const rowBandThreshold = Math.max(48, currRect.height * 0.65);
    let best: HTMLElement | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < rowCandidates.length; i++) {
      const el = rowCandidates[i];
      if (el === current) continue;
      const r = getRect(el, rectCache);
      if (r.width <= 0 || r.height <= 0) continue;
      const cy = r.top + r.height / 2;
      const cx = r.left + r.width / 2;
      if (Math.abs(cy - currCy) >= rowBandThreshold) continue;
      if (direction === 'right' ? cx <= currCx + 8 : cx >= currCx - 8) continue;
      const dist = Math.abs(cx - currCx);
      if (dist < bestDist) {
        bestDist = dist;
        best = el;
      }
    }
    return best;
  }

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 0; i < rowCandidates.length; i++) {
    const el = rowCandidates[i];
    if (el === current) continue;
    const r = getRect(el, rectCache);
    if (r.width <= 0 || r.height <= 0) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dy = cy - currCy;
    if (direction === 'down' && dy <= 24) continue;
    if (direction === 'up' && dy >= -24) continue;

    const score = Math.abs(dy) + Math.abs(cx - currCx) * 1.4;
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

  for (let i = 0; i < candidates.length; i++) {
    const el = candidates[i];
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

  const items = knownItems || getRowItemsFast(rowEl);
  const index = items.indexOf(el);
  if (index === -1) return;

  const rect = getRect(el, rectCache);
  const centerX = rect.left + rect.width / 2;
  let colIndex: number | undefined;

  if (rowEl.dataset.tvRowType === 'grid') {
    const bandThreshold = Math.max(36, rect.height * 0.6);
    const band = items
      .filter((item) => Math.abs(getRect(item, rectCache).top - rect.top) < bandThreshold)
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
    let edgeY = direction === 'down' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    for (let i = 0; i < items.length; i++) {
      const top = getRect(items[i], rectCache).top;
      if (direction === 'down' ? top < edgeY : top > edgeY) {
        edgeY = top;
      }
    }
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
      if (byId && getRect(byId, rectCache).width > 0) return byId;
    }
    if (saved.index >= 0) {
      const byIndex = items[Math.min(saved.index, items.length - 1)];
      if (byIndex && getRect(byIndex, rectCache).width > 0) return byIndex;
    }
    return pickClosestHorizontally(items, saved.centerX, rectCache);
  }

  return pickClosestHorizontally(items, fallbackCenterX, rectCache);
}

function getVisibleRows(scopeSelector?: string): HTMLElement[] {
  const root: ParentNode = scopeSelector
    ? document.querySelector(scopeSelector) || document
    : document;
  const rawRows = root.querySelectorAll<HTMLElement>('[data-tv-row]');
  const visible: HTMLElement[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const rowEl = rawRows[i];
    if (rowEl.offsetParent !== null && !isHiddenByAncestors(rowEl)) {
      visible.push(rowEl);
    }
  }
  return visible;
}

function findNextElement(
  current: HTMLElement | null,
  direction: 'up' | 'down' | 'left' | 'right',
  scopeSelector: string | undefined,
  rowMemory: Map<string, RowFocusMemory>,
  rectCache: Map<HTMLElement, DOMRect>
): { next: HTMLElement | null; nextRowItems?: HTMLElement[]; hasAnyCandidates?: boolean } {
  const currentRow = current?.isConnected ? current.closest<HTMLElement>('[data-tv-row]') : null;

  if (current && currentRow && !isHiddenByAncestors(currentRow) && currentRow.offsetParent !== null) {
    const isGrid = currentRow.dataset.tvRowType === 'grid';
    const currentItems = getRowItemsFast(currentRow);

    // Ruta rápida horizontal O(1) dentro de filas estándar (sin medir todo el documento)
    if (!isGrid && (direction === 'left' || direction === 'right')) {
      const currIdx = currentItems.indexOf(current);
      if (currIdx !== -1) {
        const currRect = getRect(current, rectCache);
        const currCx = currRect.left + currRect.width / 2;
        const step = direction === 'right' ? 1 : -1;

        for (let i = currIdx + step; i >= 0 && i < currentItems.length; i += step) {
          const cand = currentItems[i];
          const r = getRect(cand, rectCache);
          if (r.width <= 0 || r.height <= 0) continue;
          const cx = r.left + r.width / 2;
          if (direction === 'right' ? cx > currCx + 4 : cx < currCx - 4) {
            return { next: cand, nextRowItems: currentItems, hasAnyCandidates: true };
          }
        }

        // Respaldo geométrico dentro de la fila si hubiese reordenamiento CSS
        const directional = currentItems.filter((el) => {
          if (el === current) return false;
          const r = getRect(el, rectCache);
          if (r.width <= 0 || r.height <= 0) return false;
          const cx = r.left + r.width / 2;
          return direction === 'right' ? cx > currCx + 4 : cx < currCx - 4;
        });
        return {
          next: pickClosestHorizontally(directional, currCx, rectCache),
          nextRowItems: currentItems,
          hasAnyCandidates: true,
        };
      }
    }

    if (isGrid && (direction === 'left' || direction === 'right')) {
      return {
        next: findNextInGrid(current, direction, currentItems, rectCache),
        nextRowItems: currentItems,
        hasAnyCandidates: true,
      };
    }

    if (isGrid) {
      const insideGrid = findNextInGrid(current, direction, currentItems, rectCache);
      if (insideGrid) {
        return { next: insideGrid, nextRowItems: currentItems, hasAnyCandidates: true };
      }
    }

    if (direction === 'left' || direction === 'right') {
      return { next: null, hasAnyCandidates: true };
    }

    // Navegación vertical: solo inspecciona filas visibles, sin consultar tarjetas de otras filas
    const visibleRows = getVisibleRows(scopeSelector);
    const rowIndex = visibleRows.indexOf(currentRow);
    if (rowIndex !== -1) {
      recordRowFocus(current, rowMemory, currentItems, rectCache);

      const step = direction === 'up' ? -1 : 1;
      for (let idx = rowIndex + step; idx >= 0 && idx < visibleRows.length; idx += step) {
        const targetRow = visibleRows[idx];
        const targetItems = getRowItemsFast(targetRow);
        if (targetItems.length === 0) continue;

        const currRect = getRect(current, rectCache);
        const currCx = currRect.left + currRect.width / 2;
        const restored = restoreRowFocus(
          { rowEl: targetRow, items: targetItems },
          direction,
          currCx,
          rowMemory,
          rectCache
        );
        if (restored) {
          return { next: restored, nextRowItems: targetItems, hasAnyCandidates: true };
        }
      }

      return { next: null, hasAnyCandidates: true };
    }
  }

  // Ruta general para modales/vistas sin data-tv-row o cuando el foco se perdió
  const candidates = getFocusableElements(scopeSelector, rectCache);
  if (candidates.length === 0) return { next: null, hasAnyCandidates: false };
  if (!current || !candidates.includes(current)) {
    return {
      next: candidates.find((c) => c.dataset.tvInitial === 'true') || candidates[0],
      hasAnyCandidates: true,
    };
  }
  return {
    next: findNextGeometric(current, direction, candidates, rectCache),
    hasAnyCandidates: true,
  };
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

// Curva ease-out inmediata sin arranque lento: f(0)=0, f(1)=1
function evalScrollCurve(t: number, retargeted: boolean): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const inv = 1 - t;
  return retargeted ? 1 - inv * inv : 1 - inv * inv * inv;
}

function cancelAxisAnimation(container: HTMLElement, axis: 'top' | 'left') {
  const store = axis === 'top' ? verticalScrollAnims : horizontalScrollAnims;
  const anim = store.get(container);
  if (anim && anim.isAnimating) {
    if (anim.rafId) window.cancelAnimationFrame(anim.rafId);
    anim.isAnimating = false;
    anim.rafId = 0;
    const pos = axis === 'top' ? container.scrollTop : container.scrollLeft;
    anim.current = pos;
    anim.target = pos;
  }
}

function ensureInterruptListeners(container: HTMLElement) {
  if (boundScrollInterruptContainers.has(container)) return;
  boundScrollInterruptContainers.add(container);

  const cancelAnims = () => {
    cancelAxisAnimation(container, 'top');
    cancelAxisAnimation(container, 'left');
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
  maxPos: number,
  instant = false
) {
  const clampedTarget = Math.min(maxPos, Math.max(0, targetPos));
  const store = axis === 'top' ? verticalScrollAnims : horizontalScrollAnims;
  const existing = store.get(container);

  if (instant || prefersReducedMotion()) {
    if (existing?.isAnimating && existing.rafId) {
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

  const currentActual = axis === 'top' ? container.scrollTop : container.scrollLeft;
  const wasAnimating = Boolean(existing?.isAnimating);

  // Si ya vamos exactamente hacia ese destino, evitar reiniciar la animación
  if (wasAnimating && existing && Math.abs(clampedTarget - existing.target) < 0.75) {
    return;
  }

  if (Math.abs(clampedTarget - currentActual) < 0.75) {
    if (existing?.isAnimating && existing.rafId) {
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

  // Cancelación limpia del frame previo antes de reprogramar hacia el nuevo objetivo
  if (existing?.rafId) {
    window.cancelAnimationFrame(existing.rafId);
    existing.rafId = 0;
  }

  // Transiciones rápidas y fluidas (~110-135 ms) sin esperas
  const duration = axis === 'top' ? (wasAnimating ? 115 : 135) : wasAnimating ? 110 : 125;
  const now = performance.now();

  const anim: AxisScrollAnim = existing || {
    startPos: currentActual,
    current: currentActual,
    target: clampedTarget,
    startTime: now,
    duration,
    retargeted: wasAnimating,
    rafId: 0,
    isAnimating: false,
  };

  anim.startPos = currentActual;
  anim.current = currentActual;
  anim.target = clampedTarget;
  anim.startTime = now;
  anim.duration = duration;
  anim.retargeted = wasAnimating;
  anim.isAnimating = true;
  store.set(container, anim);

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
  const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
  animateContainerAxis(container, 'top', targetTop, maxTop, instant);
}

function findVerticalScrollContainer(el: HTMLElement): HTMLElement | null {
  const tagged = el.closest<HTMLElement>('[data-tv-scroll-container="true"]');
  if (tagged) return tagged;

  let curr = el.parentElement;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    if (curr.scrollHeight > curr.clientHeight) {
      const overflowY = window.getComputedStyle(curr).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return curr;
      }
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
  maxScrollTop: number;
  hRail: HTMLElement | null;
  nextScrollLeft: number | null;
  maxScrollLeft: number;
}

// Fase 1 pura: todas las lecturas geométricas juntas antes de mutar DOM o foco
function computeScrollPlan(
  el: HTMLElement,
  rectCache?: Map<HTMLElement, DOMRect>
): ScrollPlan {
  const visualBox = el.querySelector<HTMLElement>('[data-tv-focus-box="true"]') || el;
  const vParent = findVerticalScrollContainer(el);
  const hRail = findHorizontalRail(el);

  let nextScrollTop: number | null = null;
  let maxScrollTop = 0;
  let nextScrollLeft: number | null = null;
  let maxScrollLeft = 0;

  const boxRect = getRect(visualBox, rectCache);

  if (vParent) {
    maxScrollTop = Math.max(0, vParent.scrollHeight - vParent.clientHeight);
    const pendingY = getPendingScrollDelta(vParent, 'top');
    const projectedTop = boxRect.top - pendingY;
    const projectedBottom = boxRect.bottom - pendingY;
    const effectiveScrollTop = vParent.scrollTop + pendingY;

    if (el.closest('[data-tv-scroll-top="true"]')) {
      if (effectiveScrollTop > 1) {
        nextScrollTop = 0;
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
        const rawNext = effectiveScrollTop + deltaY;
        nextScrollTop = Math.min(maxScrollTop, Math.max(0, rawNext < 24 ? 0 : rawNext));
      }
    }
  }

  if (hRail) {
    maxScrollLeft = Math.max(0, hRail.scrollWidth - hRail.clientWidth);
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
      const effectiveScrollLeft = hRail.scrollLeft + pendingX;
      nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, effectiveScrollLeft + deltaX));
    }
  }

  return {
    vParent,
    nextScrollTop,
    maxScrollTop,
    hRail,
    nextScrollLeft,
    maxScrollLeft,
  };
}

function applyScrollPlan(plan: ScrollPlan, instant = false) {
  if (plan.vParent && plan.nextScrollTop !== null) {
    animateContainerAxis(plan.vParent, 'top', plan.nextScrollTop, plan.maxScrollTop, instant);
  }
  if (plan.hRail && plan.nextScrollLeft !== null) {
    animateContainerAxis(plan.hRail, 'left', plan.nextScrollLeft, plan.maxScrollLeft, instant);
  }
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
  const lastPointerDownAtRef = useRef<number>(0);
  const lastRememberedElRef = useRef<HTMLElement | null>(null);
  const programmaticFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

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

    // Traspaso de foco inmediato (0 ms de espera) sincronizado con scroll de ~110-135 ms
    const navigateToTarget = (
      next: HTMLElement,
      knownItems?: HTMLElement[],
      rectCache?: Map<HTMLElement, DOMRect>
    ) => {
      const plan = computeScrollPlan(next, rectCache);
      rememberTarget(next, knownItems, rectCache);
      applyScrollPlan(plan, false);

      programmaticFocusRef.current = next;
      next.focus({ preventScroll: true });
    };

    const restoreAfterDomChange = () => {
      const rectCache = new Map<HTMLElement, DOMRect>();
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        active !== document.body &&
        active.isConnected &&
        active.dataset.tvFocusable === 'true' &&
        isVisibleFocusable(active, rectCache)
      ) {
        return;
      }

      const visibleRows = getVisibleRows(scopeSelector);
      if (lastFocusedRowKeyRef.current && visibleRows.length > 0) {
        const preferredKey =
          lastFocusedRowKeyRef.current === 'series' &&
          !visibleRows.some((r) => r.dataset.tvRow === 'series')
            ? 'series-filters'
            : lastFocusedRowKeyRef.current;

        const targetRow = visibleRows.find((r) => r.dataset.tvRow === preferredKey);
        if (targetRow) {
          const items = getRowItemsFast(targetRow);
          if (items.length > 0) {
            const saved = rowMemoryRef.current.get(preferredKey);
            const restored = restoreRowFocus(
              { rowEl: targetRow, items },
              'down',
              saved?.centerX ?? window.innerWidth * 0.25,
              rowMemoryRef.current,
              rectCache
            );
            if (restored) {
              navigateToTarget(restored, items, rectCache);
              return;
            }
          }
        }
      }

      const candidates = getFocusableElements(scopeSelector, rectCache);
      if (candidates.length === 0) return;
      const preferred =
        candidates.find((c) => c.dataset.tvInitial === 'true') || candidates[0];
      navigateToTarget(preferred, undefined, rectCache);
    };

    const ensureFocus = () => {
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        active !== document.body &&
        active.isConnected &&
        active.dataset.tvFocusable === 'true' &&
        isVisibleFocusable(active)
      ) {
        if (lastRememberedElRef.current !== active) {
          rememberTarget(active);
        }
        return;
      }
      restoreAfterDomChange();
    };

    const rafId = window.requestAnimationFrame(ensureFocus);
    let mutationRafId = 0;

    const scopeRoot = scopeSelector
      ? document.querySelector(scopeSelector) || document.body
      : document.body;

    const observer =
      typeof MutationObserver !== 'undefined' && scopeRoot
        ? new MutationObserver(() => {
            const active = document.activeElement as HTMLElement | null;
            if (
              active &&
              active !== document.body &&
              active.isConnected &&
              scopeRoot.contains(active)
            ) {
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
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.dataset.tvFocusable !== 'true') return;

      if (programmaticFocusRef.current === target) {
        programmaticFocusRef.current = null;
        return;
      }
      programmaticFocusRef.current = null;

      if (scopeSelector) {
        const rootNode = document.querySelector(scopeSelector);
        if (rootNode && !rootNode.contains(target)) return;
      }

      const isNewTarget = lastRememberedElRef.current !== target;
      if (isNewTarget) {
        rememberTarget(target);
      }

      const fromPointer = Date.now() - lastPointerDownAtRef.current < 320;
      if (!fromPointer && isNewTarget) {
        const plan = computeScrollPlan(target);
        applyScrollPlan(plan, false);
      }
    };

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
        const rectCache = new Map<HTMLElement, DOMRect>();
        const { next, nextRowItems, hasAnyCandidates } = findNextElement(
          active,
          direction,
          scopeSelector,
          rowMemoryRef.current,
          rectCache
        );
        if (next) {
          navigateToTarget(next, nextRowItems, rectCache);
        } else if (hasAnyCandidates && (!active || !active.isConnected || active === document.body)) {
          restoreAfterDomChange();
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
            }, 480);
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

    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('focusin', handleFocusIn);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (mutationRafId) {
        window.cancelAnimationFrame(mutationRafId);
      }
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
