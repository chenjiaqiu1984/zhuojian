// 将所有咨询师和付费量表价格设为1分（0.01元），用于测试支付
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 更新所有咨询师价格为1分
  const c = await prisma.consultant.updateMany({ data: { price: 1 } });
  console.log(`咨询师已更新 ${c.count} 条`);

  // 更新所有付费量表价格为1分
  const s = await prisma.assessmentScale.updateMany({
    where: { isPaid: true },
    data: { price: 1 }
  });
  console.log(`付费量表已更新 ${s.count} 条`);

  // 列出结果
  const consultants = await prisma.consultant.findMany({ select: { name: true, price: true } });
  consultants.forEach(c => console.log(`  咨询师 ${c.name}: ${c.price}分`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
