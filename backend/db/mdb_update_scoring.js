const { PrismaClient } = require('@prisma/client');
const scales = require('./mdb_scales.json');
const prisma = new PrismaClient();

async function main() {
  let updated = 0;
  for (const s of scales) {
    const result = await prisma.assessmentScale.updateMany({
      where: { code: s.code },
      data: { scoringRule: JSON.stringify(s.scoringRule) }
    });
    if (result.count) updated++;
  }
  console.log(`Updated scoringRule for ${updated} scales`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
