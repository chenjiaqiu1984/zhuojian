/** H5 / App 页面栈内 DOM 查询（避免 document.getElementById 命中已隐藏的旧页面） */

function getCurrentPagesSafe() {
  try {
    if (typeof getCurrentPages === 'function') return getCurrentPages();
  } catch {}
  return [];
}

/** 当前可见的 uni-page 根节点 */
export function getCurrentUniPage() {
  // #ifdef H5 || APP-PLUS
  if (typeof document === 'undefined') return null;
  const pages = getCurrentPagesSafe();
  const route = pages[pages.length - 1]?.route;
  if (route) {
    const byRoute = document.querySelector(`uni-page[data-page="${route}"]`);
    if (byRoute) return byRoute;
  }
  const all = document.querySelectorAll('uni-page');
  for (let i = all.length - 1; i >= 0; i--) {
    const page = all[i];
    const style = window.getComputedStyle(page);
    if (style.display !== 'none' && style.visibility !== 'hidden') return page;
  }
  return all[all.length - 1] || null;
  // #endif
  return null;
}

/** 在当前页面内查询（selector 支持 #id / .class） */
export function queryInCurrentPage(selector) {
  // #ifdef H5 || APP-PLUS
  if (typeof document === 'undefined') return null;
  const root = getCurrentUniPage();
  if (root) {
    const found = root.querySelector(selector);
    if (found) return found;
  }
  return document.querySelector(selector);
  // #endif
  return null;
}

function isRealCanvas(el) {
  return !!(el && typeof el.getContext === 'function');
}

/** 解析 uni-canvas 包裹层 → 内层真实 canvas（绝不把无 getContext 的包裹层当画布） */
export function resolveCanvasWrap(el) {
  if (!el) return { wrap: null, canvas: null };
  if (isRealCanvas(el) || el.tagName === 'CANVAS') {
    return { wrap: el.parentElement, canvas: isRealCanvas(el) ? el : null };
  }
  const inner = el.querySelector?.('canvas');
  if (isRealCanvas(inner) || inner?.tagName === 'CANVAS') {
    return { wrap: el, canvas: isRealCanvas(inner) ? inner : null };
  }
  return { wrap: el, canvas: null };
}

export function findCanvasBySelector(selector) {
  const found = queryInCurrentPage(selector);
  let resolved = resolveCanvasWrap(found);
  if (resolved.canvas) return resolved;

  // App 上 id 常挂在 uni-canvas 上，再试内层 / 反向选择
  // #ifdef H5 || APP-PLUS
  if (typeof document !== 'undefined' && selector?.startsWith?.('#')) {
    const id = selector.slice(1);
    const root = getCurrentUniPage() || document;
    const candidates = [
      root.querySelector?.(`uni-canvas${selector} canvas`),
      root.querySelector?.(`uni-canvas${selector}`),
      root.querySelector?.(`canvas${selector}`),
      root.querySelector?.(`[id="${id}"] canvas`),
      document.getElementById(id),
    ];
    for (const el of candidates) {
      resolved = resolveCanvasWrap(el);
      if (resolved.canvas) return resolved;
      if (isRealCanvas(el)) return { wrap: el.parentElement, canvas: el };
    }
  }
  // #endif
  return resolved;
}
