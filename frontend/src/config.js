// 切换环境时只改这里（.env.* 的 VITE_SERVER）
// H5 开发兜底本地后端，避免 import.meta.env 未注入时图片打到 5173
// Windows 上优先 127.0.0.1，避免 localhost → ::1 导致请求挂起
const ENV_SERVER = String(import.meta.env.VITE_SERVER || '').trim()
  .replace('://localhost', '://127.0.0.1');
// #ifdef H5
export const SERVER = ENV_SERVER || 'http://127.0.0.1:3000';
// #endif
// #ifndef H5
// 小程序/App：岛图等大资源走 remoteUrl，SERVER 为空会退化成包内路径导致加载失败
export const SERVER = ENV_SERVER || 'https://www.joyineyes.xyz';
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
