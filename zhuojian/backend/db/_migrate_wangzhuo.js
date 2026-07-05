const prisma = require('../db/database');

// 生成未来 N 周的可约时间段
function genSlots(consultantId, weeks = 8) {
  const slots = [];
  const now = new Date();
  // 每周排班：[星期几(0=周日), 开始小时列表]
  const schedule = [
    { dow: 1, hours: [9, 10, 11] },          // 周一上午
    { dow: 3, hours: [13, 14, 15, 16] },     // 周三下午
    { dow: 4, hours: [19, 20] },             // 周四晚上
    { dow: 5, hours: [13, 14, 15, 16] },     // 周五下午
    { dow: 6, hours: [9,10,11,13,14,15,16,17] }, // 周六全天
  ];
  for (let w = 0; w < weeks; w++) {
    for (const { dow, hours } of schedule) {
      for (const h of hours) {
        // 找到本周+w周的对应星期几
        const d = new Date(now);
        const diff = (dow - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + diff + w * 7);
        d.setHours(h, 0, 0, 0);
        if (d <= now) continue;
        const end = new Date(d);
        end.setHours(h + 1);
        slots.push({ consultantId, startTime: d.toISOString(), endTime: end.toISOString() });
      }
    }
  }
  return slots;
}

async function main() {
  const data = {
    name: '王卓',
    title: '创始人 · 心理硕士 · 催眠师',
    bio: `卓见心理创始人，国际名校海归心理硕士。

资质认证：
· 美国NGH协会注册催眠师
· 国际神经语言程序学NLP注册执行师
· ICS国际儿童感统教育协会注册高级感统师
· 家庭教育指导师

从业经验：15年家庭教育从业经验，平均每年8000+来访。

将艺术疗愈与心理咨询相融合，专注于通过艺术创作帮助人们释放压力、探索真实的自我。服务企业、IT、地产、金融、教育、互联网等多领域机构。`,
    specialties: '催眠治疗,家庭教育,儿童感统,NLP,艺术疗愈,OH卡,亲子沙龙,EAP企业服务',
    education: '国际名校心理学硕士',
    yearsExp: 15,
    isActive: 1,
  };

  let c = await prisma.consultant.findFirst({ where: { name: '王卓' } });
  if (c) {
    await prisma.consultant.update({ where: { id: c.id }, data });
  } else {
    c = await prisma.consultant.create({ data });
  }

  // 清除旧的未预约时间段，重新生成
  await prisma.timeSlot.deleteMany({ where: { consultantId: c.id, isBooked: 0 } });
  const slots = genSlots(c.id, 8);
  await prisma.timeSlot.createMany({ data: slots });

  console.log(`完成。咨询师 ID: ${c.id}，生成时间段: ${slots.length} 个`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
