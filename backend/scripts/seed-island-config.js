/**
 * 种子：心镜岛 FeatureConfig 默认配置
 * 用法: node scripts/seed-island-config.js
 * 已有配置不覆盖
 */
const { PrismaClient } = require('@prisma/client');
const { CONFIG_KEY, cloneDefaults } = require('../data/islandDefaults');
const prisma = new PrismaClient();

async function main() {
  await prisma.featureConfig.upsert({
    where: { key: CONFIG_KEY },
    create: { key: CONFIG_KEY, value: JSON.stringify(cloneDefaults()) },
    update: {},
  });
  console.log(`[seed] ${CONFIG_KEY} ok`);
}

if (require.main === module) {
  main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}

module.exports = { CONFIG_KEY };
