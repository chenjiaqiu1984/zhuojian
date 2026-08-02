const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');
const { checkAchievements } = require('./achievements');

const router = express.Router();
const auth = requireRole('user', 'admin', 'consultant');
const adminAuth = requireRole('admin');

/** platform=写给平台（仅管理员可见）；self=写给自己（仅本人可见） */
const CATEGORIES = new Set(['platform', 'self']);
const MAX_LEN = 1000;

function normalizeCategory(raw) {
  if (raw === 'feedback') return 'platform'; // 兼容旧值「意见建议」
  if (raw === 'emotion') return 'self';     // 兼容旧值「一个情绪」
  if (CATEGORIES.has(raw)) return raw;
  return 'self';
}

function visibilityFor(category) {
  return category === 'platform' ? 'admin' : 'private';
}

function publicMineItem(p) {
  return {
    id: p.id,
    content: p.content,
    category: normalizeCategory(p.category),
    visibility: visibilityFor(normalizeCategory(p.category)),
    adminReply: p.adminReply,
    createdAt: p.createdAt,
  };
}

/** 我的树洞记录（含写给自己 + 写给平台） */
router.get('/mine', ...auth, async (req, res) => {
  const list = await prisma.treeholePost.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(list.map(publicMineItem));
});

/** 投递一条：可见性由类型决定，不再支持匿名上墙 */
router.post('/', ...auth, async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    const category = normalizeCategory(req.body.category);
    const visibility = visibilityFor(category);

    if (!content) return res.status(400).json({ error: '请写下想说的话' });
    if (content.length > MAX_LEN) return res.status(400).json({ error: `内容不能超过${MAX_LEN}字` });

    const crisis = require('../services/crisisDetect');
    const post = await prisma.treeholePost.create({
      data: { userId: req.user.id, content, category, visibility },
    });

    const cr = crisis.detect([content]);
    if (cr.triggered) {
      crisis.record({ userId: req.user.id, source: 'treehole', content, ...cr });
    }

    try {
      await prisma.eventLog.create({
        data: {
          userId: req.user.id,
          event: 'treehole_save',
          page: '/pages/treehole/index',
          data: JSON.stringify({ category, id: post.id }),
        },
      });
    } catch (_) {}

    const newAchievements = await checkAchievements(req.user.id, 'treehole');
    res.json({ ...publicMineItem(post), crisis: cr.triggered, newAchievements });
  } catch (err) {
    console.error('[treehole] create failed', err);
    res.status(500).json({ error: '投递失败，请稍后再试' });
  }
});

/** 删除自己的记录 */
router.delete('/:id', ...auth, async (req, res) => {
  const post = await prisma.treeholePost.findUnique({ where: { id: Number(req.params.id) } });
  if (!post || post.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  await prisma.treeholePost.delete({ where: { id: post.id } });
  try {
    await prisma.eventLog.create({
      data: {
        userId: req.user.id,
        event: 'treehole_delete',
        page: '/pages/treehole/index',
        data: JSON.stringify({ id: post.id, category: post.category }),
      },
    });
  } catch (_) {}
  res.json({ ok: true });
});

function isAdminVisible(post) {
  if (!post) return false;
  if (post.visibility === 'anonymous') return true;
  return normalizeCategory(post.category) === 'platform';
}

/** 管理端：写给平台 / 历史匿名上墙；绝不返回「写给自己」私密内容 */
router.get('/admin', ...adminAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const scope = req.query.scope === 'anonymous' ? 'anonymous' : 'platform';

  const where = scope === 'anonymous'
    ? { visibility: 'anonymous' }
    : {
        category: { in: ['platform', 'feedback'] },
        NOT: { visibility: 'anonymous' },
      };

  if (scope === 'anonymous' && (req.query.status === 'visible' || req.query.status === 'hidden')) {
    where.status = req.query.status;
  }

  const [total, list] = await Promise.all([
    prisma.treeholePost.count({ where }),
    prisma.treeholePost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, username: true, phone: true } } },
    }),
  ]);
  res.json({
    total,
    page,
    scope,
    list: list.map(p => ({
      ...p,
      category: scope === 'anonymous' ? p.category : normalizeCategory(p.category),
      visibility: p.visibility === 'anonymous' ? 'anonymous' : 'admin',
    })),
  });
});

/** 管理端：回复；匿名上墙可隐藏/恢复 */
router.patch('/admin/:id', ...adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const post = await prisma.treeholePost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: '不存在' });
    if (!isAdminVisible(post)) {
      return res.status(403).json({ error: '写给自己的内容仅用户本人可见，管理员不可操作' });
    }

    const data = {};
    if (typeof req.body.adminReply === 'string') {
      data.adminReply = req.body.adminReply.trim() || null;
    }
    if (post.visibility === 'anonymous' && (req.body.status === 'visible' || req.body.status === 'hidden')) {
      data.status = req.body.status;
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: '无有效更新' });

    const updated = await prisma.treeholePost.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    console.error('[treehole] admin patch failed', err);
    res.status(500).json({ error: '操作失败' });
  }
});

/** 管理端：删除匿名上墙记录 */
router.delete('/admin/:id', ...adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const post = await prisma.treeholePost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: '不存在' });
    if (post.visibility !== 'anonymous') {
      return res.status(403).json({ error: '仅可删除匿名上墙记录' });
    }
    await prisma.treeholePost.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[treehole] admin delete failed', err);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
