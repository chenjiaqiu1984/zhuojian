const express = require('express');
const multer = require('multer');
const path = require('path');
const prisma = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { checkAchievements } = require('./achievements');

const router = express.Router();
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/ohcards'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

const sharp = require('sharp');

async function compressFile(fp) {
  const tmp = fp + '.tmp';
  await sharp(fp).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(tmp);
  require('fs').renameSync(tmp, fp);
}

router.get('/categories', async (req, res) => {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT id, name, type, description, cover, is_active as isActive, word_cat_id as wordCatId, img_src_cat_id as imgSrcCatId FROM OhCardCategory WHERE is_active = 1'
  );
  res.json(rows);
});

router.post('/categories', ...requireRole('admin'), async (req, res) => {
  const c = await prisma.ohCardCategory.create({ data: req.body });
  res.json({ id: c.id });
});

router.get('/cards', async (req, res) => {
  const { category_id, count } = req.query;
  const where = category_id ? { categoryId: Number(category_id) } : {};
  if (count) {
    const all = await prisma.ohCard.findMany({ where });
    const shuffled = all.sort(() => Math.random() - 0.5).slice(0, Number(count));
    return res.json(shuffled);
  }
  res.json(await prisma.ohCard.findMany({ where }));
});

router.post('/cards', ...requireRole('admin'), upload.single('image'), async (req, res) => {
  const { category_id, word } = req.body;
  if (req.file) await compressFile(req.file.path).catch(() => {});
  const imageUrl = req.file ? `/uploads/ohcards/${req.file.filename}` : null;
  const c = await prisma.ohCard.create({ data: { categoryId: Number(category_id), imageUrl, word } });
  res.json({ id: c.id });
});

router.post('/cards/batch', ...requireRole('admin'), upload.array('images', 100), async (req, res) => {
  const { category_id, words } = req.body;
  const catId = Number(category_id);
  if (req.files?.length) await Promise.all(req.files.map(f => compressFile(f.path).catch(() => {})));
  const data = [];
  if (req.files?.length) req.files.forEach(f => data.push({ categoryId: catId, imageUrl: `/uploads/ohcards/${f.filename}` }));
  if (words) {
    const list = Array.isArray(words) ? words : [words];
    list.forEach(w => data.push({ categoryId: catId, word: w }));
  }
  await prisma.ohCard.createMany({ data });
  res.json({ ok: true });
});

router.delete('/cards/batch', ...requireRole('admin'), async (req, res) => {
  const { ids } = req.body;
  await prisma.ohCard.deleteMany({ where: { id: { in: ids.map(Number) } } });
  res.json({ ok: true });
});

router.delete('/cards/:id', ...requireRole('admin'), async (req, res) => {
  await prisma.ohCard.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

router.get('/records', authMiddleware, async (req, res) => {
  res.json(await prisma.ohCardRecord.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } }));
});

