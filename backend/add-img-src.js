const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  await p.$executeRawUnsafe('ALTER TABLE OhCardCategory ADD COLUMN img_src_cat_id INTEGER');
  console.log('column added');
  await p.$executeRawUnsafe('UPDATE OhCardCategory SET img_src_cat_id = 1 WHERE id = 15');
  console.log('id=15 img_src_cat_id=1');
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
