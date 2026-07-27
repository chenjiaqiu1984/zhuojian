import { remoteUrl, staticUrl } from '../config';

/** 小程序名称 */
export const MINIPROGRAM_NAME = '卓见心理';

/** 小程序一句话介绍 */
export const MINIPROGRAM_TAGLINE = '专业心理服务平台';

/** 小程序功能介绍（分享海报 / 朋友圈文案） */
export const MINIPROGRAM_INTRO = '一对一咨询 · 心理测评 · 自助工具 · 艺术疗愈';

/** 扫码引导语 */
export const MINIPROGRAM_SCAN_HINT = '长按识别小程序码，打开微信小程序';

/** 包内 / H5 静态路径 */
export const WXACODE_PATH = '/static/wxacode.jpg';

/** 本地展示用 URL */
export function wxacodeLocalUrl() {
  return staticUrl(WXACODE_PATH);
}

/** 朋友圈分享 imageUrl（需可访问的网络地址） */
export function wxacodeShareUrl() {
  return remoteUrl(WXACODE_PATH) || staticUrl(WXACODE_PATH);
}

/**
 * 为 onShareTimeline 返回值补充小程序码与介绍相关字段
 * @param {object|Function} timeline
 */
export function enrichTimeline(timeline) {
  if (typeof timeline === 'function') {
    return () => enrichTimeline(timeline());
  }
  const base = timeline || {};
  return {
    ...base,
    imageUrl: base.imageUrl || wxacodeShareUrl(),
    title: base.title || `${MINIPROGRAM_NAME} — ${MINIPROGRAM_INTRO}`,
  };
}

/**
 * 快捷构建朋友圈分享配置
 * @param {string} title
 * @param {object} [extra]
 */
export function buildTimelineShare(title, extra = {}) {
  return enrichTimeline({ title, ...extra });
}