router.post('/records', authMiddleware, async (req, res) => {
  try {
    const { type, data, note, audio_url, room_id } = req.body;
    const r = await prisma.ohCardRecord.create({ data: { userId: req.user.id, type, data: JSON.stringify(data), note, audioUrl: audio_url, roomId: room_id } });
    res.json({ id: r.id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/records/:id', authMiddleware, async (req, res) => {
  const { note, audio_url } = req.body;
  await prisma.ohCardRecord.updateMany({ where: { id: Number(req.params.id), userId: req.user.id }, data: { note, audioUrl: audio_url } });
  res.json({ ok: true });
});

router.get('/presets', async (req, res) => {
  const { type } = req.query;
  const where = { isActive: 1, ...(type ? { type } : {}) };
  const rows = await prisma.ohCardPreset.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  res.json(rows.map(r => ({ ...r, config: JSON.parse(r.config) })));
});
router.get('/presets/all', ...requireRole('admin'), async (req, res) => {
  const { type } = req.query;
  const rows = await prisma.ohCardPreset.findMany({ where: type ? { type } : {}, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  res.json(rows.map(r => ({ ...r, config: JSON.parse(r.config) })));
});
router.post('/presets', ...requireRole('admin'), async (req, res) => {
  const { type, title, icon, color, isActive, sortOrder, config } = req.body;
  const r = await prisma.ohCardPreset.create({ data: { type, title, icon: icon || '🃏', color: color || '#4A7BBA', isActive: isActive ?? 1, sortOrder: sortOrder || 0, config: JSON.stringify(config || {}) } });
  res.json({ id: r.id });
});
router.put('/presets/:id', ...requireRole('admin'), async (req, res) => {
  const { type, title, icon, color, isActive, sortOrder, config } = req.body;
  const data = { type, title, icon, color, isActive, sortOrder, ...(config !== undefined ? { config: JSON.stringify(config) } : {}) };
  await prisma.ohCardPreset.update({ where: { id: Number(req.params.id) }, data });
  res.json({ ok: true });
});
router.delete('/presets/:id', ...requireRole('admin'), async (req, res) => {
  await prisma.ohCardPreset.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

function dayBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function formatDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseRecordData(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

async function findMoodCategory() {
  return prisma.ohCardCategory.findFirst({
    where: { name: '心境卡', isActive: 1 },
  });
}

async function findTodayDaily(userId) {
  const { start, end } = dayBounds();
  return prisma.ohCardRecord.findFirst({
    where: {
      userId,
      type: 'daily',
      createdAt: { gte: start, lt: end },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** 查询今日心境卡（未登录也可探测牌组是否可用） */
router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const cat = await findMoodCategory();
    if (!cat) return res.status(404).json({ error: '心境卡牌组尚未配置' });
    const row = await findTodayDaily(req.user.id);
    if (!row) {
      return res.json({ drawn: false, date: formatDateKey(), categoryId: cat.id });
    }
    const data = parseRecordData(row.data) || {};
    return res.json({
      drawn: true,
      date: formatDateKey(),
      categoryId: cat.id,
      recordId: row.id,
      card: data.card || null,
      note: row.note || '',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** 抽取今日心境主卡（每天一次） */
router.post('/daily', authMiddleware, async (req, res) => {
  try {
    const cat = await findMoodCategory();
    if (!cat) return res.status(404).json({ error: '心境卡牌组尚未配置' });

    const existing = await findTodayDaily(req.user.id);
    if (existing) {
      const data = parseRecordData(existing.data) || {};
      return res.status(409).json({
        error: '今天已经抽过啦，明天再来吧',
        drawn: true,
        date: formatDateKey(),
        recordId: existing.id,
        card: data.card || null,
        note: existing.note || '',
      });
    }

    const all = await prisma.$queryRawUnsafe(
      'SELECT id, image_url as imageUrl, word, description, question FROM OhCard WHERE category_id = ?',
      cat.id,
    );
    if (!all.length) return res.status(400).json({ error: '心境卡暂无可用卡片' });
    const card = all[Math.floor(Math.random() * all.length)];
    const payload = {
      card: {
        id: card.id,
        imageUrl: card.imageUrl,
        word: card.word,
        description: card.description,
        question: card.question,
      },
      date: formatDateKey(),
      categoryId: cat.id,
    };
    const row = await prisma.ohCardRecord.create({
      data: {
        userId: req.user.id,
        type: 'daily',
        data: JSON.stringify(payload),
        note: req.body?.note || null,
      },
    });
    try {
      await prisma.eventLog.create({
        data: {
          userId: req.user.id,
          event: 'ohcard_daily_draw',
          page: '/pages/ohcard/daily',
          data: JSON.stringify({
            word: payload.card?.word || null,
            recordId: row.id,
            auto: !!req.body?.auto,
          }),
        },
      });
    } catch (_) {}
    const newAchievements = await checkAchievements(req.user.id, 'daily');
    res.json({
      drawn: true,
      date: formatDateKey(),
      recordId: row.id,
      card: payload.card,
      note: row.note || '',
      newAchievements,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
