/** H5 页面栈内 DOM 查询（避免 document.getElementById 命中已隐藏的旧页面） */

function getCurrentPagesSafe() {
  try {
    if (typeof getCurrentPages === 'function') return getCurrentPages();
  } catch {}
  return [];
}

/** 当前可见的 uni-page 根节点 */
export function getCurrentUniPage() {
  // #ifdef H5
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
  // #ifdef H5
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

/** 解析 uni-canvas 包裹层 → 内层 canvas */
export function resolveCanvasWrap(el) {
  if (!el) return { wrap: null, canvas: null };
  if (el.tagName === 'CANVAS') return { wrap: el.parentElement, canvas: el };
  const inner = el.querySelector?.('canvas');
  return { wrap: el, canvas: inner || el };
}

export function findCanvasBySelector(selector) {
  const found = queryInCurrentPage(selector);
  return resolveCanvasWrap(found);
}
