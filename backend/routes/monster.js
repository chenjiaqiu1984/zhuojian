const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
const auth = requireRole('user', 'admin', 'consultant');

// 获取我的所有怪兽
router.get('/', ...auth, async (req, res) => {
  const list = await prisma.monster.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(list);
});

// 创建怪兽
router.post('/', ...auth, async (req, res) => {
  const { name, emotion, color, drawingData, drawingType } = req.body;
  if (!name || !emotion || !color || !drawingData) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const monster = await prisma.monster.create({
    data: {
      userId: req.user.id,
      name,
      emotion,
      color,
      drawingData: typeof drawingData === 'string' ? drawingData : JSON.stringify(drawingData),
      drawingType: drawingType || 'parts',
    },
  });
  res.json(monster);
});

// 获取单只怪兽详情 + 喂食记录
router.get('/:id', ...auth, async (req, res) => {
  const monster = await prisma.monster.findUnique({
    where: { id: Number(req.params.id) },
    include: { feedLogs: { orderBy: { createdAt: 'desc' }, take: 50 } },
  });
  if (!monster || monster.userId !== req.user.id) {
    return res.status(404).json({ error: '怪兽不存在' });
  }
  res.json(monster);
});

// 更新怪兽（名字/颜色）
router.put('/:id', ...auth, async (req, res) => {
  const monster = await prisma.monster.findUnique({ where: { id: Number(req.params.id) } });
  if (!monster || monster.userId !== req.user.id) {
    return res.status(403).json({ error: '权限不足' });
  }
  const { name, color } = req.body;
  const updated = await prisma.monster.update({
    where: { id: monster.id },
    data: { name, color },
  });
  res.json(updated);
});

// 删除怪兽
router.delete('/:id', ...auth, async (req, res) => {
  const monster = await prisma.monster.findUnique({ where: { id: Number(req.params.id) } });
  if (!monster || monster.userId !== req.user.id) {
    return res.status(403).json({ error: '权限不足' });
  }
  await prisma.monsterFeedLog.deleteMany({ where: { monsterId: monster.id } });
  await prisma.monster.delete({ where: { id: monster.id } });
  res.json({ ok: true });
});

// 今日签到喂食（每天限1次）
router.post('/:id/feed', ...auth, async (req, res) => {
  const monster = await prisma.monster.findUnique({ where: { id: Number(req.params.id) } });
  if (!monster || monster.userId !== req.user.id) {
    return res.status(404).json({ error: '怪兽不存在' });
  }

  // 检查今天是否已喂食
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (monster.lastFedAt && new Date(monster.lastFedAt) >= todayStart) {
    return res.status(409).json({ error: '今天已经喂过啦，明天再来吧 🌙' });
  }

  // 计算 streak
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const fedYesterday = monster.lastFedAt && new Date(monster.lastFedAt) >= yesterdayStart && new Date(monster.lastFedAt) < todayStart;
  const newStreak = fedYesterday ? monster.streak + 1 : 1;

  const { note, emotion } = req.body;

  const [updated] = await prisma.$transaction([
    prisma.monster.update({
      where: { id: monster.id },
      data: {
        totalDays: monster.totalDays + 1,
        streak: newStreak,
        lastFedAt: now,
      },
    }),
    prisma.monsterFeedLog.create({
      data: { monsterId: monster.id, note: note || null, emotion: emotion || null },
    }),
  ]);

  res.json(updated);
});

module.exports = router;
