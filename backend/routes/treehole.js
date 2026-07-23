const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');

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

    res.json({ ...publicMineItem(post), crisis: cr.triggered });
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
  res.json({ ok: true });
});

/** 管理端：仅「写给平台」（含旧 feedback），绝不返回「写给自己」 */
router.get('/admin', ...adminAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const where = {
    category: { in: ['platform', 'feedback'] },
  };

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
    list: list.map(p => ({
      ...p,
      category: normalizeCategory(p.category),
      visibility: 'admin',
    })),
  });
});

/** 管理端：回复（仅平台留言） */
router.patch('/admin/:id', ...adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const post = await prisma.treeholePost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: '不存在' });

    const cat = normalizeCategory(post.category);
    if (cat !== 'platform') {
      return res.status(403).json({ error: '写给自己的内容仅用户本人可见，管理员不可操作' });
    }

    const data = {};
    if (typeof req.body.adminReply === 'string') {
      data.adminReply = req.body.adminReply.trim() || null;
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: '无有效更新' });

    const updated = await prisma.treeholePost.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    console.error('[treehole] admin patch failed', err);
    res.status(500).json({ error: '操作失败' });
  }
});

module.exports = router;
