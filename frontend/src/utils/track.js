import { SERVER } from '../config';

function resolveUserId() {
  try {
    const u = uni.getStorageSync('user');
    if (!u) return null;
    const obj = typeof u === 'string' ? JSON.parse(u) : u;
    const id = obj?.id;
    return id != null && id !== '' ? Number(id) || id : null;
  } catch {
    return null;
  }
}

export function track(event, page, extra) {
  try {
    const token = uni.getStorageSync('token') || '';
    const header = {};
    if (token) header.Authorization = `Bearer ${token}`;
    uni.request({
      url: `${SERVER}/api/analytics`,
      method: 'POST',
      header,
      data: {
        userId: resolveUserId(),
        event,
        page,
        data: extra ? JSON.stringify(extra) : null,
      },
    });
  } catch {}
}
