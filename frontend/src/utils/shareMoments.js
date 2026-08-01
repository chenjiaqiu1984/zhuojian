import { createApp, ref } from 'vue';
import { SERVER } from '../config';
import {
  MINIPROGRAM_INTRO,
  MINIPROGRAM_NAME,
  MINIPROGRAM_SCAN_HINT,
  MINIPROGRAM_TAGLINE,
  wxacodeLocalUrl,
} from './miniprogramPromo';

export const shareMomentsState = ref({
  visible: false,
  kind: 'default', // default | ohcard | assessment
  title: '',
  subtitle: '',
  cards: [],
  assessment: null,
});

let h5HostPromise = null;

/**
 * H5：uni-app 会用 Layout 覆盖 App.vue 模板，App 里的弹窗不会挂载。
 * 因此在 body 上单独挂一份 ShareMomentsModal。
 */
export function ensureShareMomentsHost() {
  // #ifdef H5
  if (typeof document === 'undefined') return Promise.resolve();
  if (h5HostPromise) return h5HostPromise;
  h5HostPromise = import('../components/ShareMomentsModal.vue')
    .then((mod) => {
      let el = document.getElementById('share-moments-host');
      if (!el) {
        el = document.createElement('div');
        el.id = 'share-moments-host';
        document.body.appendChild(el);
      }
      createApp(mod.default).mount(el);
    })
    .catch((err) => {
      h5HostPromise = null;
      console.error('[shareMoments] mount host failed', err);
    });
  return h5HostPromise;
  // #endif
  // #ifndef H5
  return Promise.resolve();
  // #endif
}

/** 拼成可加载的绝对图片地址（小程序 canvas / getImageInfo 需要） */
export function absMediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('wxfile://')) return url;
  const p = url.startsWith('/') ? url : `/${url}`;
  if (SERVER) return `${String(SERVER).replace(/\/$/, '')}${p}`;
  return p;
}

/**
 * 打开「分享到朋友圈」海报弹窗
 * @param {{
 *   title?: string,
 *   subtitle?: string,
 *   kind?: 'default'|'ohcard'|'assessment',
 *   cards?: Array<{ imageUrl?: string, word?: string, label?: string }>,
 *   assessment?: { scaleName?: string, score?: string|number, level?: string, typeName?: string, typeDesc?: string, date?: string },
 * }} [opts]
 */
export function openShareMoments(opts = {}) {
  const cards = (opts.cards || []).map((c) => ({
    imageUrl: absMediaUrl(c.imageUrl),
    word: c.word || '',
    label: c.label || '',
  }));
  const next = {
    visible: true,
    kind: opts.kind || (cards.length ? 'ohcard' : opts.assessment ? 'assessment' : 'default'),
    title: opts.title || `${MINIPROGRAM_NAME} — ${MINIPROGRAM_TAGLINE}`,
    subtitle: opts.subtitle || MINIPROGRAM_INTRO,
    cards,
    assessment: opts.assessment || null,
  };
  // 先确保 H5 宿主已挂载，再打开，避免首次点击无弹层
  Promise.resolve(ensureShareMomentsHost()).finally(() => {
    shareMomentsState.value = next;
  });
}

/** 抽卡结果分享 */
export function openOhcardShare({ title, subtitle, cards = [] } = {}) {
  openShareMoments({
    kind: 'ohcard',
    title: title || '我抽到了这些图卡 — 卓见心理',
    subtitle: subtitle || '图像会说话，看见内心深处的声音',
    cards,
  });
}

/** 测评结果分享 */
export function openAssessmentShare({ title, subtitle, assessment } = {}) {
  openShareMoments({
    kind: 'assessment',
    title: title || '我完成了一项心理测评 — 卓见心理',
    subtitle: subtitle || '了解真实的自己',
    assessment: assessment || null,
  });
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
 * @param {{ title?: string, subtitle?: string, url?: string, kind?: string, cards?: any[], assessment?: object }} opts
 */
export function showShareActions(opts = {}) {
  const { title, subtitle, url, kind, cards, assessment } = opts;
  // #ifdef H5
  const items = ['分享到朋友圈', '复制链接'];
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      if (res.tapIndex === 0) {
        openShareMoments({ title, subtitle, kind, cards, assessment });
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
  openShareMoments({ title, subtitle, kind, cards, assessment });
  // #endif
}
