/**
 * 危机干预检测服务
 * 对用户提交的文本做静默扫描，命中高风险词时记录到数据库
 */

const prisma = require('../db/database');

// 高风险词库（分级）
const LEVEL_HIGH = [
  '自杀', '轻生', '结束生命', '不想活', '去死', '死了算了',
  '割腕', '跳楼', '上吊', '吃药死', '服毒', '自尽',
  '活不下去', '没有活着的意义', '活着没意思',
];

const LEVEL_MEDIUM = [
  '伤害自己', '自残', '自伤', '割自己',
  '不想存在', '消失掉', '希望自己消失',
  '痛苦活着', '无法承受',
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
        meta: JSON.stringify({
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

module.exports = { detect, record };
