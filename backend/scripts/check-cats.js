const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.ohCardCategory.findMany().then(r=>{
  r.forEach(c=>console.log(c.id,c.name,'wordCatId:',c.wordCatId,'imgSrcCatId:',c.imgSrcCatId));
  p.$disconnect();
});
