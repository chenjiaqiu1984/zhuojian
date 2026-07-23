const prisma = require('../db/database');
const { msgSecCheck } = require('./wechat');

class ContentUnsafeError extends Error {
  constructor(message) {
    super(message || '内容含有违规信息，请修改后重试');
    this.name = 'ContentUnsafeError';
    this.status = 400;
    this.code = 'CONTENT_UNSAFE';
  }
}

/**
 * 对用户提交的文本做微信内容安全检测（有 openid 时强制；无凭证/无 openid 时跳过并打日志）
 * @param {string} content
 * @param {number} userId
 * @param {number} [scene=2] 1资料 2评论 3论坛 4社交日志
 */
async function assertTextSafe(content, userId, scene = 2) {
  const text = String(content || '').trim();
  if (!text) return;

  if (!process.env.WX_APPID || !process.env.WX_SECRET) {
    console.warn('[msgSecCheck] skip: WX_APPID/WX_SECRET 未配置');
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { wechatOpenid: true, name: true },
  });

  if (!user?.wechatOpenid) {
    console.warn(`[msgSecCheck] skip: userId=${userId} 无 wechatOpenid`);
    return;
  }

  const r = await msgSecCheck({
    content: text,
    openid: user.wechatOpenid,
    scene,
    nickname: user.name || undefined,
  });

  if (!r.pass) {
    throw new ContentUnsafeError(r.message);
  }
}

function handleContentError(res, err) {
  if (err instanceof ContentUnsafeError || err?.code === 'CONTENT_UNSAFE') {
    return res.status(err.status || 400).json({ error: err.message });
  }
  return null;
}

module.exports = { assertTextSafe, ContentUnsafeError, handleContentError };
