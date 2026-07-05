const prisma = require('./database');

const CATEGORY_MAP = { 201: 'children', 202: 'clinical', 203: 'psychiatric', 204: 'personality' };
const OPT_KEYS = ['a','b','c','d','e','f','g','h','i','j'];
const SCR_KEYS = ['ac','bc','cc','dc','ec','fc','gc','hc','ic','jc'];
const n = v => typeof v === 'bigint' ? Number(v) : v;

async function main() {
  const [allScales, hmidsWithQ, allToplr, allHmez, allAccount] = await Promise.all([
    prisma.$queryRaw`SELECT id,name,parentid,hmjg FROM mdb_treename`,
    prisma.$queryRaw`SELECT DISTINCT hmid FROM mdb_toplr`,
    prisma.$queryRaw`SELECT * FROM mdb_toplr ORDER BY hmid,topid`,
    prisma.$queryRaw`SELECT * FROM mdb_hmez ORDER BY hmid,id`,
    prisma.$queryRaw`SELECT * FROM mdb_account ORDER BY hmid,name,min`,
  ]);

  const scalesWithQ = new Set(hmidsWithQ.map(r => n(r.hmid)));

  const group = (rows, key) => rows.reduce((m, r) => {
    const k = n(r[key]);
    (m[k] = m[k] || []).push(r);
    return m;
  }, {});

  const toplrMap = group(allToplr, 'hmid');
  const hmezMap  = group(allHmez,  'hmid');
  const acctMap  = group(allAccount, 'hmid');

  let created = 0, skipped = 0;

  for (const sm of allScales) {
    const hmid = n(sm.id);
    const pid  = n(sm.parentid);
    if (!CATEGORY_MAP[pid] || !scalesWithQ.has(hmid)) continue;

    const code = `MDB_${hmid}`;
    if (await prisma.assessmentScale.findUnique({ where: { code } })) { skipped++; continue; }

    const qs_raw   = toplrMap[hmid] || [];
    const dims_raw = hmezMap[hmid]  || [];
    const interps  = (acctMap[hmid] || []).map(i => ({
      dimension: (i.name || '').trim() === String(sm.name || '').trim() ? null : (i.name || '').trim(),
      minScore: parseFloat(i.min) || 0,
      maxScore: parseFloat(i.max) || 0,
      ageMin:   i.agemin != null ? n(i.agemin) : null,
      ageMax:   i.agemax != null ? n(i.agemax) : null,
      gender:   (i.xb || '').trim() || null,
      detail:   (i.explain || '').trim(),
    }));

    const dims = dims_raw.map(d => ({
      code: String(d.ez || '').trim(),
      questions: String(d.topid || '').split(',').map(s => parseInt(s.trim())).filter(x => !isNaN(x)),
    }));
    const scoringRule = JSON.stringify(dims.length ? { method: 'dimension_total', dimensions: dims } : { method: 'sum' });

    const questions = qs_raw.map(q => {
      const chc = n(q.chc) || 0;
      const opts = Array.from({ length: chc }, (_, k) => ({
        value: parseFloat(q[SCR_KEYS[k]]) || k,
        label: (q[OPT_KEYS[k]] || '').trim(),
      }));
      return {
        orderNum:  n(q.topid),
        content:   (q.toplr || '').trim(),
        options:   JSON.stringify(opts),
        dimension: (q.hmna  || '').trim() || null,
      };
    });

    const scale = await prisma.assessmentScale.create({
      data: {
        code, name: String(sm.name || '').trim(),
        category: CATEGORY_MAP[pid],
        description: (sm.hmjg || sm.name || '').trim(),
        totalQuestions: questions.length,
        estimatedMinutes: Math.max(3, Math.floor(questions.length / 3)),
        isPaid: false, isActive: true, scoringRule,
      }
    });

    if (questions.length)
      await prisma.assessmentQuestion.createMany({ data: questions.map(q => ({ scaleId: scale.id, ...q })) });
    if (interps.length)
      await prisma.assessmentInterpretation.createMany({ data: interps.map(i => ({ ...i, scaleId: scale.id })) });

    created++;
  }

  console.log(`Done: created=${created} skipped=${skipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
