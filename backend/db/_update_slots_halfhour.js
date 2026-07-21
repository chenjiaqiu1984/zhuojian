const prisma = require('../db/database');

async function main() {
  // 1. 加 work_experience 列（忽略已存在错误）
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Consultant" ADD COLUMN "work_experience" TEXT`);
    console.log('已添加 work_experience 列');
  } catch { console.log('work_experience 列已存在，跳过'); }

  // 2. 更新王卓资料
  const c = await prisma.consultant.findFirst({ where: { name: '王卓' } });
  if (!c) return console.log('未找到咨询师王卓');

  await prisma.$executeRawUnsafe(
    `UPDATE "Consultant" SET work_experience = ? WHERE id = ?`,
    `· 卓见心理创始人，15年家庭教育与心理咨询从业经历
· 平均每年服务8000+来访者，积累丰富临床实践经验
· 为企业、IT、地产、金融、教育、互联网等多行业机构提供专业团辅培训
· 擅长将艺术疗愈融入企业EAP、亲子沙龙及个案咨询中
· 长期接受专业督导，持续精进咨询技能与疗愈方法`,
    c.id
  );

  // 3. 重建时间段：30分钟间隔，每次1小时
  await prisma.timeSlot.deleteMany({ where: { consultantId: c.id, isBooked: 0 } });

  const now = new Date();
  // [dow, windowStartMinutes, windowEndMinutes]  最后一个slot结束 <= windowEnd
  const schedule = [
    { dow: 1, start: 9 * 60,   end: 12 * 60 },  // 周一上午
    { dow: 3, start: 13 * 60,  end: 17 * 60 },  // 周三下午
    { dow: 4, start: 19 * 60,  end: 21 * 60 },  // 周四晚上
    { dow: 5, start: 13 * 60,  end: 17 * 60 },  // 周五下午
    { dow: 6, start: 9 * 60,   end: 18 * 60 },  // 周六全天
  ];

  const slots = [];
  for (let w = 0; w < 8; w++) {
    for (const { dow, start, end } of schedule) {
      for (let m = start; m + 60 <= end; m += 30) {
        const d = new Date(now);
        const diff = ((dow - d.getDay()) + 7) % 7 || 7;
        d.setDate(d.getDate() + diff + w * 7);
        d.setHours(0, m, 0, 0);
        if (d <= now) continue;
        const e = new Date(d);
        e.setMinutes(e.getMinutes() + 60);
        slots.push({ consultantId: c.id, startTime: d.toISOString(), endTime: e.toISOString() });
      }
    }
  }

  await prisma.timeSlot.createMany({ data: slots });
  console.log(`完成：生成时间段 ${slots.length} 个`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
