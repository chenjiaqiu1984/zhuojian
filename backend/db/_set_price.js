const prisma = require('../db/database');
async function main() {
  await prisma.consultant.updateMany({ where: { name: '王卓' }, data: { price: 1000 } });
  console.log('价格已更新为 1000');
}
main().catch(console.error).finally(() => prisma.$disconnect());
