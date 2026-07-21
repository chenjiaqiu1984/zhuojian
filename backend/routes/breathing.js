const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { checkAchievements } = require('./achievements');
const prisma = new PrismaClient();

// POST /api/breathing/finish — 记录一次完成的呼吸练习
router.post('/finish', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mode, isProgramMode, rounds, durationSec } = req.body;

    await prisma.breathingSession.create({
      data: {
        userId,
        mode:          mode || 'unknown',
        isProgramMode: isProgramMode ? 1 : 0,
        rounds:        rounds || 0,
        durationSec:   durationSec || 0,
      },
    });

    const newAchievements = await checkAchievements(userId, 'breathing');
    res.json({ ok: true, newAchievements });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// GET /api/breathing/history — 呼吸练习历史
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const page   = parseInt(req.query.page) || 1;
    const limit  = 20;
    const [total, list] = await Promise.all([
      prisma.breathingSession.count({ where: { userId } }),
      prisma.breathingSession.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
    ]);
    res.json({ ok: true, total, list });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
