/**
 * 待完善用户守卫（小程序兼容版）
 * 直接读取 uni.Storage，避免在非组件上下文中调用 Pinia。
 *
 * 用法：在需要完整账户的页面 onMounted 中调用：
 *   import { requireActive } from '../../utils/requireActive';
 *   onMounted(() => { if (!requireActive()) return; ... });
 */
export function requireActive() {
  const token = uni.getStorageSync('token');
  if (!token) {
    uni.redirectTo({ url: '/pages/login/index' });
    return false;
  }

  try {
    const userStr = uni.getStorageSync('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.status === 'pending') {
        uni.showToast({ title: '请先完善账户信息', icon: 'none', duration: 1500 });
        setTimeout(() => uni.redirectTo({ url: '/pages/login/complete' }), 400);
        return false;
      }
    }
  } catch {}

  return true;
}
