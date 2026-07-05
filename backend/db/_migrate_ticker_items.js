const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.$executeRawUnsafe("ALTER TABLE About ADD COLUMN tickerItems TEXT")
  .then(()=>console.log('done')).catch(e=>console.log(e.message)).finally(()=>p.$disconnect());
