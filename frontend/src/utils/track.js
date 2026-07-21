import { SERVER } from '../config';
export function track(event, page, extra) {
  try {
    const u = uni.getStorageSync('user');
    const userId = u ? JSON.parse(u)?.id : null;
    uni.request({
      url: `${SERVER}/api/analytics`,
      method: 'POST',
      data: { userId, event, page, data: extra ? JSON.stringify(extra) : null }
    });
  } catch {}
}
