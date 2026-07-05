const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const results = await prisma.assessmentResult.findMany({ select: { id: true } });
  const resultIds = results.map(r => r.id);
  if (resultIds.length) await prisma.assessmentAnswer.deleteMany({ where: { resultId: { in: resultIds } } });
  await prisma.assessmentResult.deleteMany();
  await prisma.assessmentInterpretation.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  await prisma.assessmentProgress.deleteMany();
  const d = await prisma.assessmentScale.deleteMany();
  console.log('deleted:', d.count);
  await prisma.$disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
