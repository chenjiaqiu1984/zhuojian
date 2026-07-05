const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const admin = requireRole('admin');

// GET /api/crisis/events — 危机事件列表（管理员）
router.get('/events', ...admin, async (req, res) => {
  const { page = 1, pageSize = 20, level, followed } = req.query;
  const skip = (Number(page) - 1) * Number(pageSize);

  const where = {
    event: 'crisis_trigger',
    ...(level ? { meta: { contains: `"level":"${level}"` } } : {}),
    ...(followed === 'true'  ? { meta: { contains: '"followed":true' } }  : {}),
    ...(followed === 'false' ? { meta: { not: { contains: '"followed":true' } } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.eventLog.count({ where }),
    prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(pageSize),
    }),
  ]);

  // 解析 meta JSON，并附带用户信息
  const data = await Promise.all(rows.map(async r => {
    let meta = {};
    try { meta = JSON.parse(r.meta || '{}'); } catch (_) {}
    let user = null;
    if (r.userId) {
      user = await prisma.user.findUnique({
        where: { id: r.userId },
        select: { id: true, name: true, phone: true, username: true },
      });
    }
    return { id: r.id, userId: r.userId, createdAt: r.createdAt, user, ...meta };
  }));

  res.json({ total, data });
});

// PUT /api/crisis/events/:id/follow — 标记人工跟进
router.put('/events/:id/follow', ...admin, async (req, res) => {
  const row = await prisma.eventLog.findUnique({ where: { id: Number(req.params.id) } });
  if (!row) return res.status(404).json({ error: '未找到' });

  let meta = {};
  try { meta = JSON.parse(row.meta || '{}'); } catch (_) {}
  meta.followed = true;
  meta.followedAt = new Date().toISOString();
  meta.followNote = req.body.note || '';

  await prisma.eventLog.update({
    where: { id: row.id },
    data: { meta: JSON.stringify(meta) },
  });
  res.json({ ok: true });
});

// DELETE /api/crisis/events/:id — 删除单条记录
router.delete('/events/:id', ...admin, async (req, res) => {
  await prisma.eventLog.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

module.exports = router;
