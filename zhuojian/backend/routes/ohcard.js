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

router.get('/categories', async (req, res) => {
  res.json(await prisma.ohCardCategory.findMany({ where: { isActive: 1 } }));
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
  const imageUrl = req.file ? `/uploads/ohcards/${req.file.filename}` : null;
  const c = await prisma.ohCard.create({ data: { categoryId: Number(category_id), imageUrl, word } });
  res.json({ id: c.id });
});

router.post('/cards/batch', ...requireRole('admin'), upload.array('images', 100), async (req, res) => {
  const { category_id, words } = req.body;
  const catId = Number(category_id);
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
  const { type, data, note, audio_url, room_id } = req.body;
  const r = await prisma.ohCardRecord.create({ data: { userId: req.user.id, type, data: JSON.stringify(data), note, audioUrl: audio_url, roomId: room_id } });
  res.json({ id: r.id });
});

router.put('/records/:id', authMiddleware, async (req, res) => {
  const { note, audio_url } = req.body;
  await prisma.ohCardRecord.updateMany({ where: { id: Number(req.params.id), userId: req.user.id }, data: { note, audioUrl: audio_url } });
  res.json({ ok: true });
});

module.exports = router;
