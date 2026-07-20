const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const auth = requireRole('user', 'admin', 'consultant');

// 获取我的所有曼达拉作品
router.get('/', ...auth, async (req, res) => {
  const list = await prisma.mandalaWork.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(list);
});

// 保存一幅作品
router.post('/', ...auth, async (req, res) => {
  const { drawingData, imageUrl, mood, symmetry } = req.body;
  if (!drawingData) {
    return res.status(400).json({ error: '缺少作品数据' });
  }
  const work = await prisma.mandalaWork.create({
    data: {
      userId:      req.user.id,
      drawingData: typeof drawingData === 'string' ? drawingData : JSON.stringify(drawingData),
      imageUrl:    imageUrl || null,
      mood:        mood || null,
      symmetry:    Number.isInteger(symmetry) ? symmetry : 8,
    },
  });
  res.json(work);
});

// 获取单幅详情
router.get('/:id', ...auth, async (req, res) => {
  const work = await prisma.mandalaWork.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!work || work.userId !== req.user.id) {
    return res.status(404).json({ error: '作品不存在' });
  }
  res.json(work);
});

// 删除作品
router.delete('/:id', ...auth, async (req, res) => {
  const work = await prisma.mandalaWork.findUnique({ where: { id: Number(req.params.id) } });
  if (!work || work.userId !== req.user.id) {
    return res.status(403).json({ error: '权限不足' });
  }
  await prisma.mandalaWork.delete({ where: { id: work.id } });
  res.json({ ok: true });
});

module.exports = router;
