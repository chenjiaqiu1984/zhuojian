const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const menuGroups = [
  {
    label: '咨询 · 资讯',
    items: [
      { path: '/pages/consultants/index', label: '预约咨询师', icon: '/static/icons/grid/consultant.svg', color: '#4A8A7A' },
      { path: '/pages/activity/index',    label: '线下活动',   icon: '/static/icons/grid/activity.svg',   color: '#4A8A7A' },
      { path: '/pages/news/index',        label: '动态资讯', icon: '/static/icons/grid/news.svg',       color: '#4A8A7A' },
      { path: '/pages/about/index',       label: '关于我们', icon: '/static/icons/grid/about.svg',      color: '#4A8A7A' },
    ],
  },
  {
    label: '心理工具',
    items: [
      { path: '/pages/assessment/index',  label: '心理测评', icon: '/static/icons/grid/assessment.svg', color: '#3A6E80' },
      { path: '/pages/ohcard/index',      label: '心理图卡', icon: '/static/icons/grid/ohcard.svg',     color: '#3A6E80' },
      { path: '/pages/homework/index',    label: '咨询工具', icon: '/static/icons/grid/homework.svg',   color: '#3A6E80' },
      { path: '/pages/learning/index',    label: '学习进阶', icon: '/static/icons/grid/learning.svg',   color: '#3A6E80' },
    ],
  },
  {
    label: '解压游戏',
    items: [
      { path: '/pages/mandala/index',    label: '曼达拉',    icon: '/static/icons/grid/mandala.svg',    color: '#3A6E80' },
      { path: '/pages/breathing/select', label: '正念呼吸',  icon: '/static/icons/grid/breathing.svg',  color: '#3A6E80' },
      { path: '/pages/monster/index',    label: '情绪怪兽',  icon: '/static/icons/grid/monster.svg',    color: '#3A6E80' },
      { path: '/pages/squeeze/index',    label: '解压捏捏乐', icon: '/static/icons/grid/squeeze.svg',   color: '#3A6E80' },
    ],
  },
];

async function main() {
  const exists = await prisma.about.findFirst();
  if (exists) {
    await prisma.about.update({
      where: { id: exists.id },
      data: { menuGroups: JSON.stringify(menuGroups) },
    });
    console.log('menuGroups 已更新');
  } else {
    await prisma.about.create({
      data: { menuGroups: JSON.stringify(menuGroups) },
    });
    console.log('about 记录已创建并写入 menuGroups');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
