/**
 * 跨端 Canvas 2D 初始化（H5 / 微信小程序同款 API）
 *
 * 统一通过 uni.createSelectorQuery().fields({ node: true, size: true })
 * 获取 canvas 节点，按 DPR 设置 buffer 并 scale 绘图坐标系。
 *
 * Vue3 + script setup 下微信小程序必须 .in(组件实例)，否则 fields({ node }) 常为空。
 */

import { getCurrentInstance } from 'vue';
import { findCanvasBySelector, resolveCanvasWrap } from '@/utils/h5PageDom';

function readDpr() {
  // #ifdef H5
  if (typeof window !== 'undefined') return window.devicePixelRatio || 1;
  // #endif
  try {
    if (typeof uni.getWindowInfo === 'function') return uni.getWindowInfo().pixelRatio || 1;
  } catch (e) { /* ignore */ }
  try {
    if (typeof uni.getDeviceInfo === 'function') return uni.getDeviceInfo().pixelRatio || 1;
  } catch (e) { /* ignore */ }
  return 1;
}

function readViewportLimit() {
  // #ifdef H5
  if (typeof window !== 'undefined') {
    return {
      w: window.innerWidth || 9999,
      h: window.innerHeight || 9999,
    };
  }
  // #endif
  try {
    if (typeof uni.getWindowInfo === 'function') {
      const info = uni.getWindowInfo();
      return { w: info.windowWidth || 9999, h: info.windowHeight || 9999 };
    }
  } catch (e) { /* ignore */ }
  return { w: 9999, h: 9999 };
}

/**
 * @param {object} options
 * @param {string} options.selector - canvas 选择器，如 '#mandalaCanvas'
 * @param {() => { w: number, h: number } | void} [options.getLogicalSize]
 * @param {(payload: {
 *   canvas: HTMLCanvasElement,
 *   ctx: CanvasRenderingContext2D,
 *   canvasSize: { w: number, h: number },
 *   dpr: number,
 *   displaySize: { w: number, h: number },
 * }) => void} [options.onReady]
 * @param {() => void} [options.onFail]
 * @param {number} [options.maxRetry=6]
 */
