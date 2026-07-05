const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.$executeRawUnsafe("ALTER TABLE About ADD COLUMN tickerType TEXT DEFAULT 'news'")
  .then(()=>console.log('done')).catch(e=>console.log(e.message)).finally(()=>p.$disconnect());
