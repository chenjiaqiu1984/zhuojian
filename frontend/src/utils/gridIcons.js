/**
 * 首页网格图标：H5 打成 data URL，避免线上 Nginx 把 .svg 标成
 * application/octet-stream 导致 <image> / Image() 解码失败。
 * 小程序仍用包内 /static 路径。
 */

const GRID_RAW = import.meta.glob('../static/icons/grid/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const GRID_DATA_URLS = Object.create(null);
for (const [path, raw] of Object.entries(GRID_RAW)) {
  const file = path.split('/').pop();
  if (!file || typeof raw !== 'string') continue;
  const key = `/static/icons/grid/${file}`;
  GRID_DATA_URLS[key] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`;
}

/** @param {string} icon CMS / 默认配置里的 icon 路径或完整 URL */
export function resolveGridIcon(icon) {
  if (!icon) return '';
  // #ifdef H5
  const path = String(icon).replace(/^https?:\/\/[^/?#]+/i, '').split('?')[0];
  if (GRID_DATA_URLS[path]) return GRID_DATA_URLS[path];
  // #endif
  return '';
}
