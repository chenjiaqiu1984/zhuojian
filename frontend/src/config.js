// 切换环境时只改这里（.env.* 的 VITE_SERVER）
// H5 开发兜底本地后端，避免 import.meta.env 未注入时图片打到 5173
const ENV_SERVER = String(import.meta.env.VITE_SERVER || '').trim();
// #ifdef H5
export const SERVER = ENV_SERVER || 'http://localhost:3000';
// #endif
// #ifndef H5
export const SERVER = ENV_SERVER;
// #endif

function withServer(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = String(SERVER || '').replace(/\/$/, '');
  return base ? `${base}${p}` : p;
}

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
  if (p.startsWith('/static/')) return withServer(p);
  // #endif
  return p;
}

/**
 * 上传图 / 大文件始终走后端域名，避免打到 Vite 5173 或进小程序主包。
 */
export function remoteUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return withServer(path);
}
