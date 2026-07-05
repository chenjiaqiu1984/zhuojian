const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.ohCardCategory.update({ where: { id: 9 }, data: { wordCatId: 10 } });
  await prisma.ohCardCategory.update({ where: { id: 10 }, data: { isActive: 0 } });
  console.log('done');
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
