/** 与首页 index.vue nav() 一致的 Tab 集合（pages.json tabBar） */
export const TAB_PATHS = new Set([
  '/pages/index/index',
  '/pages/consultants/index',
  '/pages/ohcard/index',
  '/pages/assessment/index',
  '/pages/profile/index',
]);

/** 规范化后台配置的跳转路径 */
export function normalizeIslandUrl(url) {
  if (!url) return '';
  let u = String(url).trim();
  if (!u) return '';
  if (!u.startsWith('/')) u = `/${u}`;
  if (!u.startsWith('/pages/')) return '';
  u = u.replace(/\.html$/i, '');
  const q = u.indexOf('?');
  const base = (q >= 0 ? u.slice(0, q) : u).replace(/\/+$/, '') || '/';
  return q >= 0 ? base + u.slice(q) : base;
}

/** 与首页 nav() 完全一致：Tab 用 switchTab，其余 navigateTo */
export function pageNav(p) {
  const path = normalizeIslandUrl(p) || String(p || '').trim();
  if (!path) return;
  const fail = (err) => {
    console.error('[pageNav]', path, err?.errMsg || err);
    uni.showToast({ title: '页面打开失败', icon: 'none' });
  };
  if (TAB_PATHS.has(path)) uni.switchTab({ url: path, fail });
  else uni.navigateTo({ url: path, fail });
}
