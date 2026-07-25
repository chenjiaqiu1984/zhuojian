// 切换环境时只改这里
export const SERVER = import.meta.env.VITE_SERVER;

/**
 * 解析前端静态资源 URL。
 * H5：/static 由后端 Express 托管，需拼上 SERVER。
 * 小程序：用包内相对路径。
 */
export function staticUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  // #ifdef H5
  if (SERVER && p.startsWith('/static/')) {
    return `${String(SERVER).replace(/\/$/, '')}${p}`;
  }
  // #endif
  return p;
}
