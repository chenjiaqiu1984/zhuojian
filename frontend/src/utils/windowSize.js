/** 窗口尺寸：避免调用已废弃的 getSystemInfoSync */
export function getWindowSize() {
  try {
    if (typeof uni.getWindowInfo === 'function') {
      const w = uni.getWindowInfo();
      return {
        windowWidth: w.windowWidth || 375,
        windowHeight: w.windowHeight || 600,
      };
    }
  } catch (e) {}

  try {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && typeof wx.getWindowInfo === 'function') {
      const w = wx.getWindowInfo();
      return {
        windowWidth: w.windowWidth || 375,
        windowHeight: w.windowHeight || 600,
      };
    }
    // #endif
  } catch (e) {}

  // 不回落到 getSystemInfoSync，避免控制台刷废弃警告
  return { windowWidth: 375, windowHeight: 667 };
}
