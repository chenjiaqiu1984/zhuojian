const express = require('express');
const prisma = require('../db/database');
const { requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  const { type, page = 1, limit = 10 } = req.query;
  const showDraft = req.user?.role === 'admin' && req.query.includeDraft === '1';
  const where = { ...(showDraft ? {} : { isPublished: 1 }), ...(type ? { type } : {}) };
  const list = await prisma.news.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limit), skip: (Number(page) - 1) * Number(limit) });
  const withCounts = await Promise.all(list.map(async n => {
    const [likeCount, favoriteCount] = await Promise.all([
      prisma.newsLike.count({ where: { newsId: n.id } }),
      prisma.newsFavorite.count({ where: { newsId: n.id } }),
    ]);
    return { ...n, likeCount, favoriteCount };
  }));
  res.json(withCounts);
});

router.get('/:id', optionalAuth, async (req, res) => {
  const n = await prisma.news.findFirst({ where: { id: Number(req.params.id), isPublished: 1 } });
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
  const isAdmin = req.user?.role === 'admin';
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
  if (req.user.role !== 'admin' && c.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  await prisma.newsComment.delete({ where: { id: c.id } });
  res.json({ ok: true });
});

module.exports = router;
