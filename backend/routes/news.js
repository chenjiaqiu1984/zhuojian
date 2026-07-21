const express = require('express');
const prisma = require('../db/database');
const { requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  const { type, page = 1, limit, pageSize, q } = req.query;
  const take = Number(pageSize || limit || 10);
  const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
  const showDraft = isAdmin && req.query.includeDraft === '1';
  const where = {
    ...(showDraft ? {} : { isPublished: 1 }),
    // 非管理员不可见测试中的内容
    ...(isAdmin ? {} : { isTesting: 0 }),
    ...(type ? { type } : {}),
    ...(q ? { title: { contains: q } } : {}),
  };
  const [total, list] = await Promise.all([
    prisma.news.count({ where }),
    prisma.news.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip: (Number(page) - 1) * take }),
  ]);
  const items = await Promise.all(list.map(async n => {
    const [likeCount, favoriteCount] = await Promise.all([
      prisma.newsLike.count({ where: { newsId: n.id } }),
      prisma.newsFavorite.count({ where: { newsId: n.id } }),
    ]);
    return { ...n, likeCount, favoriteCount };
  }));
  res.json({ total, items });
});

router.get('/favorites', ...requireRole('user', 'admin', 'consultant'), async (req, res) => {
  const favs = await prisma.newsFavorite.findMany({ where: { userId: req.user.id }, orderBy: { id: 'desc' } });
  const newsIds = favs.map(f => f.newsId);
  if (!newsIds.length) return res.json([]);
  const list = await prisma.news.findMany({ where: { id: { in: newsIds } } });
  const ordered = newsIds.map(id => list.find(n => n.id === id)).filter(Boolean);
  res.json(ordered.map(n => ({ ...n, isFavorited: true })));
});

router.get('/:id', optionalAuth, async (req, res) => {
  const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
  const where = isAdmin
    ? { id: Number(req.params.id) }
    : { id: Number(req.params.id), isPublished: 1, isTesting: 0 };
  const n = await prisma.news.findFirst({ where });
  if (!n) return res.status(404).json({ error: '未找到' });
  const uid = req.user?.id;
  const [likeCount, favoriteCount, isLiked, isFavorited] = await Promise.all([
    prisma.newsLike.count({ where: { newsId: n.id } }),
    prisma.newsFavorite.count({ where: { newsId: n.id } }),
    uid ? prisma.newsLike.findUnique({ where: { newsId_userId: { newsId: n.id, userId: uid } } }) : null,
    uid ? prisma.newsFavorite.findUnique({ where: { newsId_userId: { newsId: n.id, userId: uid } } }) : null,
  ]);
  res.json({ ...n, likeCount, favoriteCount, isLiked: !!isLiked, isFavorited: !!isFavorited });
});

router.post('/:id/like', ...requireRole('user', 'admin', 'consultant'), async (req, res) => {
  const key = { newsId: Number(req.params.id), userId: req.user.id };
  const exists = await prisma.newsLike.findUnique({ where: { newsId_userId: key } });
  if (exists) await prisma.newsLike.delete({ where: { newsId_userId: key } });
  else await prisma.newsLike.create({ data: key });
  const likeCount = await prisma.newsLike.count({ where: { newsId: key.newsId } });
  res.json({ isLiked: !exists, likeCount });
});

router.post('/:id/favorite', ...requireRole('user', 'admin', 'consultant'), async (req, res) => {
  const key = { newsId: Number(req.params.id), userId: req.user.id };
  const exists = await prisma.newsFavorite.findUnique({ where: { newsId_userId: key } });
  if (exists) await prisma.newsFavorite.delete({ where: { newsId_userId: key } });
  else await prisma.newsFavorite.create({ data: key });
  const favoriteCount = await prisma.newsFavorite.count({ where: { newsId: key.newsId } });
  res.json({ isFavorited: !exists, favoriteCount });
});

function toNewsData(b) {
  const d = { ...b };
  if ('cover_image' in d) { d.coverImage = d.cover_image; delete d.cover_image; }
  if ('video_url' in d) { d.videoUrl = d.video_url; delete d.video_url; }
  if ('is_published' in d) { d.isPublished = d.is_published; delete d.is_published; }
  if ('is_paid' in d) { d.isPaid = d.is_paid ? 1 : 0; delete d.is_paid; }
  if ('is_testing' in d) { d.isTesting = d.is_testing ? 1 : 0; delete d.is_testing; }
  if ('end_date' in d) { d.endDate = d.end_date || null; delete d.end_date; }
  // price 前端传元（如 0.01），后端存分
  if ('price' in d) d.price = Math.round((Number(d.price) || 0) * 100);
  delete d.id; delete d.created_at; delete d.createdAt;
  delete d.likeCount; delete d.favoriteCount;
  return d;
}

router.post('/', ...requireRole('admin'), async (req, res) => {
  const n = await prisma.news.create({ data: toNewsData(req.body) });
  res.json({ id: n.id });
});

router.put('/:id', ...requireRole('admin'), async (req, res) => {
  await prisma.news.update({ where: { id: Number(req.params.id) }, data: toNewsData(req.body) });
  res.json({ ok: true });
});

router.delete('/:id', ...requireRole('admin'), async (req, res) => {
  await prisma.news.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

router.get('/:id/comments', optionalAuth, async (req, res) => {
  const newsId = Number(req.params.id);
  const uid = req.user?.id;
  const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
  if (!uid) return res.json([]);
  const where = isAdmin ? { newsId } : { newsId, OR: [{ userId: uid }, { parentId: { not: null } }] };
  const comments = await prisma.newsComment.findMany({ where, orderBy: { createdAt: 'asc' } });
  // non-admin: only own comments + replies to own comments
  const filtered = isAdmin ? comments : comments.filter(c => c.userId === uid || comments.find(p => p.id === c.parentId && p.userId === uid));
  res.json(filtered);
});

router.post('/:id/comment', ...requireRole('user', 'admin', 'consultant'), async (req, res) => {
  const c = await prisma.newsComment.create({ data: { newsId: Number(req.params.id), userId: req.user.id, content: req.body.content } });
  res.json(c);
});

router.post('/comments/:id/reply', ...requireRole('admin'), async (req, res) => {
  const parent = await prisma.newsComment.findUnique({ where: { id: Number(req.params.id) } });
  if (!parent) return res.status(404).json({ error: '未找到' });
  const c = await prisma.newsComment.create({ data: { newsId: parent.newsId, userId: req.user.id, content: req.body.content, parentId: parent.id } });
  res.json(c);
});

router.delete('/comments/:id', ...requireRole('user', 'admin', 'consultant'), async (req, res) => {
  const c = await prisma.newsComment.findUnique({ where: { id: Number(req.params.id) } });
  if (!c) return res.status(404).json({ error: '未找到' });
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && c.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  await prisma.newsComment.delete({ where: { id: c.id } });
  res.json({ ok: true });
});

module.exports = router;
