const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.assessmentAnswer.deleteMany();
  await prisma.assessmentResult.deleteMany();
  await prisma.assessmentVoucher.deleteMany();
  await prisma.assessmentFavorite.deleteMany();
  await prisma.assessmentProgress.deleteMany();
  await prisma.assessmentInterpretation.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  const { count } = await prisma.assessmentScale.deleteMany();
  console.log(`Deleted ${count} scales`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
