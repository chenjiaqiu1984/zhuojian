import { ref } from 'vue';
import {
  MINIPROGRAM_INTRO,
  MINIPROGRAM_NAME,
  MINIPROGRAM_SCAN_HINT,
  MINIPROGRAM_TAGLINE,
  wxacodeLocalUrl,
} from './miniprogramPromo';

export const shareMomentsState = ref({
  visible: false,
  title: '',
  subtitle: '',
});

/**
 * 打开「分享到朋友圈」海报弹窗
 * @param {{ title?: string, subtitle?: string }} [opts]
 */
export function openShareMoments(opts = {}) {
  shareMomentsState.value = {
    visible: true,
    title: opts.title || `${MINIPROGRAM_NAME} — ${MINIPROGRAM_TAGLINE}`,
    subtitle: opts.subtitle || MINIPROGRAM_INTRO,
  };
}

export function closeShareMoments() {
  shareMomentsState.value = { ...shareMomentsState.value, visible: false };
}

export {
  MINIPROGRAM_INTRO,
  MINIPROGRAM_NAME,
  MINIPROGRAM_SCAN_HINT,
  MINIPROGRAM_TAGLINE,
  wxacodeLocalUrl,
};

/**
 * H5 / 小程序：展示分享操作（复制链接 + 朋友圈海报）
 * @param {{ title?: string, subtitle?: string, url?: string }} opts
 */
export function showShareActions(opts = {}) {
  const { title, subtitle, url } = opts;
  // #ifdef H5
  const items = ['分享到朋友圈', '复制链接'];
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      if (res.tapIndex === 0) {
        openShareMoments({ title, subtitle });
      } else if (url) {
        uni.setClipboardData({
          data: url,
          success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
        });
      }
    },
  });
  return;
  // #endif
  // #ifndef H5
  openShareMoments({ title, subtitle });
  // #endif
}
