const { PrismaClient } = require('@prisma/client');
const scales = require('./mdb_scales.json');
const prisma = new PrismaClient();

async function main() {
  let created = 0, skipped = 0;
  for (const s of scales) {
    const { questions, interpretations, scoringRule, ...scaleData } = s;
    const existing = await prisma.assessmentScale.findUnique({ where: { code: scaleData.code } });

    let scaleId;
    if (existing) {
      await prisma.assessmentScale.update({
        where: { code: scaleData.code },
        data: { ...scaleData, scoringRule: JSON.stringify(scoringRule) }
      });
      scaleId = existing.id;
      await prisma.assessmentQuestion.deleteMany({ where: { scaleId } });
      await prisma.assessmentInterpretation.deleteMany({ where: { scaleId } });
      skipped++;
    } else {
      const scale = await prisma.assessmentScale.create({
        data: { ...scaleData, scoringRule: JSON.stringify(scoringRule) }
      });
      scaleId = scale.id;
      created++;
    }

    if (questions.length) {
      await prisma.assessmentQuestion.createMany({
        data: questions.map(q => ({
          scaleId, orderNum: q.orderNum,
          content: q.content, options: JSON.stringify(q.options),
          dimension: q.dimension || null
        }))
      });
    }

    if (interpretations.length) {
      await prisma.assessmentInterpretation.createMany({
        data: interpretations.map(i => ({ ...i, variance: i.variance != null ? parseFloat(i.variance) || null : null, scaleId }))
      });
    }
  }
  console.log(`Done: created=${created} updated=${skipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
