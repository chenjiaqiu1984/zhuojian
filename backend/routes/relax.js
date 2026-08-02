const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');
const {
  DEFAULTS,
  BREATHING_MODES,
  BREATHING_PROGRAMS,
  SQUEEZE_COUNTS,
  MONSTER_STAGES,
} = require('../data/relaxDefaults');

const router = express.Router();
const adminAuth = requireRole('admin');

const CONFIG_KEYS = new Set([
  'breathing_modes',
  'breathing_programs',
  'squeeze_counts',
  'monster_stages',
]);

function stageLabelFromConfig(stagesCfg, totalDays) {
  const d = Number(totalDays) || 0;
  const stages = stagesCfg?.stages || MONSTER_STAGES.stages;
  for (const s of stages) {
    if (s.maxDays === null || s.maxDays === undefined) continue;
    if (d <= s.maxDays) return s.label;
  }
  const last = stages[stages.length - 1];
  return last?.label || '饱满鲜艳';
}

async function getConfig(key) {
  const row = await prisma.featureConfig.findUnique({ where: { key } });
  if (!row) return DEFAULTS[key] ?? null;
  try {
    return JSON.parse(row.value);
  } catch {
    return DEFAULTS[key] ?? null;
  }
}

async function setConfig(key, value) {
  const payload = typeof value === 'string' ? value : JSON.stringify(value);
  await prisma.featureConfig.upsert({
    where: { key },
    create: { key, value: payload },
    update: { value: payload },
  });
}

// ── 公开配置（小程序）────────────────────────────────────────────

router.get('/config/breathing', async (_req, res) => {
  try {
    const [modes, programs] = await Promise.all([
      getConfig('breathing_modes'),
      getConfig('breathing_programs'),
    ]);
    res.json({
      modes: (modes || BREATHING_MODES).filter(m => m.enabled !== false),
      programs: (programs || BREATHING_PROGRAMS).filter(p => p.enabled !== false),
    });
  } catch (err) {
    console.error('[relax] breathing config', err);
    res.json({
      modes: BREATHING_MODES.filter(m => m.enabled !== false),
      programs: BREATHING_PROGRAMS.filter(p => p.enabled !== false),
    });
  }
});

router.get('/config/squeeze', async (_req, res) => {
  try {
    const counts = await getConfig('squeeze_counts');
    res.json({
      counts: (counts || SQUEEZE_COUNTS).filter(c => c.enabled !== false),
    });
  } catch (err) {
    console.error('[relax] squeeze config', err);
    res.json({ counts: SQUEEZE_COUNTS.filter(c => c.enabled !== false) });
  }
});

router.get('/config/monster-stages', async (_req, res) => {
  try {
    const stages = await getConfig('monster_stages');
    res.json(stages || MONSTER_STAGES);
  } catch (err) {
    console.error('[relax] monster stages', err);
    res.json(MONSTER_STAGES);
  }
});

// ── 管理端：配置 ──────────────────────────────────────────────────

router.get('/admin/config/:key', ...adminAuth, async (req, res) => {
  const { key } = req.params;
  if (!CONFIG_KEYS.has(key)) return res.status(400).json({ error: '无效配置键' });
  const value = await getConfig(key);
  res.json({ key, value });
});

router.put('/admin/config/:key', ...adminAuth, async (req, res) => {
  try {
    const { key } = req.params;
    if (!CONFIG_KEYS.has(key)) return res.status(400).json({ error: '无效配置键' });
    const value = req.body?.value !== undefined ? req.body.value : req.body;
    if (value === undefined || value === null) {
      return res.status(400).json({ error: '缺少配置内容' });
    }

    if (key === 'breathing_programs') {
      const modes = await getConfig('breathing_modes');
      const modeKeys = new Set((modes || []).map(m => m.key));
      const list = Array.isArray(value) ? value : [];
      for (const p of list) {
        for (const st of p.stages || []) {
          if (st.mode && !modeKeys.has(st.mode)) {
            return res.status(400).json({ error: `课程「${p.name || p.key}」引用了不存在的模式 ${st.mode}` });
          }
        }
      }
    }

    await setConfig(key, value);
    res.json({ ok: true, key, value });
  } catch (err) {
    console.error('[relax] put config', err);
    res.status(500).json({ error: '保存失败' });
  }
});

// ── 管理端：曼达拉 ────────────────────────────────────────────────

router.get('/admin/mandalas', ...adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const where = {};
    if (req.query.mood) where.mood = req.query.mood;
    if (req.query.q) {
      const q = String(req.query.q).trim();
      where.user = {
        OR: [
          { name: { contains: q } },
          { username: { contains: q } },
          { phone: { contains: q } },
        ],
      };
    }

    const [total, list] = await Promise.all([
      prisma.mandalaWork.count({ where }),
      prisma.mandalaWork.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          mood: true,
          symmetry: true,
          imageUrl: true,
          createdAt: true,
          userId: true,
          user: { select: { id: true, name: true, username: true, phone: true } },
        },
      }),
    ]);
    res.json({ total, page, list });
  } catch (err) {
    console.error('[relax] mandalas', err);
    res.status(500).json({ error: '加载失败' });
  }
});

