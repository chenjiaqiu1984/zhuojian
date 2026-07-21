const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.assessmentScale.findMany({select:{id:true,code:true,isPaid:true,totalQuestions:true}})
  .then(r=>{r.forEach(s=>console.log(s.id,s.code,s.isPaid?'paid':'free',s.totalQuestions+'q'));p.$disconnect();});
