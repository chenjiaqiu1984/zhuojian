/** 心镜岛默认点位（与前端 IslandMap 兜底一致） */
const ISLAND_SPOTS = [
  {
    id: 'cliff',
    name: '正念呼吸',
    tip: '正念呼吸',
    place: '云雾栈道',
    desc: '云雾缭绕的崖边栈道，风轻轻拂过。跟随引导做正念呼吸练习，让呼吸把心带回此刻。',
    cta: '去呼吸',
    cx: 72, cy: 15, hit: 10, labelSide: 'bottom',
    url: '/pages/breathing/select',
    enabled: true,
    sort: 10,
  },
  {
    id: 'news',
    name: '新闻资讯',
    tip: '新闻资讯',
    place: '崖边报亭',
    desc: '崖边立着一座小报亭，风从湖面吹来，带来最新的讯息。在这里浏览心理科普、行业动态与活动公告，了解卓见与心理世界的新鲜故事。',
    cta: '去阅读',
    cx: 20, cy: 32, hit: 9, labelSide: 'bottom',
    url: '/pages/news/index',
    enabled: true,
    sort: 15,
  },
  {
    id: 'lighthouse',
    name: '预约咨询师',
    tip: '预约咨询师',
    place: '云中灯塔',
    desc: '灯塔暖光为你照路。在这里浏览咨询师资料、预约时段，开启一段被看见的专业陪伴。',
    cta: '去预约',
    cx: 42, cy: 24, hit: 10, labelSide: 'bottom',
    url: '/pages/consultants/index',
    enabled: true,
    sort: 20,
  },
  {
    id: 'stairs',
    name: '学习培训',
    tip: '学习培训',
    place: '石阶小径',
    desc: '灯塔下的石阶拾级而上。查看考级报名与培训课程，一步一步走向专业成长。',
    cta: '去学习',
    cx: 59, cy: 37, hit: 9, labelSide: 'right',
    url: '/pages/learning/index',
    enabled: true,
    sort: 30,
  },
  {
    id: 'pavilion',
    name: '咨询工具',
    tip: '咨询工具',
    place: '湖畔沙滩',
    desc: '湖边柔软的沙岸，适合静静坐下来。打开情绪日记、CBT、梦工作等练习工具，慢慢整理内心。',
    cta: '去练习',
    cx: 52, cy: 61, hit: 10, labelSide: 'bottom',
    url: '/pages/homework/index',
    enabled: true,
    sort: 40,
  },
  {
    id: 'cave',
    name: '探索自己',
    tip: '心理测评',
    place: '湖心倒影',
    desc: '望向湖心的倒影，水面映出真实的你。完成专业心理测评，温柔地认识此刻的身心状态。',
    cta: '去测评',
    cx: 30, cy: 60, hit: 8, labelSide: 'bottom',
    url: '/pages/assessment/index',
    enabled: true,
    sort: 50,
  },
  {
    id: 'bridge',
    name: '咨询活动',
    tip: '咨询活动',
    place: '湖心石桥',
    desc: '石桥连起湖的两岸，也连起人与人。报名心理健康主题活动，与伙伴一起探索与成长。',
    cta: '去报名',
    cx: 40, cy: 48, hit: 7, labelSide: 'top',
    url: '/pages/activity/index',
    enabled: true,
    sort: 60,
  },
  {
    id: 'mirror',
    name: '心理图卡',
    tip: '心理图卡',
    place: '立镜之林',
    desc: '林间立着一面椭圆古镜。抽取心理图卡，让图像替你说话，看见内心未曾言说的风景。',
    cta: '去抽卡',
    cx: 78, cy: 56, hit: 10, labelSide: 'bottom',
    url: '/pages/ohcard/index',
    enabled: true,
    sort: 70,
  },
  {
    id: 'garden',
    name: '曼达拉',
    tip: '曼达拉',
    place: '花间草地',
    desc: '镜旁花开成片的草地，适合静心创作。用色彩画出曼达拉，在一圈一圈中找回平静与专注。',
    cta: '去创作',
    cx: 88, cy: 68, hit: 9, labelSide: 'left',
    url: '/pages/mandala/index',
    enabled: true,
    sort: 80,
  },
  {
    id: 'beast',
    name: '情绪怪兽',
    tip: '情绪怪兽',
    place: '瀑布洞窟',
    desc: '瀑布后的山洞里，住着你的情绪小怪兽。创建、喂养并陪伴它，学会看见情绪、与它和解。',
    cta: '去看看',
    cx: 26, cy: 75, hit: 11, labelSide: 'bottom',
    url: '/pages/monster/index',
    enabled: true,
    sort: 90,
  },
  {
    id: 'cabin',
    name: '个人中心',
    tip: '个人中心',
    place: '岸边木屋',
    desc: '岸边木屋灯火温暖，像属于你的小屋。查看预约、订单、券码与成就，安顿好自己的日常。',
    cta: '进入',
    cx: 72, cy: 84, hit: 10, labelSide: 'top',
    url: '/pages/profile/index',
    enabled: true,
    sort: 100,
  },
  {
    id: 'pier',
    name: '解压捏捏乐',
    tip: '解压捏捏乐',
    place: '湖畔栈桥',
    desc: '伸向湖面的小栈桥，适合歇一歇脚。玩玩捏捏乐，指尖一点戳破烦恼，让压力随泡泡散开。',
    cta: '去解压',
    cx: 48, cy: 91, hit: 9, labelSide: 'top',
    url: '/pages/squeeze/index',
    enabled: true,
    sort: 110,
  },
];

const CONFIG_KEY = 'island_spots';

const LABEL_SIDES = ['top', 'bottom', 'left', 'right'];

function cloneDefaults() {
  return JSON.parse(JSON.stringify(ISLAND_SPOTS));
}

function normalizeSpot(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  if (!id) return null;
  const labelSide = LABEL_SIDES.includes(raw.labelSide) ? raw.labelSide : 'bottom';
  const clamp = (n, min, max, fallback) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };
  return {
    id,
    name: String(raw.name || id).trim() || id,
    tip: String(raw.tip || raw.name || id).trim() || id,
    place: String(raw.place || '').trim(),
    desc: String(raw.desc || '').trim(),
    cta: String(raw.cta || '进入').trim() || '进入',
    cx: clamp(raw.cx, 0, 100, 50),
    cy: clamp(raw.cy, 0, 100, 50),
    hit: clamp(raw.hit, 3, 25, 10),
    labelSide,
    url: String(raw.url || '').trim(),
    enabled: raw.enabled !== false,
    sort: Number.isFinite(Number(raw.sort)) ? Number(raw.sort) : (index + 1) * 10,
  };
}

function normalizeSpots(list) {
  if (!Array.isArray(list)) return cloneDefaults();
  const out = [];
  const seen = new Set();
  list.forEach((item, i) => {
    const spot = normalizeSpot(item, i);
    if (!spot || seen.has(spot.id)) return;
    seen.add(spot.id);
    out.push(spot);
  });
  return out.length ? out : cloneDefaults();
}

function sortSpots(list) {
  return [...list].sort((a, b) => (a.sort - b.sort) || a.id.localeCompare(b.id));
}

module.exports = {
  CONFIG_KEY,
  ISLAND_SPOTS,
  LABEL_SIDES,
  cloneDefaults,
  normalizeSpot,
  normalizeSpots,
  sortSpots,
};
