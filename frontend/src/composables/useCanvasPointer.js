/**
 * Canvas 指针坐标（跨端）
 *
 * H5 注意：uni-app 会把 mouse/touch 的 clientY 减去 --window-top（导航栏高度），
 * 与 getBoundingClientRect() 的 viewport 坐标系不一致，导致刷新后绘画偏移。
 * 应对：在原生 canvas 上监听事件（clientX/Y 为真实 viewport 坐标），
 * 或用 fromNativeClient 将 uni 坐标还原。
 */

import { findCanvasBySelector } from '@/utils/h5PageDom';

/** @typedef {{ scale: number, offsetX: number, offsetY: number }} ViewportTransform */
/** @typedef {{ w: number, h: number }} CanvasSize */
/** @typedef {{ left: number, top: number, width: number, height: number }} CanvasRect */

/**
 * @param {object} options
 * @param {import('vue').Ref<ViewportTransform>} options.transform
 * @param {() => CanvasSize} options.getCanvasSize
 * @param {string} [options.rectSelector='#canvasBox']
 * @param {string} [options.transformedSelector] - 应用 CSS transform 的 canvas（缩放/平移后应用视觉 rect）
 */
export function useCanvasPointer(options) {
  const {
    transform,
    getCanvasSize,
    rectSelector = '#canvasBox',
    transformedSelector,
  } = options;

  /** @type {CanvasRect | null} */
  let canvasRect = null;
  /** @type {CanvasRect | null} */
  let transformedRect = null;

  /** H5 同步读取变换后的 canvas 视觉包围盒（缩放/平移后立即生效） */
  function syncTransformedRectDom() {
    // #ifdef H5
    if (typeof document === 'undefined' || !transformedSelector) return;
    const { wrap, canvas } = findCanvasBySelector(transformedSelector);
    const el = canvas || wrap;
    if (el && typeof el.getBoundingClientRect === 'function') {
      transformedRect = el.getBoundingClientRect();
    }
    // #endif
  }

  /** 刷新参考矩形（pointerdown / touchstart 时调用） */
  function refreshRect(done) {
    const query = uni.createSelectorQuery();
    query.select(rectSelector).boundingClientRect();
    if (transformedSelector) {
      query.select(transformedSelector).boundingClientRect();
    }
    query.exec((res) => {
      if (res?.[0]) canvasRect = res[0];
      if (transformedSelector && res?.[1]) {
        transformedRect = res[1];
      } else {
        transformedRect = canvasRect;
      }
      syncTransformedRectDom();
      done?.();
    });
  }

  /**
   * 元素本地坐标 → canvas 逻辑坐标（canvasBox 未变换空间）
   */
  function fromLocal(localX, localY) {
    const size = getCanvasSize();
    const w = size.w || canvasRect?.width || 1;
    const h = size.h || canvasRect?.height || 1;
    const { scale, offsetX, offsetY } = transform.value;
    const cx = w / 2;
    const cy = h / 2;
    return {
      x: (localX - cx - offsetX) / scale + cx,
      y: (localY - cy - offsetY) / scale + cy,
    };
  }

  /**
   * 真实 viewport client 坐标 → canvas 逻辑坐标
   * 有 CSS transform 时用变换后的视觉包围盒线性映射（缩放 2x/3x 时准确）
   */
  function fromNativeClient(clientX, clientY) {
    syncTransformedRectDom();
    const size = getCanvasSize();
    const w = size.w || canvasRect?.width || 1;
    const h = size.h || canvasRect?.height || 1;
    const rect = transformedRect || canvasRect;
    if (!rect || !rect.width || !rect.height) {
      return { x: clientX, y: clientY };
    }
    return {
      x: ((clientX - rect.left) / rect.width) * w,
      y: ((clientY - rect.top) / rect.height) * h,
    };
  }

  /** uni-app H5 从 clientY 中减去的导航栏高度（--window-top） */
  function readUniWindowTop() {
    // #ifdef H5
    if (typeof document === 'undefined') return 0;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--window-top') || '0px';
    const m = raw.match(/([\d.]+)/);
    return m ? parseFloat(m[1]) : 0;
    // #endif
    return 0;
  }

  /**
   * uni-app 包装事件 → viewport 坐标（还原被减去的 window-top）
   */
  function viewportFromEvent(e) {
    if (typeof MouseEvent !== 'undefined' && e instanceof MouseEvent) {
      return { x: e.clientX, y: e.clientY };
    }
    if (typeof Touch !== 'undefined' && e instanceof Touch) {
      return { x: e.clientX, y: e.clientY };
    }
    const top = readUniWindowTop();
    return {
      x: e.clientX ?? 0,
      y: (e.clientY ?? 0) + top,
    };
  }

  /**
   * 元素本地坐标（等同小程序 canvas 事件的 detail.x/y）
   * 仅用于无 CSS transform 的 H5 原生 canvas。
   */
  function fromElementOffset(localX, localY) {
    const size = getCanvasSize();
    const w = size.w || canvasRect?.width || 1;
    const h = size.h || canvasRect?.height || 1;
    const scaleX = canvasRect?.width ? w / canvasRect.width : 1;
    const scaleY = canvasRect?.height ? h / canvasRect.height : 1;
    return fromLocal(localX * scaleX, localY * scaleY);
  }

  /** 原生 mouse / uni mouse → canvas 逻辑坐标 */
  function fromMouseEvent(e) {
    const { scale, offsetX, offsetY } = transform.value;
    const hasTransform = Math.abs(scale - 1) > 0.001 || Math.abs(offsetX) > 0.5 || Math.abs(offsetY) > 0.5;

    // #ifdef H5
    if (!hasTransform && typeof e.offsetX === 'number' && !Number.isNaN(e.offsetX)) {
      return fromElementOffset(e.offsetX, e.offsetY);
    }
    // #endif

    const vp = viewportFromEvent(e);
    return fromNativeClient(vp.x, vp.y);
  }

  /** touch → canvas 逻辑坐标 */
  function fromTouch(touch) {
    const vp = viewportFromEvent(touch);
    return fromNativeClient(vp.x, vp.y);
  }

  function getRect() {
    return canvasRect;
  }

  return {
    refreshRect,
    syncTransformedRectDom,
    fromLocal,
    fromElementOffset,
    fromNativeClient,
    fromMouseEvent,
    fromTouch,
    viewportFromEvent,
    getRect,
  };
}
