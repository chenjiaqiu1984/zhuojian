// 将孩童卡·人像的 wordCatId 清空，只抽人像图卡
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.ohCardCategory.updateMany({
  where:{name:'孩童卡·人像'},
  data:{wordCatId:null}
}).then(r=>{ console.log('updated',r.count,'row(s)'); p.$disconnect(); });
