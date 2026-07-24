/** H5 移动端浏览器真实可视高度（地址栏显隐时比 100vh 更准确） */
export function getViewportHeight() {
  // #ifdef H5
  if (typeof window !== 'undefined') {
    if (window.visualViewport?.height) return window.visualViewport.height;
    if (window.innerHeight) return window.innerHeight;
  }
  // #endif
  try {
    if (typeof uni.getWindowInfo === 'function') return uni.getWindowInfo().windowHeight;
  } catch (e) { /* ignore */ }
  return 0;
}

/** 监听可视区高度变化，返回取消函数 */
export function bindViewportHeight(onChange) {
  // #ifdef H5
  if (typeof window === 'undefined') return () => {};
  const handler = () => onChange(getViewportHeight());
  window.visualViewport?.addEventListener('resize', handler);
  window.addEventListener('orientationchange', handler);
  window.addEventListener('resize', handler);
  return () => {
    window.visualViewport?.removeEventListener('resize', handler);
    window.removeEventListener('orientationchange', handler);
    window.removeEventListener('resize', handler);
  };
  // #endif
  return () => {};
}
