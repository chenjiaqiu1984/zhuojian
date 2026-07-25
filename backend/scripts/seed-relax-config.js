/**
 * 种子：解压游戏 FeatureConfig 默认配置
 * 用法: node scripts/seed-relax-config.js
 */
const { PrismaClient } = require('@prisma/client');
const { DEFAULTS } = require('../data/relaxDefaults');
const prisma = new PrismaClient();

async function main() {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await prisma.featureConfig.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: {}, // 已有则不覆盖，避免冲掉运营配置
    });
    console.log(`[seed] ${key} ok`);
  }
  console.log('relax config seed done');
}

if (require.main === module) {
  main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}

module.exports = { DEFAULTS };
