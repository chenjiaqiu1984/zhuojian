/**
 * 为心镜岛「新闻资讯」点位补全地点与介绍
 * 用法: node scripts/patch-island-news.js
 */
const { PrismaClient } = require('@prisma/client');
const { CONFIG_KEY, normalizeSpots } = require('../data/islandDefaults');

const prisma = new PrismaClient();

const NEWS_PATCH = {
  place: '崖边报亭',
  desc: '崖边立着一座小报亭，风从湖面吹来，带来最新的讯息。在这里浏览心理科普、行业动态与活动公告，了解卓见与心理世界的新鲜故事。',
  cta: '去阅读',
  tip: '新闻资讯',
};

async function main() {
  const row = await prisma.featureConfig.findUnique({ where: { key: CONFIG_KEY } });
  if (!row) {
    console.log('[patch] 无 island 配置，跳过');
    return;
  }
  const spots = normalizeSpots(JSON.parse(row.value));
  let target = spots.find(s => s.url === '/pages/news/index' || s.name === '新闻资讯' || s.id === 'news');
  if (target) {
    Object.assign(target, NEWS_PATCH);
    if (!target.name) target.name = '新闻资讯';
    console.log('[patch] 已更新点位:', target.id);
  } else {
    target = normalizeSpots([{
      id: 'news',
      name: '新闻资讯',
      tip: '新闻资讯',
      place: NEWS_PATCH.place,
      desc: NEWS_PATCH.desc,
      cta: NEWS_PATCH.cta,
      cx: 20,
      cy: 32,
      hit: 9,
      labelSide: 'bottom',
      url: '/pages/news/index',
      enabled: true,
      sort: 15,
    }])[0];
    spots.push(target);
    console.log('[patch] 已新增点位: news');
  }
  await prisma.featureConfig.update({
    where: { key: CONFIG_KEY },
    data: { value: JSON.stringify(normalizeSpots(spots)) },
  });
  console.log('[patch] 已保存');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
