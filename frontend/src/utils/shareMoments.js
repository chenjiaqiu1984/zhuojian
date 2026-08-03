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
  kind: 'default', // default | ohcard | assessment | daily
  title: '',
  subtitle: '',
  cards: [],
  assessment: null,
  daily: null,
});

/** 多处挂载时只让「最后注册」的实例渲染弹层/canvas，避免双开与 750px canvas 撑破页面 */
let shareHostSeq = 0;
const shareHostStack = [];
export const activeShareHostId = ref(null);

export function acquireShareMomentsHost() {
  const id = ++shareHostSeq;
  shareHostStack.push(id);
  activeShareHostId.value = id;
  return id;
}

export function releaseShareMomentsHost(id) {
  const i = shareHostStack.lastIndexOf(id);
  if (i >= 0) shareHostStack.splice(i, 1);
  activeShareHostId.value = shareHostStack.length
    ? shareHostStack[shareHostStack.length - 1]
    : null;
}

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
  if (/^data:|^wxfile:\/\//i.test(url) || url.startsWith('blob:')) return url;
  let full = url;
  if (!/^https?:\/\//i.test(url)) {
    const p = url.startsWith('/') ? url : `/${url}`;
    full = SERVER ? `${String(SERVER).replace(/\/$/, '')}${p}` : p;
  }
  // 中文路径（如 /uploads/心境卡/…）需编码，否则小程序 getImageInfo 可能一直不回调
  try {
    const u = new URL(full);
    u.pathname = u.pathname
      .split('/')
      .map((seg) => {
        if (!seg) return seg;
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join('/');
    return u.toString();
  } catch {
    try {
      return encodeURI(full);
    } catch {
      return full;
    }
  }
}

/**
 * 打开「分享到朋友圈」海报弹窗
 * @param {{
 *   title?: string,
 *   subtitle?: string,
 *   kind?: 'default'|'ohcard'|'assessment'|'daily',
 *   cards?: Array<{ imageUrl?: string, word?: string, label?: string }>,
 *   assessment?: { scaleName?: string, score?: string|number, level?: string, typeName?: string, typeDesc?: string, date?: string },
 *   daily?: { date?: string, word?: string, quote?: string },
 * }} [opts]
 */
export function openShareMoments(opts = {}) {
  const cards = (opts.cards || []).map((c) => ({
    imageUrl: absMediaUrl(c.imageUrl),
    word: c.word || '',
    label: c.label || '',
    description: c.description || c.guide || '',
    question: c.question || '',
  }));
  const next = {
    visible: true,
    kind: opts.kind || (cards.length ? 'ohcard' : opts.assessment ? 'assessment' : 'default'),
    title: opts.title || `${MINIPROGRAM_NAME} — ${MINIPROGRAM_TAGLINE}`,
    subtitle: opts.subtitle || MINIPROGRAM_INTRO,
    cards,
    assessment: opts.assessment || null,
    daily: opts.daily || null,
  };
  // #ifdef H5
  // 先确保 H5 宿主已挂载，再打开，避免首次点击无弹层
  Promise.resolve(ensureShareMomentsHost()).finally(() => {
    shareMomentsState.value = next;
  });
  // #endif
  // #ifndef H5
  // 小程序 / App：同步打开；页面需自行挂载 ShareMomentsModal（App.vue 弹层未必盖住当前页）
  shareMomentsState.value = next;
  // #endif
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

/** 每日心境海报 */
export function openDailyShare({ title, subtitle, cards = [], daily } = {}) {
  openShareMoments({
    kind: 'daily',
    title: title || '今日心境',
    subtitle: subtitle || '',
    cards,
    daily: daily || null,
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
