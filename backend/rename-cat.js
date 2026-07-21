const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.ohCardCategory.update({ where: { id: 1 }, data: { name: '心理图卡+字卡' } })
  .then(r => { console.log('done:', r.name); p.$disconnect(); });
