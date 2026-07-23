/**
 * 危机干预检测服务
 * 对用户提交的文本做静默扫描，命中高风险词时记录到数据库
 */

const prisma = require('../db/database');

// 高风险：明确自杀意念 / 计划 / 方式（命中即 high）
const LEVEL_HIGH = [
  // 直接表述
  '自杀', '轻生', '自尽', '寻死', '求死', '去死', '想死', '要死了算了',
  '不想活', '不想活了', '不想再活', '不想活下去', '活不下去', '活不了了',
  '结束生命', '结束自己', '了结自己', '了结生命', '自我了断', '一了百了',
  '死了算了', '死了干净', '死了更好', '不如死了', '还不如死', '不如去死',
  '没有活着的意义', '活着没意思', '活着没有意义', '活着好没意思',
  '没有活下去的理由', '没有存在的意义', '世界没有我会更好',
  '再也不想醒来', '希望自己死掉', '希望自己死了', '只想死', '弄死自己',
  // 方式 / 计划
  '割腕', '割脉', '割动脉', '割喉',
  '跳楼', '跳河', '跳海', '跳桥', '卧轨',
  '上吊', '吊死', '缢死',
  '服药自杀', '吃药死', '吃安眠药死', '过量服药', '吞药自杀',
  '服毒', '喝农药', '煤气自杀', '烧炭', '开煤气',
  '撞车自杀', '以死了结', '计划自杀', '自杀计划', '自杀方式',
  '写好遗书', '留下遗书', '写遗书', '遗书已写',
  '买好绳子', '准备跳楼', '准备自杀',
];

// 中风险：自伤、消失意念、严重绝望（尚无明确致死计划表述）
const LEVEL_MEDIUM = [
  // 自伤
  '伤害自己', '弄伤自己',
  '自残', '自伤', '自虐',
  '割自己', '划自己', '割伤自己', '划伤自己',
  '用刀割', '拿刀划', '戳自己',
  '撞墙', '撞头', '打自己',
  // 消失 / 不存在
  '不想存在', '不想出现', '不想在这世上',
  '消失掉', '消失了更好', '希望自己消失', '想消失', '让我消失',
  '蒸发掉', '人间蒸发', '从世界上消失', '从地球上消失',
  '从未出生', '没有出生就好了', '后悔出生', '不该出生',
  '如果我从没来过', '如果我没存在过',
  // 绝望 / 崩溃边缘
  '痛苦活着', '活着太痛苦', '活着好痛苦',
  '无法承受', '撑不下去', '撑不住了', '扛不下去',
  '崩溃了彻底', '彻底崩溃', '精神崩溃',
  '生无可恋', '心如死灰', '万念俱灰',
  '没有希望了', '看不到希望', '前途一片黑暗',
  '谁也帮不了我', '没有人能救我', '没人救得了我',
  '结束这一切', '让一切结束', '想结束这一切',
  '再撑不下去', '一天也熬不下去',
];

/**
 * 检测文本是否含高风险词
 * @param {string|string[]} texts
 * @returns {{ triggered: boolean, level: 'high'|'medium'|null, matched: string[] }}
 */
function detect(texts) {
  const combined = (Array.isArray(texts) ? texts : [texts])
    .filter(Boolean)
    .join(' ');

  const highMatches = LEVEL_HIGH.filter(w => combined.includes(w));
  if (highMatches.length > 0) return { triggered: true, level: 'high', matched: highMatches };

  const medMatches = LEVEL_MEDIUM.filter(w => combined.includes(w));
  if (medMatches.length > 0) return { triggered: true, level: 'medium', matched: medMatches };

  return { triggered: false, level: null, matched: [] };
}

/**
 * 记录危机事件到数据库（不阻断主流程）
 * @param {{ userId?: number, source: string, content: string, level: string, matched: string[] }} opts
 */
async function record(opts) {
  try {
    await prisma.eventLog.create({
      data: {
        userId: opts.userId || null,
        event: 'crisis_trigger',
        page: '',
        data: JSON.stringify({
          source: opts.source,
          level: opts.level,
          matched: opts.matched,
          snippet: (opts.content || '').slice(0, 200),
        }),
      },
    });
  } catch (e) {
    console.error('[crisis] db log failed:', e.message);
  }
}

module.exports = { detect, record, LEVEL_HIGH, LEVEL_MEDIUM };