// 管理端：查看单幅曼达拉（含 drawingData，用于重绘预览）
router.get('/admin/mandalas/:id', ...adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const work = await prisma.mandalaWork.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, username: true, phone: true } } },
    });
    if (!work) return res.status(404).json({ error: '不存在' });
    res.json(work);
  } catch (err) {
    console.error('[relax] mandala detail', err);
    res.status(500).json({ error: '加载失败' });
  }
});

router.delete('/admin/mandalas/:id', ...adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const work = await prisma.mandalaWork.findUnique({ where: { id } });
    if (!work) return res.status(404).json({ error: '不存在' });
    await prisma.mandalaWork.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[relax] delete mandala', err);
    res.status(500).json({ error: '删除失败' });
  }
});

// ── 管理端：情绪怪兽 ──────────────────────────────────────────────

router.get('/admin/monsters', ...adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.emotion) where.emotion = req.query.emotion;
    if (req.query.q) {
      const q = String(req.query.q).trim();
      where.OR = [
        { name: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { username: { contains: q } } },
        { user: { phone: { contains: q } } },
      ];
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [total, list, activeCount, archivedCount, fedToday, stagesCfg] = await Promise.all([
      prisma.monster.count({ where }),
      prisma.monster.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, username: true, phone: true } } },
      }),
      prisma.monster.count({ where: { status: 'active' } }),
      prisma.monster.count({ where: { status: 'archived' } }),
      prisma.monster.count({ where: { lastFedAt: { gte: startOfDay } } }),
      getConfig('monster_stages'),
    ]);

    res.json({
      total,
      page,
      summary: {
        total: activeCount + archivedCount,
        active: activeCount,
        archived: archivedCount,
        fedToday,
      },
      list: list.map(m => ({
        ...m,
        stageLabel: stageLabelFromConfig(stagesCfg, m.totalDays),
      })),
    });
  } catch (err) {
    console.error('[relax] monsters', err);
    res.status(500).json({ error: '加载失败' });
  }
});

router.patch('/admin/monsters/:id', ...adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const monster = await prisma.monster.findUnique({ where: { id } });
    if (!monster) return res.status(404).json({ error: '不存在' });
    const data = {};
    if (req.body.status === 'active' || req.body.status === 'archived') {
      data.status = req.body.status;
    }
    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      data.name = req.body.name.trim().slice(0, 40);
    }
    if (typeof req.body.emotion === 'string' && req.body.emotion.trim()) {
      data.emotion = req.body.emotion.trim().slice(0, 20);
    }
    if (typeof req.body.color === 'string' && req.body.color.trim()) {
      data.color = req.body.color.trim().slice(0, 32);
    }
    if (req.body.totalDays !== undefined) {
      const n = Number(req.body.totalDays);
      if (!Number.isFinite(n) || n < 0 || n > 100000) {
        return res.status(400).json({ error: '天数无效' });
      }
      data.totalDays = Math.floor(n);
    }
    if (req.body.streak !== undefined) {
      const n = Number(req.body.streak);
      if (!Number.isFinite(n) || n < 0 || n > 100000) {
        return res.status(400).json({ error: '连胜无效' });
      }
      data.streak = Math.floor(n);
    }
    if (req.body.lastFedAt !== undefined) {
      if (req.body.lastFedAt === null || req.body.lastFedAt === '') {
        data.lastFedAt = null;
      } else {
        const d = new Date(req.body.lastFedAt);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ error: '喂养时间无效' });
        data.lastFedAt = d;
      }
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: '无有效更新' });
    const updated = await prisma.monster.update({ where: { id }, data });
    const stagesCfg = await getConfig('monster_stages');
    res.json({ ...updated, stageLabel: stageLabelFromConfig(stagesCfg, updated.totalDays) });
  } catch (err) {
    console.error('[relax] patch monster', err);
    res.status(500).json({ error: '操作失败' });
  }
});

router.delete('/admin/monsters/:id', ...adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const monster = await prisma.monster.findUnique({ where: { id } });
    if (!monster) return res.status(404).json({ error: '不存在' });
    await prisma.monsterFeedLog.deleteMany({ where: { monsterId: id } });
    await prisma.monster.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[relax] delete monster', err);
    res.status(500).json({ error: '删除失败' });
  }
});

// ── 管理端：呼吸会话（只读）──────────────────────────────────────

router.get('/admin/breathing-sessions', ...adminAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const where = {};
    if (req.query.mode) where.mode = req.query.mode;
    if (req.query.isProgramMode === '1' || req.query.isProgramMode === '0') {
      where.isProgramMode = Number(req.query.isProgramMode);
    }

    const [total, list] = await Promise.all([
      prisma.breathingSession.count({ where }),
      prisma.breathingSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    res.json({ total, page, list });
  } catch (err) {
    console.error('[relax] breathing sessions', err);
    res.status(500).json({ error: '加载失败' });
  }
});

module.exports = router;
