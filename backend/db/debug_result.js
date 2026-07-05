const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const id = Number(process.argv[2] || 23);
  const r = await prisma.assessmentResult.findFirst({
    where: { id },
    include: { scale: true, answerItems: true }
  });
  if (!r) return console.log('Result not found');
  const rule = JSON.parse(r.scale.scoringRule);
  console.log('scaleName:', r.scale.name);
  console.log('method:', rule.method);
  console.log('totalScore:', r.totalScore);
  console.log('dimensions:', r.dimensions);
  console.log('answerCount:', r.answerItems.length);
  if (r.answerItems.length) {
    const sample = r.answerItems.slice(0, 3);
    console.log('sample answers:', sample.map(a => `q${a.questionId}=${a.score}`).join(', '));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
