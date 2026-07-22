/**
 * 微信小程序页面分享配置
 * 用法（script setup 顶部）：
 * // #ifndef H5
 * import { createMpShare } from '@/utils/mpShare';
 * defineOptions(createMpShare('mandala/index'));
 * // #endif
 */

const DEFAULT = {
  app: { title: '卓见心理 — 专业心理服务平台', path: '/pages/index/index' },
  timeline: { title: '卓见心理 — 一对一咨询 · 心理测评 · 自助工具' },
};

/** @type {Record<string, { app: object|Function, timeline: object|Function }>} */
const SHARE_CONFIGS = {
  'index/index': DEFAULT,
  'consultants/index': {
    app: { title: '卓见心理 — 专业心理咨询师团队', path: '/pages/consultants/index' },
    timeline: { title: '卓见心理 — 每一位咨询师都经过严格认证' },
  },
  'consultants/schedule': {
    app: { title: '卓见心理 — 专业心理咨询师团队', path: '/pages/consultants/index' },
    timeline: { title: '卓见心理 — 专业陪伴，守护心理健康' },
  },
  'ohcard/imgonly': {
    app: { title: '我在用卓见心理图卡探索内心，快来试试', path: '/pages/ohcard/index' },
    timeline: { title: '卓见心理图卡 — 让图像成为语言，看见内心深处的声音' },
  },
  'ohcard/sort': {
    app: { title: '我在用卓见心理图卡排序玩法探索内心', path: '/pages/ohcard/index' },
    timeline: { title: '卓见心理图卡 — 图卡排序，梳理内心优先级' },
  },
  'ohcard/match': {
    app: { title: '我在用卓见心理图字匹配玩法探索内心', path: '/pages/ohcard/index' },
    timeline: { title: '卓见心理图卡 — 图字匹配，发现内在联结' },
  },
  'ohcard/room': {
    app: { title: '来卓见心理图卡房间，一起抽卡探索', path: '/pages/ohcard/index' },
    timeline: { title: '卓见心理图卡 — 房间抽卡，共享探索之旅' },
  },
  'ohcard/record': {
    app: { title: '我的卓见心理图卡抽卡记录', path: '/pages/ohcard/index' },
    timeline: { title: '卓见心理图卡 — 记录每一次内心的对话' },
  },
  'assessment/results': {
    app: { title: '卓见心理测评中心 — 了解真实的自己', path: '/pages/assessment/index' },
    timeline: { title: '卓见心理测评 — 让测评成为认识自己的镜子' },
  },
  'assessment/my': {
    app: { title: '卓见心理测评中心 — 了解真实的自己', path: '/pages/assessment/index' },
    timeline: { title: '卓见心理测评 — 记录自我探索的每一步' },
  },
  'profile/index': {
    app: { title: '卓见心理 — 专业心理服务平台', path: '/pages/index/index' },
    timeline: { title: '卓见心理 — 一对一咨询 · 心理测评 · 自助工具' },
  },
  'profile/settings': DEFAULT,
  'profile/vouchers': DEFAULT,
  'profile/packages': DEFAULT,
  'profile/coupons': DEFAULT,
  'profile/achievements': {
    app: { title: '我在卓见心理解锁了好多成就，快来看看', path: '/pages/index/index' },
    timeline: { title: '卓见心理 — 解锁成就，记录成长' },
  },
  'login/index': DEFAULT,
  'login/register': DEFAULT,
  'login/reset': DEFAULT,
  'login/complete': DEFAULT,
  'about/index': {
    app: { title: '卓见心理·艺术疗愈 — 在创造中，遇见真实的自己', path: '/pages/about/index' },
    timeline: { title: '卓见心理·艺术疗愈 — 开启心灵的旅程' },
  },
  'booking/index': {
    app: { title: '卓见心理 — 预约专业心理咨询', path: '/pages/consultants/index' },
    timeline: { title: '卓见心理 — 专业陪伴，守护心理健康' },
  },
  'payment/index': {
    app: { title: '卓见心理 — 专业心理服务平台', path: '/pages/index/index' },
    timeline: DEFAULT.timeline,
  },
  'payment/result': {
    app: { title: '卓见心理 — 专业心理服务平台', path: '/pages/index/index' },
    timeline: DEFAULT.timeline,
  },
  'orders/index': {
    app: { title: '卓见心理 — 专业心理服务平台', path: '/pages/index/index' },
    timeline: DEFAULT.timeline,
  },
  'monster/index': {
    app: { title: '我在卓见心理的怪兽小屋，画出内心的小怪兽', path: '/pages/monster/index' },
    timeline: { title: '卓见心理怪兽小屋 — 每天陪情绪小怪兽慢慢长大' },
  },
  'monster/create': {
    app: { title: '我在创建情绪小怪兽，一起来探索内心', path: '/pages/monster/index' },
    timeline: { title: '卓见心理怪兽小屋 — 用画笔表达情绪' },
  },
  'monster/detail': {
    app: { title: '我的情绪小怪兽在卓见心理长大了', path: '/pages/monster/index' },
    timeline: { title: '卓见心理怪兽小屋 — 陪伴情绪，慢慢疗愈' },
  },
  'mandala/index': {
    app: { title: '我在卓见心理创作曼达拉，一起来放松吧', path: '/pages/mandala/index' },
    timeline: { title: '卓见心理曼达拉 — 用色彩与图案探索内心的平静' },
  },
  'mandala/draw': {
    app: { title: '我正在创作曼达拉，用色彩探索内心', path: '/pages/mandala/index' },
    timeline: { title: '卓见心理曼达拉 — 正念冥想，随心创作' },
  },
  'mandala/gallery': {
    app: { title: '我的曼达拉画廊 — 卓见心理', path: '/pages/mandala/index' },
    timeline: { title: '卓见心理曼达拉 — 记录每一次创作的色彩' },
  },
  'breathing/index': {
    app: { title: '我在用卓见心理做正念呼吸练习，一起来放松吧', path: '/pages/breathing/select' },
    timeline: { title: '卓见心理正念呼吸 — 找到属于你的呼吸节奏' },
  },
  'news/index': {
    app: { title: '卓见心理 — 心理科普与行业动态', path: '/pages/news/index' },
    timeline: { title: '卓见心理动态 — 知识 · 洞见' },
  },
  'homework/index': {
    app: { title: '卓见心理咨询工具 — 系统化心理练习', path: '/pages/homework/index' },
    timeline: { title: '卓见心理咨询工具 — 陪伴你持续成长' },
  },
  'homework/mood': {
    app: { title: '我在用卓见心理记录情绪日记', path: '/pages/homework/index' },
    timeline: { title: '卓见心理情绪日记 — 觉察情绪，理解自己' },
  },
  'homework/cbt': {
    app: { title: '我在用卓见心理做认知记录练习', path: '/pages/homework/index' },
    timeline: { title: '卓见心理认知记录 — 看见思维，改变情绪' },
  },
  'homework/dream': {
    app: { title: '我在用卓见心理记录梦的工作', path: '/pages/homework/index' },
    timeline: { title: '卓见心理梦的工作 — 探索潜意识的语言' },
  },
  'homework/iceberg': {
    app: { title: '我在用卓见心理探索冰山模型', path: '/pages/homework/index' },
    timeline: { title: '卓见心理冰山模型 — 看见行为背后的需求' },
  },
  'homework/rule': {
    app: { title: '我在用卓见心理做规条转换练习', path: '/pages/homework/index' },
    timeline: { title: '卓见心理规条转换 — 松动限制性信念' },
  },
  'homework/help': {
    app: { title: '卓见心理咨询工具 — 申请专业解读', path: '/pages/homework/index' },
    timeline: { title: '卓见心理咨询工具 — 专业陪伴持续成长' },
  },
  'admin/packages': DEFAULT,
  'admin/coupons': DEFAULT,
  'admin/users': DEFAULT,
  'legal/terms': {
    app: { title: '卓见心理 — 用户服务协议', path: '/pages/about/index' },
    timeline: { title: '卓见心理 — 专业心理服务平台' },
  },
  'legal/privacy': {
    app: { title: '卓见心理 — 隐私政策', path: '/pages/about/index' },
    timeline: { title: '卓见心理 — 专业心理服务平台' },
  },
  'learning/index': {
    app: { title: '卓见心理学习进阶 — 持续探索内心世界', path: '/pages/learning/index' },
    timeline: { title: '卓见心理学习进阶 — 知识与实践并行' },
  },
  'treehole/index': {
    app: { title: '卓见心理树洞 — 悄悄说心里话', path: '/pages/treehole/index' },
    timeline: { title: '卓见心理树洞 — 倾听与被倾听的角落' },
  },
};

/**
 * @param {string} pageKey 如 'mandala/index'
 * @param {{ app?: object|Function, timeline?: object|Function }} [overrides]
 */
export function createMpShare(pageKey, overrides = {}) {
  const base = SHARE_CONFIGS[pageKey] || DEFAULT;
  const config = {
    app: overrides.app ?? base.app,
    timeline: overrides.timeline ?? base.timeline,
  };
  return {
    onShareAppMessage() {
      return typeof config.app === 'function' ? config.app() : config.app;
    },
    onShareTimeline() {
      return typeof config.timeline === 'function' ? config.timeline() : config.timeline;
    },
  };
}
