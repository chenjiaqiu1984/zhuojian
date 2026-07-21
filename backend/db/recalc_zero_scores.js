const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calcScore(answers, questions, scoringRule) {
  const rule = JSON.parse(scoringRule);
  if (rule.method === 'sum') {
    return { totalScore: questions.reduce((s, q) => s + (answers[q.id] ?? 0), 0), dimensions: null };
  }
  if (rule.method === 'weighted_sum') {
    let total = questions.reduce((s, q) => {
      let v = answers[q.id] ?? 1;
      if (rule.reverseItems?.includes(q.orderNum)) v = 5 - v;
      return s + v;
    }, 0);
    return { totalScore: Math.round(total * (rule.multiplier || 1)), dimensions: null };
  }
  if (rule.method === 'dimension_sum') {
    const dims = {};
    for (const dim of rule.dimensions) {
      let sum = 0, cnt = 0;
      for (const on of dim.questions) {
        const q = questions.find(q => q.orderNum === on);
        if (!q) continue;
        let v = answers[q.id] ?? 3;
        if (dim.reverse?.includes(on)) v = 6 - v;
        sum += v; cnt++;
      }
      dims[dim.code] = cnt ? parseFloat((sum / cnt).toFixed(2)) : 0;
    }
    const vals = Object.values(dims);
    return { totalScore: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)), dimensions: dims };
  }
  if (rule.method === 'dimension_total') {
    const dims = {};
    for (const dim of rule.dimensions) {
      let sum = 0;
      for (const on of dim.questions) {
        const q = questions.find(q => q.orderNum === on);
        if (!q) continue;
        let v = answers[q.id] ?? 0;
        if (dim.reverse?.includes(on)) v = (dim.maxScore ?? 4) - v;
        sum += v;
      }
      dims[dim.code] = sum;
    }
    return { totalScore: Object.values(dims).reduce((a, b) => a + b, 0), dimensions: dims };
  }
  const dims = {};
  for (const q of questions) {
    const v = Number(answers[q.id]) || 0;
    if (q.dimension) dims[q.dimension] = (dims[q.dimension] || 0) + v;
  }
  if (Object.keys(dims).length > 0)
    return { totalScore: Object.values(dims).reduce((a, b) => a + b, 0), dimensions: dims };
  return { totalScore: 0, dimensions: null };
}

async function main() {
  // Find results with totalScore=0 that have saved answers
  const results = await prisma.assessmentResult.findMany({
    where: { totalScore: 0 },
    include: { scale: { include: { questions: true } }, answerItems: true }
  });

  console.log(`Found ${results.length} zero-score results`);
  let fixed = 0;

  for (const r of results) {
    if (!r.answerItems.length) continue;
    const answerMap = Object.fromEntries(r.answerItems.map(a => [a.questionId, a.score]));
    const { totalScore, dimensions } = calcScore(answerMap, r.scale.questions, r.scale.scoringRule);
    if (totalScore === 0) continue; // still 0, skip

    await prisma.assessmentResult.update({
      where: { id: r.id },
      data: { totalScore, dimensions: dimensions ? JSON.stringify(dimensions) : r.dimensions }
    });
    console.log(`Fixed result ${r.id}: 0 → ${totalScore}`);
    fixed++;
  }

  console.log(`Done: fixed ${fixed}/${results.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
