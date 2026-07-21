// 跨平台 requestAnimationFrame 封装
// H5 有原生 requestAnimationFrame；微信小程序页面 JS 上下文没有，
// 用 setTimeout ~16ms（约 60fps）兜底，保证动画循环在所有端都能运行。

// #ifdef H5
export const raf = (fn) => requestAnimationFrame(fn);
export const caf = (id) => cancelAnimationFrame(id);
// #endif

// #ifndef H5
export const raf = (fn) => setTimeout(() => fn(Date.now()), 16);
export const caf = (id) => clearTimeout(id);
// #endif
