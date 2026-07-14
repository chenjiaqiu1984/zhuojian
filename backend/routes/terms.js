const express = require('express');
const prisma = require('../db/database');
const { requireRole, authMiddleware } = require('../middleware/auth');

const router = express.Router();
const admin = requireRole('admin');

// GET /api/terms/current?type=terms|privacy — 获取当前已发布的最新版本（公开）
router.get('/current', async (req, res) => {
  const type = req.query.type || 'terms';
  const row = await prisma.termsVersion.findFirst({
    where: { isDraft: 0, type },
    orderBy: { publishedAt: 'desc' },
  });
  res.json(row || null);
});

// POST /api/terms/accept — 用户接受当前版本
// body: { type: 'terms' | 'privacy' }，不传默认 'terms'
router.post('/accept', authMiddleware, async (req, res) => {
  const type = req.body.type === 'privacy' ? 'privacy' : 'terms';
  const current = await prisma.termsVersion.findFirst({
    where: { isDraft: 0, type },
    orderBy: { publishedAt: 'desc' },
  });
  if (!current) return res.status(404).json({ error: '暂无已发布协议' });

  const field = type === 'privacy' ? 'privacyVersion' : 'termsVersion';
  const data = { [field]: current.version };
  if (type === 'terms') data.termsAcceptedAt = new Date();

  await prisma.user.update({ where: { id: req.user.id }, data });
  res.json({ ok: true, type, version: current.version });
});

// ── Admin 接口 ────────────────────────────────────────────────────

// GET /api/terms/all?type=terms|privacy — 版本列表（admin）
router.get('/all', ...admin, async (req, res) => {
  const where = req.query.type ? { type: req.query.type } : {};
  const rows = await prisma.termsVersion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, type: true, version: true, title: true, isDraft: true, publishedAt: true, createdAt: true },
  });
  res.json(rows);
});

// GET /api/terms/:id — 单个版本详情（admin）
router.get('/:id', ...admin, async (req, res) => {
  const row = await prisma.termsVersion.findUnique({ where: { id: Number(req.params.id) } });
  if (!row) return res.status(404).json({ error: '未找到' });
  res.json(row);
});

// POST /api/terms — 新建草稿（admin）
router.post('/', ...admin, async (req, res) => {
  const { type = 'terms', version, title, content } = req.body;
  if (!version || !content) return res.status(400).json({ error: '版本号和内容必填' });
  const defaultTitle = type === 'privacy' ? '隐私政策' : '用户服务协议';
  const row = await prisma.termsVersion.create({
    data: { type, version, title: title || defaultTitle, content, isDraft: 1 },
  });
  res.json({ id: row.id });
});

// PUT /api/terms/:id — 编辑草稿内容（admin）
router.put('/:id', ...admin, async (req, res) => {
  const row = await prisma.termsVersion.findUnique({ where: { id: Number(req.params.id) } });
  if (!row) return res.status(404).json({ error: '未找到' });
  if (!row.isDraft) return res.status(400).json({ error: '已发布版本不可编辑，请新建草稿' });
  const { version, title, content } = req.body;
  await prisma.termsVersion.update({
    where: { id: row.id },
    data: { version, title, content },
  });
  res.json({ ok: true });
});

// POST /api/terms/:id/publish — 发布版本（admin）
router.post('/:id/publish', ...admin, async (req, res) => {
  const row = await prisma.termsVersion.findUnique({ where: { id: Number(req.params.id) } });
  if (!row) return res.status(404).json({ error: '未找到' });
  if (!row.isDraft) return res.status(400).json({ error: '已发布' });
  await prisma.termsVersion.update({
    where: { id: row.id },
    data: { isDraft: 0, publishedAt: new Date() },
  });
  res.json({ ok: true });
});

// DELETE /api/terms/:id — 删除草稿（admin，已发布不可删）
router.delete('/:id', ...admin, async (req, res) => {
  const row = await prisma.termsVersion.findUnique({ where: { id: Number(req.params.id) } });
  if (!row) return res.status(404).json({ error: '未找到' });
  if (!row.isDraft) return res.status(400).json({ error: '已发布版本不可删除' });
  await prisma.termsVersion.delete({ where: { id: row.id } });
  res.json({ ok: true });
});

module.exports = router;
