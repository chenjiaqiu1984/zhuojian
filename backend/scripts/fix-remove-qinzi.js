// 运行: cd backend && node scripts/fix-remove-qinzi.js
// 作用: 从数据库中移除亲子互动工具卡，并将用到该卡的预设替换为孩童卡·情况(catId:10)
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1. 删除「亲子互动工具卡」单卡 preset
  const deleted = await p.ohCardPreset.deleteMany({
    where: { type: 'single', title: '亲子互动工具卡' }
  });
  console.log(`✓ 删除单卡 preset: ${deleted.count} 条`);

  // 2. 更新 combo「亲子关系与代际传递」
  const combo = await p.ohCardPreset.findFirst({
    where: { type: 'combo', title: '亲子关系与代际传递' }
  });
  if (combo) {
    const cfg = JSON.parse(combo.config);
    cfg.slots = cfg.slots.map(s =>
      s.cat === '亲子互动工具卡'
        ? { catId: 10, label: '我和孩子的互动情况', cat: '孩童卡·情况' }
        : s
    );
    if (cfg.qs) {
      cfg.qs = cfg.qs.map(q =>
        q.includes('亲子互动卡') ? '孩童卡上的这个互动情况，让你想到什么？' : q
      );
    }
    await p.ohCardPreset.update({
      where: { id: combo.id },
      data: { config: JSON.stringify(cfg) }
    });
    console.log(`✓ 更新 combo「亲子关系与代际传递」(id=${combo.id})`);
  } else {
    console.log('  combo「亲子关系与代际传递」不存在，跳过');
  }

  // 3. 更新 scene「孩子让我崩溃」
  const scene = await p.ohCardPreset.findFirst({
    where: { type: 'scene', title: '孩子让我崩溃' }
  });
  if (scene) {
    const cfg = JSON.parse(scene.config);
    cfg.slots = cfg.slots.map(s =>
      s.cat === '亲子互动工具卡'
        ? { catId: 10, label: '我们的互动情况', cat: '孩童卡·情况' }
        : s
    );
    if (cfg.qs) {
      cfg.qs = cfg.qs.map(q =>
        q.includes('互动卡的场景') ? '这个互动情况让你想到什么？' : q
      );
    }
    await p.ohCardPreset.update({
      where: { id: scene.id },
      data: { config: JSON.stringify(cfg) }
    });
    console.log(`✓ 更新 scene「孩子让我崩溃」(id=${scene.id})`);
  } else {
    console.log('  scene「孩子让我崩溃」不存在，跳过');
  }

  // 4. 更新 dilemma「照顾者的枯竭」
  const dilemma = await p.ohCardPreset.findFirst({
    where: { type: 'dilemma', title: '照顾者的枯竭' }
  });
  if (dilemma) {
    const cfg = JSON.parse(dilemma.config);
    cfg.slots = cfg.slots.map(s =>
      (s.cat === '亲子互动卡' || s.cat === '亲子互动工具卡')
        ? { catId: 10, label: s.label, cat: '孩童卡·情况' }
        : s
    );
    if (cfg.cards) cfg.cards = cfg.cards.replace(/亲子互动卡/g, '孩童卡·情况');
    await p.ohCardPreset.update({
      where: { id: dilemma.id },
      data: { config: JSON.stringify(cfg) }
    });
    console.log(`✓ 更新 dilemma「照顾者的枯竭」(id=${dilemma.id})`);
  } else {
    console.log('  dilemma「照顾者的枯竭」不存在，跳过');
  }

  console.log('\n全部完成。');
}

main().catch(console.error).finally(() => p.$disconnect());
