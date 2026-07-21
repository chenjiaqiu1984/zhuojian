const prisma = require('../db/database');
const fs = require('fs');
const path = require('path');

async function main() {
  const src = path.join(__dirname, '../../uploads/咨询师介绍/王卓.jpg');
  const destDir = path.join(__dirname, '../../uploads/consultants');
  const dest = path.join(destDir, 'wangzhuo.jpg');

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('照片已复制到', dest);

  const c = await prisma.consultant.findFirst({ where: { name: '王卓' } });
  if (!c) return console.log('未找到咨询师王卓');

  await prisma.consultant.update({
    where: { id: c.id },
    data: {
      avatar: '/uploads/consultants/wangzhuo.jpg',
      specialties: '催眠治疗,家庭教育,儿童感统训练,NLP神经语言程序,艺术疗愈,OH卡,亲子沙龙,EAP企业服务,焦虑抑郁疏导,亲密关系',
      education: '国际名校海归心理硕士\n美国NGH协会注册催眠师\n国际NLP注册执行师\nICS国际儿童感统教育协会注册高级感统师\n家庭教育指导师',
      yearsExp: 15,
      bio: `卓见心理创始人，国际名校海归心理硕士，15年家庭教育从业经验，平均每年8000+来访。

将艺术疗愈与心理咨询相融合，专注于通过艺术创作帮助人们释放压力、探索真实的自我。陆续为企业、IT、地产、金融、教育、互联网等多领域机构提供专业培训与咨询服务。`,
    }
  });
  console.log('咨询师资料已更新，ID:', c.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
