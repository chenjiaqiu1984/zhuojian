const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const auth = requireRole('user', 'admin', 'consultant');
const adminAuth = requireRole('admin');

const CATEGORIES = new Set(['feedback', 'emotion', 'self']);
const VISIBILITIES = new Set(['private', 'anonymous']);
const MAX_LEN = 1000;

const ANON_NAMES = [
  '一棵小树', '夜风', '云朵', '溪流', '星光',
  '落叶', '微光', '晨露', '远山', '青苔',
  '灯火', '归鸟', '雨声', '月光', '风铃',
];

function anonName(id) {
  return ANON_NAMES[id % ANON_NAMES.length];
}

function publicItem(p) {
  return {
    id: p.id,
    content: p.content,
    category: p.category,
    createdAt: p.createdAt,
    anonName: anonName(p.id),
  };
}

/** 匿名树洞墙（无需登录） */
router.get('/wall', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const where = { visibility: 'anonymous', status: 'visible' };
  const [total, list] = await Promise.all([
    prisma.treeholePost.count({ where }),
    prisma.treeholePost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  res.json({ total, page, list: list.map(publicItem) });
});

/** 我的树洞记录 */
router.get('/mine', ...auth, async (req, res) => {
  const list = await prisma.treeholePost.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(list.map(p => ({
    id: p.id,
    content: p.content,
    category: p.category,
    visibility: p.visibility,
    status: p.status,
    adminReply: p.adminReply,
    createdAt: p.createdAt,
  })));
});

/** 投递一条 */
router.post('/', ...auth, async (req, res) => {
  const content = String(req.body.content || '').trim();
  const category = CATEGORIES.has(req.body.category) ? req.body.category : 'emotion';
  const visibility = VISIBILITIES.has(req.body.visibility) ? req.body.visibility : 'private';

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

  res.json({
    id: post.id,
    content: post.content,
    category: post.category,
    visibility: post.visibility,
    status: post.status,
    createdAt: post.createdAt,
    crisis: cr.triggered,
  });
});

/** 删除自己的记录 */
router.delete('/:id', ...auth, async (req, res) => {
  const post = await prisma.treeholePost.findUnique({ where: { id: Number(req.params.id) } });
  if (!post || post.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  await prisma.treeholePost.delete({ where: { id: post.id } });
  res.json({ ok: true });
});

/** 管理端：列表 */
router.get('/admin', ...adminAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const where = {};
  if (req.query.category && CATEGORIES.has(req.query.category)) where.category = req.query.category;
  if (req.query.visibility && VISIBILITIES.has(req.query.visibility)) where.visibility = req.query.visibility;
  if (req.query.status === 'visible' || req.query.status === 'hidden') where.status = req.query.status;

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
  res.json({ total, page, list });
});

/** 管理端：隐藏/恢复/回复 */
router.patch('/admin/:id', ...adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const post = await prisma.treeholePost.findUnique({ where: { id } });
  if (!post) return res.status(404).json({ error: '不存在' });

  const data = {};
  if (req.body.status === 'visible' || req.body.status === 'hidden') data.status = req.body.status;
  if (typeof req.body.adminReply === 'string') {
    data.adminReply = req.body.adminReply.trim() || null;
  }
  if (!Object.keys(data).length) return res.status(400).json({ error: '无有效更新' });

  const updated = await prisma.treeholePost.update({ where: { id }, data });
  res.json(updated);
});

module.exports = router;
