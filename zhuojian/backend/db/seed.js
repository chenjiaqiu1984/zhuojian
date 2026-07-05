const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Admin user
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: bcrypt.hashSync('admin123', 10), role: 'admin', name: '超级管理员' }
  });

  // About
  const about = await prisma.about.findFirst();
  if (!about) {
    await prisma.about.create({ data: { title: '卓见心理', content: '卓见心理是一家专注于心理咨询、团建活动和心理培训的专业机构。\n\n我们的核心业务：\n• 个人心理咨询\n• 企业团建活动\n• 心理培训课程\n• OH卡心理工具应用' } });
  }

  // OH card categories + cards (idempotent)
  let imageCat = await prisma.ohCardCategory.findFirst({ where: { name: 'OH图卡' } });
  let wordCat = await prisma.ohCardCategory.findFirst({ where: { name: 'OH字卡' } });

  if (!imageCat) {
    imageCat = await prisma.ohCardCategory.create({ data: { name: 'OH图卡', type: 'image', description: '经典OH卡图片牌组' } });
    await prisma.ohCardCategory.create({ data: { name: 'Persona图卡', type: 'image', description: 'Persona人物图卡' } });
  }
  if (!wordCat) {
    wordCat = await prisma.ohCardCategory.create({ data: { name: 'OH字卡', type: 'word', description: '经典OH卡文字牌组' } });
  }

  await prisma.ohCard.deleteMany({ where: { categoryId: imageCat.id } });
  await prisma.ohCard.createMany({
    data: Array.from({ length: 88 }, (_, i) => ({
      categoryId: imageCat.id,
      imageUrl: `/uploads/ohcards/${i + 1 === 47 ? '47_' : i + 1}.jpg`
    }))
  });

  await prisma.ohCard.deleteMany({ where: { categoryId: wordCat.id } });
  const words = [
    '羞辱','分享','等候','停止','攫取','恐吓','裸体',
    '梦想','游戏','诙谐','聪明','道歉','孤独','哀伤',
    '丢脸','前进','色情','危险','上司','父亲','丑陋',
    '受害者','敌对','羞愧','尴尬','放开','奇妙','改变',
    '违背','亏欠','坚定','执着','习惯','失败','错误',
    '付出','生气','焦虑','权利游戏','吸引','欢笑','攻击',
    '憎恶','厌烦','犹豫','退省','不喜欢','恐惧','希望',
    '破坏','女人','压抑','幻想','感情','痛苦','同性恋',
    '腐朽','罪恶感','混乱','愚蠢','男性','固执','奴隶',
    '疲惫','强迫','顺应','专家','威胁','谎言','应该',
    '喜悦','循环','孩童','成功','开始','夸赞','躲藏',
    '姿态','消除','母亲','家','弄巧成拙','陌生人','抗拒',
    '憎恨','依赖','爱情','外表'
  ];
  await prisma.ohCard.createMany({ data: words.map(w => ({ categoryId: wordCat.id, word: w })) });

  console.log('Seed completed');
}

const seedAssessments = require('./assessmentSeed');

async function run() {
  await main();
  await seedAssessments();
}
run().catch(console.error).finally(() => prisma.$disconnect());
