const express = require('express');
const multer = require('multer');
const path = require('path');
const prisma = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

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

module.exports = router;
