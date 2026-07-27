import { staticUrl, SERVER } from '../config';

/** 与 pages.json tabBar 保持一致 */
const TAB_ICON_ITEMS = [
  { index: 0, icon: '/static/icons/home.png',            selected: '/static/icons/home-active.png' },
  { index: 1, icon: '/static/icons/consultant.png',      selected: '/static/icons/consultant-active.png' },
  { index: 2, icon: '/static/icons/card.png',            selected: '/static/icons/card-active.png' },
  { index: 3, icon: '/static/icons/news.png',            selected: '/static/icons/news-active.png' },
  { index: 4, icon: '/static/icons/profile.png',         selected: '/static/icons/profile-active.png' },
];

function applyTabBarIcons(useRemote) {
  TAB_ICON_ITEMS.forEach(({ index, icon, selected }) => {
    uni.setTabBarItem({
      index,
      iconPath: useRemote ? staticUrl(icon) : icon,
      selectedIconPath: useRemote ? staticUrl(selected) : selected,
    });
  });
}

/** H5 tabBar 不走 staticUrl，需显式指向后端 /static（生产环境无 Vite 代理时） */
export function patchH5TabBarIcons() {
  if (import.meta.env.UNI_PLATFORM !== 'h5') return;
  // 开发：vite proxy 转发 /static，用同源路径即可
  // 生产：H5 与 API 不同源时，拼 SERVER 完整 URL
  const useRemote = import.meta.env.PROD && !!SERVER;
  applyTabBarIcons(useRemote);
}

export function scheduleH5TabBarIcons() {
  if (import.meta.env.UNI_PLATFORM !== 'h5') return;
  // tabBar 组件可能晚于 onLaunch 挂载，延迟再刷一次
  setTimeout(() => patchH5TabBarIcons(), 0);
  setTimeout(() => patchH5TabBarIcons(), 300);
}
