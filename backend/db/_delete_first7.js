const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const IDS = [1,2,3,4,5,6,7];
async function run() {
  const results = await prisma.assessmentResult.findMany({ where: { scaleId: { in: IDS } }, select: { id: true } });
  const resultIds = results.map(r => r.id);
  if (resultIds.length) await prisma.assessmentAnswer.deleteMany({ where: { resultId: { in: resultIds } } });
  await prisma.assessmentResult.deleteMany({ where: { scaleId: { in: IDS } } });
  await prisma.assessmentInterpretation.deleteMany({ where: { scaleId: { in: IDS } } });
  await prisma.assessmentQuestion.deleteMany({ where: { scaleId: { in: IDS } } });
  await prisma.assessmentProgress.deleteMany({ where: { scaleId: { in: IDS } } });
  const deleted = await prisma.assessmentScale.deleteMany({ where: { id: { in: IDS } } });
  console.log('deleted scales:', deleted.count);
  await prisma.$disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
