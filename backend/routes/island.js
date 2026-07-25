const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');
const {
  CONFIG_KEY,
  ISLAND_SPOTS,
  cloneDefaults,
  normalizeSpots,
  sortSpots,
} = require('../data/islandDefaults');

const router = express.Router();
const adminAuth = requireRole('admin');

async function loadSpots() {
  const row = await prisma.featureConfig.findUnique({ where: { key: CONFIG_KEY } });
  if (!row) return cloneDefaults();
  try {
    return normalizeSpots(JSON.parse(row.value));
  } catch {
    return cloneDefaults();
  }
}

async function saveSpots(spots) {
  const value = JSON.stringify(spots);
  await prisma.featureConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value },
    update: { value },
  });
}

/** 公开：仅启用的点位 */
router.get('/', async (_req, res) => {
  try {
    const spots = sortSpots(await loadSpots()).filter(s => s.enabled !== false);
    res.json({ spots });
  } catch (err) {
    console.error('[island] get', err);
    res.json({ spots: sortSpots(cloneDefaults()).filter(s => s.enabled !== false) });
  }
});

/** 管理端：全部点位 */
router.get('/admin', ...adminAuth, async (_req, res) => {
  try {
    const spots = sortSpots(await loadSpots());
    res.json({ spots, defaults: cloneDefaults() });
  } catch (err) {
    console.error('[island] admin get', err);
    res.status(500).json({ error: '读取失败' });
  }
});

/** 管理端：保存 */
router.put('/admin', ...adminAuth, async (req, res) => {
  try {
    const list = req.body?.spots;
    if (!Array.isArray(list) || !list.length) {
      return res.status(400).json({ error: '缺少 spots 数组' });
    }
    for (const s of list) {
      if (!s?.id) return res.status(400).json({ error: '存在缺少 id 的点位' });
      if (!s?.url) return res.status(400).json({ error: `点位「${s.id}」缺少跳转路径` });
      if (!s?.name) return res.status(400).json({ error: `点位「${s.id}」缺少名称` });
    }
    const spots = sortSpots(normalizeSpots(list));
    await saveSpots(spots);
    res.json({ ok: true, spots });
  } catch (err) {
    console.error('[island] admin put', err);
    res.status(500).json({ error: '保存失败' });
  }
});

module.exports = router;
module.exports.CONFIG_KEY = CONFIG_KEY;
module.exports.ISLAND_SPOTS = ISLAND_SPOTS;