export function useCanvas2d(options) {
  const {
    selector,
    getLogicalSize,
    onReady,
    onFail,
    maxRetry = 6,
  } = options;

  // 在 composable 调用时捕获页面/组件实例，供 SelectorQuery.in 使用
  const ownerInstance = getCurrentInstance();

  function createQuery() {
    const query = uni.createSelectorQuery();
    const scope = ownerInstance?.proxy || ownerInstance;
    return scope ? query.in(scope) : query;
  }

  /** @type {HTMLCanvasElement | null} */
  let canvasNode = null;
  /** @type {CanvasRenderingContext2D | null} */
  let ctx = null;
  let dpr = 1;
  /** @type {{ w: number, h: number }} */
  let canvasSize = { w: 0, h: 0 };
  /** @type {{ w: number, h: number }} */
  let displaySize = { w: 0, h: 0 };
  /** @type {HTMLElement | null} */
  let eventTarget = null;
  /** @type {(() => void) | null} */
  let unbindPointer = null;

  function resolveEventTarget(queryNode) {
    // #ifdef H5
    const { wrap, canvas } = findCanvasBySelector(selector);
    if (wrap) return wrap;
    if (queryNode) return resolveCanvasWrap(queryNode).wrap || queryNode;
    // #endif
    return queryNode;
  }

  function measureDisplaySize() {
    // #ifdef H5
    const { wrap, canvas } = findCanvasBySelector(selector);
    const el = wrap || canvas;
    if (!el?.getBoundingClientRect) return { w: 0, h: 0 };
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { w: rect.width, h: rect.height };
    }
    const parent = el.parentElement;
    const parentRect = parent?.getBoundingClientRect?.();
    if (parentRect?.width > 0 && parentRect?.height > 0) {
      return { w: parentRect.width, h: parentRect.height };
    }
    // #endif
    return { w: 0, h: 0 };
  }

  /** 拒绝把 canvas buffer 像素误当作布局尺寸（手机高 DPR 典型症状） */
  function normalizeLogicalSize(w, h) {
    const limit = readViewportLimit();
    if (w < 1 || h < 1) {
      const measured = measureDisplaySize();
      w = measured.w;
      h = measured.h;
    }
    if (w > limit.w * 1.25 || h > limit.h * 1.25) {
      const measured = measureDisplaySize();
      if (measured.w > 0 && measured.h > 0) {
        w = measured.w;
        h = measured.h;
      } else {
        w = Math.min(w, limit.w);
        h = Math.min(h, limit.h);
      }
    }
    return { w, h };
  }

  /** 同步 CSS 显示尺寸，避免高 DPR 下 buffer 像素被当作布局尺寸（手机 H5 只显示左上角） */
  function syncDisplaySize(w, h, fillParent = false) {
    // #ifdef H5
    if (!canvasNode) return;
    if (fillParent) {
      canvasNode.style.width = '100%';
      canvasNode.style.height = '100%';
      canvasNode.style.maxWidth = '100%';
      canvasNode.style.maxHeight = '100%';
    } else {
      canvasNode.style.width = `${w}px`;
      canvasNode.style.height = `${h}px`;
      canvasNode.style.maxWidth = '100%';
      canvasNode.style.maxHeight = '100%';
    }
    canvasNode.style.display = 'block';
    canvasNode.style.boxSizing = 'border-box';
    const wrap = canvasNode.parentElement;
    if (wrap && wrap !== canvasNode && wrap.tagName?.toLowerCase?.() === 'uni-canvas') {
      wrap.style.display = 'block';
      wrap.style.boxSizing = 'border-box';
      wrap.style.overflow = 'hidden';
      if (fillParent) {
        wrap.style.width = '100%';
        wrap.style.height = '100%';
        wrap.style.maxWidth = '100%';
        wrap.style.maxHeight = '100%';
      } else {
        wrap.style.width = `${w}px`;
        wrap.style.height = `${h}px`;
        wrap.style.maxWidth = '100%';
        wrap.style.maxHeight = '100%';
      }
    }
    // #endif
  }

  function resetDomSize() {
    // #ifdef H5
    if (!canvasNode) return;
    try {
      canvasNode.width = 1;
      canvasNode.height = 1;
    } catch {}
    canvasNode.style.width = '';
    canvasNode.style.height = '';
    canvasNode.style.maxWidth = '';
    canvasNode.style.maxHeight = '';
    const wrap = canvasNode.parentElement;
    if (wrap?.tagName?.toLowerCase?.() === 'uni-canvas') {
      wrap.style.width = '';
      wrap.style.height = '';
      wrap.style.maxWidth = '';
      wrap.style.maxHeight = '';
    }
    // #endif
  }

  function applyBuffer(w, h, fillParent = false) {
    if (!canvasNode || !ctx || w < 1 || h < 1) return false;
    ({ w, h } = normalizeLogicalSize(w, h));
    if (w < 1 || h < 1) return false;
    canvasSize = { w, h };
    dpr = readDpr();
    canvasNode.width = Math.round(w * dpr);
    canvasNode.height = Math.round(h * dpr);
    syncDisplaySize(w, h, fillParent);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    return true;
  }

  function initFromDom() {
    // #ifdef H5
    if (typeof document === 'undefined') return false;
    const { wrap, canvas } = findCanvasBySelector(selector);
    if (!canvas) return false;
    canvasNode = canvas;
    eventTarget = wrap || canvas;
    displaySize = measureDisplaySize();
    const logical = getLogicalSize?.();
    let w = logical?.w || displaySize.w;
    let h = logical?.h || displaySize.h;
    ({ w, h } = normalizeLogicalSize(w, h));
    ctx = canvas.getContext('2d');
    if (!ctx || !applyBuffer(w, h, !logical?.w)) return false;
    displaySize = { w, h };
    onReady?.({ canvas: canvasNode, ctx, canvasSize, dpr, displaySize });
    return true;
    // #endif
    return false;
  }

  function scheduleRetry(retry) {
    if (retry < maxRetry) {
      setTimeout(() => init(retry + 1), retry === 0 ? 50 : 120);
      return true;
    }
    return false;
  }

  function init(retry = 0) {
    createQuery()
      .select(selector)
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res?.[0];
        if (!info?.node) {
          // #ifdef H5
          if (initFromDom()) return;
          // #endif
          if (scheduleRetry(retry)) return;
          // #ifdef H5
          if (initFromDom()) return;
          // #endif
          onFail?.();
          return;
        }

        canvasNode = info.node;
        eventTarget = resolveEventTarget(canvasNode);
        displaySize = { w: info.width || 0, h: info.height || 0 };
        const logical = getLogicalSize?.();
        let w = logical?.w || displaySize.w;
        let h = logical?.h || displaySize.h;
        ({ w, h } = normalizeLogicalSize(w, h));
        ctx = canvasNode.getContext('2d');
        const fillParent = !logical?.w;
        if (!ctx || !applyBuffer(w, h, fillParent)) {
          // #ifdef H5
          if (initFromDom()) return;
          // #endif
          // 布局尚未完成（宽高为 0）时重试，避免微信端首帧失败
          if (scheduleRetry(retry)) return;
          onFail?.();
          return;
        }
        displaySize = { w, h };
        onReady?.({ canvas: canvasNode, ctx, canvasSize, dpr, displaySize });
      });
  }

  function remeasureAndResize(getSize) {
    const logical = getSize?.() || getLogicalSize?.();
    let w = logical?.w || 0;
    let h = logical?.h || 0;
    if (w < 1 || h < 1) {
      const measured = measureDisplaySize();
      w = measured.w;
      h = measured.h;
    }
    if (w < 1 || h < 1) return false;
    return resize(w, h, !logical?.w);
  }

  function resize(w, h, fillParent = false) {
    if (!applyBuffer(w, h, fillParent)) return false;
    displaySize = { w: canvasSize.w, h: canvasSize.h };
    return true;
  }

  /**
   * H5：在真实 canvas 节点上绑定原生 pointer 事件。
   * uni-app H5 的模板 @touchstart/@click 在 canvas 上不可靠，必须原生绑定。
   * @param {object} handlers
   */
  function bindPointer(handlers) {
    unbindPointer?.();
    unbindPointer = null;
    // #ifdef H5
    const el = eventTarget || resolveEventTarget(canvasNode);
    if (!el || typeof el.addEventListener !== 'function' || !handlers) return;

    el.style.touchAction = 'none';

    const opts = { passive: false };
    const onMd = (e) => { e.preventDefault(); handlers.onMouseDown?.(e); };
    const onMm = (e) => handlers.onMouseMove?.(e);
    const onMu = (e) => handlers.onMouseUp?.(e);
    const onTs = (e) => { e.preventDefault(); handlers.onTouchStart?.(e); };
    const onTm = (e) => { e.preventDefault(); handlers.onTouchMove?.(e); };
    const onTe = (e) => handlers.onTouchEnd?.(e);
    const onWh = (e) => { e.preventDefault(); handlers.onWheel?.(e); };

    el.addEventListener('mousedown', onMd);
    el.addEventListener('mousemove', onMm);
    window.addEventListener('mouseup', onMu);
    el.addEventListener('touchstart', onTs, opts);
    el.addEventListener('touchmove', onTm, opts);
    el.addEventListener('touchend', onTe);
    el.addEventListener('touchcancel', onTe);
    if (handlers.onWheel) el.addEventListener('wheel', onWh, opts);

    unbindPointer = () => {
      el.removeEventListener('mousedown', onMd);
      el.removeEventListener('mousemove', onMm);
      window.removeEventListener('mouseup', onMu);
      el.removeEventListener('touchstart', onTs);
      el.removeEventListener('touchmove', onTm);
      el.removeEventListener('touchend', onTe);
      el.removeEventListener('touchcancel', onTe);
      if (handlers.onWheel) el.removeEventListener('wheel', onWh);
    };
    // #endif
  }

  /** H5：viewport 坐标 → canvas 逻辑坐标（与小程序 detail.x/y 一致） */
  function clientToLocal(clientX, clientY) {
    const el = eventTarget || resolveEventTarget(canvasNode);
    if (!el || typeof el.getBoundingClientRect !== 'function') {
      return { x: clientX, y: clientY };
    }
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return { x: 0, y: 0 };
    const sx = canvasSize.w / rect.width;
    const sy = canvasSize.h / rect.height;
    return {
      x: (clientX - rect.left) * sx,
      y: (clientY - rect.top) * sy,
    };
  }

  /** H5：原生 MouseEvent → canvas 逻辑坐标 */
  function localFromMouseEvent(e) {
    if (typeof e.offsetX === 'number' && !Number.isNaN(e.offsetX)) {
      const el = eventTarget || resolveEventTarget(canvasNode);
      const rect = el?.getBoundingClientRect?.();
      if (rect?.width && rect?.height) {
        const sx = canvasSize.w / rect.width;
        const sy = canvasSize.h / rect.height;
        return { x: e.offsetX * sx, y: e.offsetY * sy };
      }
      return { x: e.offsetX, y: e.offsetY };
    }
    return clientToLocal(e.clientX ?? 0, e.clientY ?? 0);
  }

  function toDataURL(type = 'image/jpeg', quality = 0.92) {
    if (!canvasNode) return null;
    try {
      return canvasNode.toDataURL(type, quality);
    } catch {
      return null;
    }
  }

  function nextFrame(fn) {
    // #ifdef MP-WEIXIN
    if (canvasNode?.requestAnimationFrame) return canvasNode.requestAnimationFrame(fn);
    return setTimeout(() => fn(Date.now()), 16);
    // #endif
    // #ifdef H5
    return requestAnimationFrame(fn);
    // #endif
  }

  function cancelFrame(id) {
    if (id == null) return;
    // #ifdef MP-WEIXIN
    if (canvasNode?.cancelAnimationFrame) {
      canvasNode.cancelAnimationFrame(id);
      return;
    }
    clearTimeout(id);
    // #endif
    // #ifdef H5
    cancelAnimationFrame(id);
    // #endif
  }

  function destroy() {
    unbindPointer?.();
    unbindPointer = null;
    resetDomSize();
    canvasNode = null;
    eventTarget = null;
    ctx = null;
  }

  return {
    init,
    resize,
    remeasureAndResize,
    bindPointer,
    clientToLocal,
    localFromMouseEvent,
    toDataURL,
    nextFrame,
    cancelFrame,
    getCanvas: () => canvasNode,
    getEventTarget: () => eventTarget,
    getContext: () => ctx,
    getSize: () => canvasSize,
    getDisplaySize: () => displaySize,
    getDpr: () => dpr,
    destroy,
  };
}
