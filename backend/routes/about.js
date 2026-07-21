const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

async function resolveItems(raw) {
  if (!raw) return [];
  const items = JSON.parse(raw);
  const resolved = await Promise.all(items.map(async ({ type, itemId, image: customImage }) => {
    if (type === 'news') {
      const n = await prisma.news.findUnique({ where: { id: itemId }, select: { id: true, title: true, coverImage: true } });
      return n ? { type, id: n.id, title: n.title, image: customImage || n.coverImage } : null;
    }
    if (type === 'consultant') {
      const c = await prisma.consultant.findUnique({ where: { id: itemId }, select: { id: true, name: true, title: true, avatar: true } });
      return c ? { type, id: c.id, title: c.name + (c.title ? ' · ' + c.title : ''), image: customImage || c.avatar } : null;
    }
    if (type === 'ohcard') {
      const cat = await prisma.ohCardCategory.findUnique({ where: { id: itemId }, select: { id: true, name: true, cover: true } });
      return cat ? { type, id: cat.id, title: cat.name, image: customImage || cat.cover } : null;
    }
    return null;
  }));
  return resolved.filter(Boolean);
}

router.get('/', async (req, res) => {
  const row = await prisma.about.findFirst() || {};
  res.json({
    ...row,
    images: row.images ? JSON.parse(row.images) : [],
    tickerItems: await resolveItems(row.tickerItems),
    menuGroups: row.menuGroups ? JSON.parse(row.menuGroups) : null
  });
});

router.get('/ticker-options', async (req, res) => {
  const [news, consultants, categories] = await Promise.all([
    prisma.news.findMany({ where: { isPublished: 1 }, select: { id: true, title: true, coverImage: true }, take: 50 }),
    prisma.consultant.findMany({ where: { isActive: 1 }, select: { id: true, name: true, title: true, avatar: true } }),
    prisma.ohCardCategory.findMany({ where: { isActive: 1 }, select: { id: true, name: true, cover: true } })
  ]);
  res.json({
    news: news.map(n => ({ id: n.id, label: n.title, image: n.coverImage })),
    consultant: consultants.map(c => ({ id: c.id, label: c.name + (c.title ? ' · ' + c.title : ''), image: c.avatar })),
    ohcard: categories.map(c => ({ id: c.id, label: c.name, image: c.cover }))
  });
});

router.put('/', ...requireRole('admin'), async (req, res) => {
  const { title, content, bannerImage, images, tickerItems, menuGroups } = req.body;
  const data = {
    title, content, bannerImage,
    images: JSON.stringify(images || []),
    tickerItems: JSON.stringify((tickerItems || []).filter(i => i.type && i.itemId).map(i => ({ type: i.type, itemId: Number(i.itemId), ...(i.image ? { image: i.image } : {}) }))),
    menuGroups: menuGroups ? JSON.stringify(menuGroups) : null
  };
  const exists = await prisma.about.findFirst();
  if (exists) await prisma.about.update({ where: { id: exists.id }, data });
  else await prisma.about.create({ data });
  res.json({ ok: true });
});

module.exports = router;
