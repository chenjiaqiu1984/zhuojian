const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const prisma = new PrismaClient();

// ── 成就定义 ──────────────────────────────────────────────────────
// type: ohcard | assessment | breathing | mandala | squeeze | profile | order | login | combo
// condition: 检查函数名（在 CHECKERS 中定义）
// threshold: 数量门槛（用于次数类成就）

const ACHIEVEMENTS = [

  // ── OH卡 ──────────────────────────────────────────────────────
  { key: 'ohcard_1',         type: 'ohcard',      icon: '🃏', name: '初次抽卡',       desc: '完成第1次OH卡',         condition: 'ohcard_total',      threshold: 1    },
  { key: 'ohcard_5',         type: 'ohcard',      icon: '🃏', name: '卡牌入门',       desc: '累计抽卡5次',           condition: 'ohcard_total',      threshold: 5    },
  { key: 'ohcard_10',        type: 'ohcard',      icon: '🃏', name: '卡牌爱好者',     desc: '累计抽卡10次',          condition: 'ohcard_total',      threshold: 10   },
  { key: 'ohcard_20',        type: 'ohcard',      icon: '🃏', name: '卡牌探索者',     desc: '累计抽卡20次',          condition: 'ohcard_total',      threshold: 20   },
  { key: 'ohcard_50',        type: 'ohcard',      icon: '🃏', name: '卡牌达人',       desc: '累计抽卡50次',          condition: 'ohcard_total',      threshold: 50   },
  { key: 'ohcard_100',       type: 'ohcard',      icon: '🏅', name: '百卡成就',       desc: '累计抽卡100次',         condition: 'ohcard_total',      threshold: 100  },
  { key: 'ohcard_200',       type: 'ohcard',      icon: '🥈', name: '卡牌收藏家',     desc: '累计抽卡200次',         condition: 'ohcard_total',      threshold: 200  },
  { key: 'ohcard_500',       type: 'ohcard',      icon: '🥇', name: '卡牌大师',       desc: '累计抽卡500次',         condition: 'ohcard_total',      threshold: 500  },
  { key: 'ohcard_1000',      type: 'ohcard',      icon: '💎', name: '卡牌传说',       desc: '累计抽卡1000次',        condition: 'ohcard_total',      threshold: 1000 },
  { key: 'ohcard_2000',      type: 'ohcard',      icon: '👑', name: '卡牌之王',       desc: '累计抽卡2000次',        condition: 'ohcard_total',      threshold: 2000 },
  { key: 'ohcard_types_3',   type: 'ohcard',      icon: '🌈', name: '多面探索',       desc: '解锁3种OH卡玩法',       condition: 'ohcard_types',      threshold: 3    },
  { key: 'ohcard_types_5',   type: 'ohcard',      icon: '⭐', name: '玩法全开',       desc: '解锁5种OH卡玩法',       condition: 'ohcard_types',      threshold: 5    },
  { key: 'ohcard_types_all', type: 'ohcard',      icon: '🌟', name: '全能探索者',     desc: '解锁全部8种OH卡玩法',   condition: 'ohcard_types',      threshold: 8    },
  { key: 'ohcard_dilemma_1', type: 'ohcard',      icon: '🔱', name: '困境勇者',       desc: '完成1次人生困境',       condition: 'ohcard_type_count', threshold: 1,   typeFilter: 'dilemma' },
  { key: 'ohcard_room_5',    type: 'ohcard',      icon: '🚪', name: '房间主人',       desc: '完成5次房间抽卡',       condition: 'ohcard_type_count', threshold: 5,   typeFilter: 'room'    },

  // ── 心理测评 ──────────────────────────────────────────────────
  { key: 'assess_1',         type: 'assessment',  icon: '🧠', name: '自我初探',       desc: '完成第1次测评',         condition: 'assess_total',      threshold: 1    },
  { key: 'assess_5',         type: 'assessment',  icon: '🧠', name: '深度探索',       desc: '累计完成5次测评',       condition: 'assess_total',      threshold: 5    },
  { key: 'assess_10',        type: 'assessment',  icon: '🧠', name: '心理探索者',     desc: '累计完成10次测评',      condition: 'assess_total',      threshold: 10   },
  { key: 'assess_20',        type: 'assessment',  icon: '🧠', name: '测评达人',       desc: '累计完成20次测评',      condition: 'assess_total',      threshold: 20   },
  { key: 'assess_50',        type: 'assessment',  icon: '🏅', name: '测评专家',       desc: '累计完成50次测评',      condition: 'assess_total',      threshold: 50   },
  { key: 'assess_100',       type: 'assessment',  icon: '🥇', name: '测评大师',       desc: '累计完成100次测评',     condition: 'assess_total',      threshold: 100  },
  { key: 'assess_200',       type: 'assessment',  icon: '💎', name: '测评传奇',       desc: '累计完成200次测评',     condition: 'assess_total',      threshold: 200  },
  { key: 'assess_500',       type: 'assessment',  icon: '👑', name: '测评之神',       desc: '累计完成500次测评',     condition: 'assess_total',      threshold: 500  },
  { key: 'assess_types_3',   type: 'assessment',  icon: '🌈', name: '多维了解',       desc: '完成3种不同类型测评',   condition: 'assess_types',      threshold: 3    },
  { key: 'assess_types_5',   type: 'assessment',  icon: '🌟', name: '全面认知',       desc: '完成5种不同类型测评',   condition: 'assess_types',      threshold: 5    },

  // ── 呼吸练习 ──────────────────────────────────────────────────
  { key: 'breath_1',         type: 'breathing',   icon: '🌬️', name: '初次呼吸',       desc: '完成第1次呼吸练习',     condition: 'breath_total',      threshold: 1    },
  { key: 'breath_5',         type: 'breathing',   icon: '🌬️', name: '呼吸入门',       desc: '累计完成5次呼吸练习',   condition: 'breath_total',      threshold: 5    },
  { key: 'breath_10',        type: 'breathing',   icon: '🌬️', name: '呼吸爱好者',     desc: '累计完成10次呼吸练习',  condition: 'breath_total',      threshold: 10   },
  { key: 'breath_20',        type: 'breathing',   icon: '🌊', name: '呼吸达人',       desc: '累计完成20次呼吸练习',  condition: 'breath_total',      threshold: 20   },
  { key: 'breath_50',        type: 'breathing',   icon: '🏅', name: '呼吸大师',       desc: '累计完成50次呼吸练习',  condition: 'breath_total',      threshold: 50   },
  { key: 'breath_100',       type: 'breathing',   icon: '🥇', name: '呼吸百练',       desc: '累计完成100次呼吸练习', condition: 'breath_total',      threshold: 100  },
  { key: 'breath_200',       type: 'breathing',   icon: '💎', name: '呼吸传奇',       desc: '累计完成200次呼吸练习', condition: 'breath_total',      threshold: 200  },
  { key: 'breath_500',       type: 'breathing',   icon: '👑', name: '呼吸之王',       desc: '累计完成500次呼吸练习', condition: 'breath_total',      threshold: 500  },
  { key: 'breath_program_1', type: 'breathing',   icon: '🌙', name: '课程初修',       desc: '完成1个完整呼吸课程',   condition: 'breath_program',    threshold: 1    },
  { key: 'breath_program_5', type: 'breathing',   icon: '🧘', name: '课程修炼者',     desc: '完成5个完整呼吸课程',   condition: 'breath_program',    threshold: 5    },
  { key: 'breath_sleep',     type: 'breathing',   icon: '🌙', name: '深夜陪伴',       desc: '完成入睡准备课程',      condition: 'breath_prog_type',  threshold: 1,   typeFilter: 'sleep'   },
  { key: 'breath_focus',     type: 'breathing',   icon: '🎯', name: '专注启动',       desc: '完成专注启动课程',      condition: 'breath_prog_type',  threshold: 1,   typeFilter: 'focus'   },
  { key: 'breath_modes_all', type: 'breathing',   icon: '🌈', name: '模式全通',       desc: '完成全部4种单一呼吸模式', condition: 'breath_modes',    threshold: 4    },

  // ── 曼陀罗 ────────────────────────────────────────────────────
  { key: 'mandala_1',        type: 'mandala',     icon: '🎨', name: '初次创作',       desc: '完成第1幅曼陀罗',       condition: 'mandala_total',     threshold: 1    },
  { key: 'mandala_5',        type: 'mandala',     icon: '🎨', name: '艺术入门',       desc: '完成5幅曼陀罗',         condition: 'mandala_total',     threshold: 5    },
  { key: 'mandala_10',       type: 'mandala',     icon: '🎨', name: '曼陀罗艺术家',   desc: '完成10幅曼陀罗',        condition: 'mandala_total',     threshold: 10   },
  { key: 'mandala_20',       type: 'mandala',     icon: '🏅', name: '曼陀罗大师',     desc: '完成20幅曼陀罗',        condition: 'mandala_total',     threshold: 20   },
  { key: 'mandala_50',       type: 'mandala',     icon: '🥇', name: '曼陀罗传奇',     desc: '完成50幅曼陀罗',        condition: 'mandala_total',     threshold: 50   },
  { key: 'mandala_100',      type: 'mandala',     icon: '👑', name: '曼陀罗之神',     desc: '完成100幅曼陀罗',       condition: 'mandala_total',     threshold: 100  },

  // ── 个人资料 ──────────────────────────────────────────────────
  { key: 'profile_name',     type: 'profile',     icon: '✏️', name: '有名有姓',       desc: '设置了昵称',            condition: 'profile_name',      threshold: 1    },
  { key: 'profile_avatar',   type: 'profile',     icon: '🖼️', name: '真实的我',       desc: '上传了头像',            condition: 'profile_avatar',    threshold: 1    },
  { key: 'profile_complete', type: 'profile',     icon: '✨', name: '完整档案',       desc: '昵称和头像都已完善',    condition: 'profile_complete',  threshold: 1    },

  // ── 下单 ──────────────────────────────────────────────────────
  { key: 'order_1',          type: 'order',       icon: '🎁', name: '第一单',         desc: '完成首次下单',          condition: 'order_total',       threshold: 1    },
  { key: 'order_5',          type: 'order',       icon: '💳', name: '忠实用户',       desc: '累计下单5次',           condition: 'order_total',       threshold: 5    },
  { key: 'order_10',         type: 'order',       icon: '🥈', name: '老朋友',         desc: '累计下单10次',          condition: 'order_total',       threshold: 10   },
  { key: 'order_20',         type: 'order',       icon: '🥇', name: '铁杆支持者',     desc: '累计下单20次',          condition: 'order_total',       threshold: 20   },
  { key: 'order_50',         type: 'order',       icon: '💎', name: '超级会员',       desc: '累计下单50次',          condition: 'order_total',       threshold: 50   },
  { key: 'order_100',        type: 'order',       icon: '👑', name: '至尊伙伴',       desc: '累计下单100次',         condition: 'order_total',       threshold: 100  },

  // ── 登录天数 ──────────────────────────────────────────────────
  { key: 'login_days_1',     type: 'login',       icon: '👋', name: '初次到来',       desc: '首次登录',              condition: 'login_days',        threshold: 1    },
  { key: 'login_days_5',     type: 'login',       icon: '🌱', name: '初探者',         desc: '累计登录5天',           condition: 'login_days',        threshold: 5    },
  { key: 'login_days_10',    type: 'login',       icon: '🌿', name: '常客',           desc: '累计登录10天',          condition: 'login_days',        threshold: 10   },
  { key: 'login_days_20',    type: 'login',       icon: '🌳', name: '老朋友',         desc: '累计登录20天',          condition: 'login_days',        threshold: 20   },
  { key: 'login_days_50',    type: 'login',       icon: '🏅', name: '忠实伙伴',       desc: '累计登录50天',          condition: 'login_days',        threshold: 50   },
  { key: 'login_days_100',   type: 'login',       icon: '🥇', name: '百日之约',       desc: '累计登录100天',         condition: 'login_days',        threshold: 100  },
  { key: 'login_days_200',   type: 'login',       icon: '💎', name: '深度陪伴',       desc: '累计登录200天',         condition: 'login_days',        threshold: 200  },
  { key: 'login_days_365',   type: 'login',       icon: '🌟', name: '一年之约',       desc: '累计登录365天',         condition: 'login_days',        threshold: 365  },
  { key: 'login_days_500',   type: 'login',       icon: '👑', name: '永恒伙伴',       desc: '累计登录500天',         condition: 'login_days',        threshold: 500  },

  // ── 连续登录 ──────────────────────────────────────────────────
  { key: 'streak_3',         type: 'login',       icon: '🔥', name: '三连登录',       desc: '连续登录3天',           condition: 'login_streak',      threshold: 3    },
  { key: 'streak_7',         type: 'login',       icon: '🔥', name: '一周坚持',       desc: '连续登录7天',           condition: 'login_streak',      threshold: 7    },
  { key: 'streak_14',        type: 'login',       icon: '🔥', name: '两周不间断',     desc: '连续登录14天',          condition: 'login_streak',      threshold: 14   },
  { key: 'streak_30',        type: 'login',       icon: '💫', name: '月度坚守',       desc: '连续登录30天',          condition: 'login_streak',      threshold: 30   },
  { key: 'streak_60',        type: 'login',       icon: '⭐', name: '两月不息',       desc: '连续登录60天',          condition: 'login_streak',      threshold: 60   },
  { key: 'streak_100',       type: 'login',       icon: '🌟', name: '百日不辍',       desc: '连续登录100天',         condition: 'login_streak',      threshold: 100  },
  { key: 'streak_365',       type: 'login',       icon: '👑', name: '年度守护者',     desc: '连续登录365天',         condition: 'login_streak',      threshold: 365  },

  // ── 综合成就 ──────────────────────────────────────────────────
  { key: 'combo_3types',     type: 'combo',       icon: '🌈', name: '全能用户',       desc: '使用过OH卡、测评、呼吸三大功能', condition: 'combo_3types', threshold: 1 },
  { key: 'combo_5types',     type: 'combo',       icon: '🌟', name: '平台探索家',     desc: '使用过5种不同功能',     condition: 'combo_5types',      threshold: 1    },
  { key: 'combo_total_100',  type: 'combo',       icon: '🏅', name: '百次践行',       desc: '各类功能总使用次数达100次', condition: 'combo_total',   threshold: 100  },
  { key: 'combo_total_500',  type: 'combo',       icon: '🥇', name: '五百次成长',     desc: '各类功能总使用次数达500次', condition: 'combo_total',   threshold: 500  },
  { key: 'combo_total_1000', type: 'combo',       icon: '💎', name: '千次蜕变',       desc: '各类功能总使用次数达1000次', condition: 'combo_total',  threshold: 1000 },
  { key: 'combo_total_2000', type: 'combo',       icon: '👑', name: '两千次传奇',     desc: '各类功能总使用次数达2000次', condition: 'combo_total',  threshold: 2000 },

  // ── 咨询工具（心理作业）──────────────────────────────────────
  { key: 'homework_1',       type: 'homework',    icon: '📓', name: '初次记录',       desc: '完成第1次咨询工具记录',   condition: 'homework_total',    threshold: 1    },
  { key: 'homework_5',       type: 'homework',    icon: '📓', name: '勤于记录',       desc: '累计完成5次咨询工具记录', condition: 'homework_total',    threshold: 5    },
  { key: 'homework_10',      type: 'homework',    icon: '📓', name: '记录达人',       desc: '累计完成10次',            condition: 'homework_total',    threshold: 10   },
  { key: 'homework_20',      type: 'homework',    icon: '📓', name: '坚持记录',       desc: '累计完成20次',            condition: 'homework_total',    threshold: 20   },
  { key: 'homework_50',      type: 'homework',    icon: '🏅', name: '记录专家',       desc: '累计完成50次',            condition: 'homework_total',    threshold: 50   },
  { key: 'homework_100',     type: 'homework',    icon: '🥇', name: '记录大师',       desc: '累计完成100次',           condition: 'homework_total',    threshold: 100  },
  { key: 'homework_200',     type: 'homework',    icon: '💎', name: '记录传奇',       desc: '累计完成200次',           condition: 'homework_total',    threshold: 200  },
  { key: 'homework_500',     type: 'homework',    icon: '👑', name: '记录之神',       desc: '累计完成500次',           condition: 'homework_total',    threshold: 500  },
  { key: 'homework_mood',    type: 'homework',    icon: '😊', name: '情绪观察者',     desc: '完成第1次情绪记录',       condition: 'homework_mood',     threshold: 1    },
  { key: 'homework_cbt',     type: 'homework',    icon: '🧩', name: '认知重构者',     desc: '完成第1次CBT记录',        condition: 'homework_cbt',      threshold: 1    },
  { key: 'homework_dream',   type: 'homework',    icon: '🌙', name: '梦境探索者',     desc: '完成第1次梦境分析',       condition: 'homework_dream',    threshold: 1    },
  { key: 'homework_iceberg', type: 'homework',    icon: '🧊', name: '冰山潜行者',     desc: '完成第1次冰山模型',       condition: 'homework_iceberg',  threshold: 1    },
  { key: 'homework_rule',    type: 'homework',    icon: '✍️', name: '规则改写者',     desc: '完成第1次规则改写',       condition: 'homework_rule',     threshold: 1    },
  { key: 'homework_types_3', type: 'homework',    icon: '🌈', name: '多维成长',       desc: '使用过3种不同咨询工具',   condition: 'homework_types',    threshold: 3    },
  { key: 'homework_types_5', type: 'homework',    icon: '🌟', name: '全能成长者',     desc: '使用过全部5种咨询工具',   condition: 'homework_types',    threshold: 5    },

  // ── 活动报名 ──────────────────────────────────────────────────
  { key: 'activity_1',       type: 'activity',    icon: '🎪', name: '初次参与',       desc: '参加第1次活动',           condition: 'activity_total',    threshold: 1    },
  { key: 'activity_5',       type: 'activity',    icon: '🎪', name: '活动常客',       desc: '累计参加5次活动',         condition: 'activity_total',    threshold: 5    },
  { key: 'activity_10',      type: 'activity',    icon: '🎪', name: '活动达人',       desc: '累计参加10次活动',        condition: 'activity_total',    threshold: 10   },
  { key: 'activity_20',      type: 'activity',    icon: '🏅', name: '活动爱好者',     desc: '累计参加20次活动',        condition: 'activity_total',    threshold: 20   },
  { key: 'activity_50',      type: 'activity',    icon: '🥇', name: '活动明星',       desc: '累计参加50次活动',        condition: 'activity_total',    threshold: 50   },
  { key: 'activity_100',     type: 'activity',    icon: '👑', name: '活动传奇',       desc: '累计参加100次活动',       condition: 'activity_total',    threshold: 100  },
];

// ── 统计查询 ───────────────────────────────────────────────────────
async function getStats(userId) {
  const [
    ohcardTotal, ohcardTypes, assessTotal, assessTypes,
    breathTotal, breathProgram, breathModes,
    mandalaTotal, orderTotal, loginDays, loginLogs,
    profileUser,
    moodTotal, cbtTotal, dreamTotal, icebergTotal, ruleTotal,
    activityTotal,
  ] = await Promise.all([
    prisma.ohCardRecord.count({ where: { userId } }),
    prisma.ohCardRecord.groupBy({ by: ['type'], where: { userId } }),
    prisma.assessmentResult.count({ where: { userId } }),
    prisma.assessmentResult.findMany({ where: { userId }, select: { scale: { select: { category: true } } } }),
    prisma.breathingSession.count({ where: { userId } }),
    prisma.breathingSession.count({ where: { userId, isProgramMode: 1 } }),
    prisma.breathingSession.groupBy({ by: ['mode'], where: { userId, isProgramMode: 0 } }),
    prisma.eventLog.count({ where: { userId, event: 'mandala_save' } }),
    prisma.order.count({ where: { userId, status: 'paid' } }),
    prisma.userLoginLog.groupBy({ by: ['dateStr'], where: { userId } }),
    prisma.userLoginLog.findMany({ where: { userId }, orderBy: { loginAt: 'asc' }, select: { dateStr: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatar: true } }),
    prisma.moodEntry.count({ where: { userId } }),
    prisma.cbtRecord.count({ where: { userId } }),
    prisma.dreamRecord.count({ where: { userId } }),
    prisma.icebergRecord.count({ where: { userId } }),
    prisma.ruleRecord.count({ where: { userId } }),
    prisma.activityRegistration.count({ where: { phone: { not: '' } } }), // 按 userId 需要改表，暂用 eventLog
  ]);

  // 活动报名用 eventLog 计数（activityRegistration 没有 userId 字段）
  const activityEventTotal = await prisma.eventLog.count({ where: { userId, event: 'activity_register' } });

  // 咨询工具总次数
  const homeworkTotal = moodTotal + cbtTotal + dreamTotal + icebergTotal + ruleTotal;

  // 咨询工具种类数
  const homeworkTypes = [moodTotal, cbtTotal, dreamTotal, icebergTotal, ruleTotal].filter(n => n > 0).length;

  // 计算连续登录天数
  const dates = [...new Set(loginLogs.map(l => l.dateStr))].sort();
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const cur = new Date(dates[i]);
    if (i === dates.length - 1) {
      const today = new Date(); today.setHours(0,0,0,0);
      const diff  = Math.round((today - cur) / 86400000);
      if (diff > 1) break;
      streak = 1;
    } else {
      const diff = Math.round((new Date(dates[i+1]) - cur) / 86400000);
      if (diff === 1) { streak++; } else { break; }
    }
  }

  // 综合总次数（含咨询工具）
  const comboTotal = ohcardTotal + assessTotal + breathTotal + mandalaTotal + homeworkTotal + activityEventTotal;

  // 使用过的功能类型
  const usedTypes = new Set();
  if (ohcardTotal > 0)          usedTypes.add('ohcard');
  if (assessTotal > 0)          usedTypes.add('assessment');
  if (breathTotal > 0)          usedTypes.add('breathing');
  if (mandalaTotal > 0)         usedTypes.add('mandala');
  if (orderTotal > 0)           usedTypes.add('order');
  if (homeworkTotal > 0)        usedTypes.add('homework');
  if (activityEventTotal > 0)   usedTypes.add('activity');

  return {
    ohcard_total:    ohcardTotal,
    ohcard_types:    ohcardTypes.length,
    assess_total:    assessTotal,
    assess_types:    new Set(assessTypes.map(r => r.scale?.category).filter(Boolean)).size,
    breath_total:    breathTotal,
    breath_program:  breathProgram,
    breath_modes:    breathModes.length,
    mandala_total:   mandalaTotal,
    order_total:     orderTotal,
    login_days:      loginDays.length,
    login_streak:    streak,
    profile_name:    profileUser?.name ? 1 : 0,
    profile_avatar:  profileUser?.avatar ? 1 : 0,
    profile_complete: (profileUser?.name && profileUser?.avatar) ? 1 : 0,
    combo_total:     comboTotal,
    used_types:      usedTypes,
    homework_total:  homeworkTotal,
    homework_types:  homeworkTypes,
    homework_mood:   moodTotal,
    homework_cbt:    cbtTotal,
    homework_dream:  dreamTotal,
    homework_iceberg: icebergTotal,
    homework_rule:   ruleTotal,
    activity_total:  activityEventTotal,
    ohcard_type_counts: Object.fromEntries(ohcardTypes.map(r => [r.type, r._count?.type ?? 0])),
    breath_prog_types: await prisma.breathingSession.groupBy({ by: ['mode'], where: { userId, isProgramMode: 1 } }),
  };
}

// ── 成就检查 ───────────────────────────────────────────────────────
async function checkAchievements(userId, event) {
  try {
    const stats   = await getStats(userId);
    const unlocked = await prisma.userAchievement.findMany({ where: { userId }, select: { achievementKey: true } });
    const unlockedSet = new Set(unlocked.map(u => u.achievementKey));
    const newOnes = [];

    for (const def of ACHIEVEMENTS) {
      if (unlockedSet.has(def.key)) continue;

      let value = 0;
      switch (def.condition) {
        case 'ohcard_total':    value = stats.ohcard_total;   break;
        case 'ohcard_types':    value = stats.ohcard_types;   break;
        case 'ohcard_type_count':
          value = stats.ohcard_type_counts[def.typeFilter] ?? 0; break;
        case 'assess_total':    value = stats.assess_total;   break;
        case 'assess_types':    value = stats.assess_types;   break;
        case 'breath_total':    value = stats.breath_total;   break;
        case 'breath_program':  value = stats.breath_program; break;
        case 'breath_prog_type':
          value = stats.breath_prog_types.find(r => r.mode === def.typeFilter) ? 1 : 0; break;
        case 'breath_modes':    value = stats.breath_modes;   break;
        case 'mandala_total':   value = stats.mandala_total;  break;
        case 'order_total':     value = stats.order_total;    break;
        case 'login_days':      value = stats.login_days;     break;
        case 'login_streak':    value = stats.login_streak;   break;
        case 'profile_name':    value = stats.profile_name;   break;
        case 'profile_avatar':  value = stats.profile_avatar; break;
        case 'profile_complete':value = stats.profile_complete; break;
        case 'combo_total':     value = stats.combo_total;    break;
        case 'combo_3types':    value = stats.used_types.size >= 3 ? 1 : 0; break;
        case 'combo_5types':    value = stats.used_types.size >= 5 ? 1 : 0; break;
        case 'homework_total':  value = stats.homework_total;  break;
        case 'homework_types':  value = stats.homework_types;  break;
        case 'homework_mood':   value = stats.homework_mood;   break;
        case 'homework_cbt':    value = stats.homework_cbt;    break;
        case 'homework_dream':  value = stats.homework_dream;  break;
        case 'homework_iceberg':value = stats.homework_iceberg; break;
        case 'homework_rule':   value = stats.homework_rule;   break;
        case 'activity_total':  value = stats.activity_total;  break;
      }

      if (value >= def.threshold) {
        await prisma.userAchievement.create({ data: { userId, achievementKey: def.key } });
        newOnes.push(def);
      }
    }

    return newOnes;
  } catch (e) {
    console.error('checkAchievements error:', e);
    return [];
  }
}

// ── 路由 ───────────────────────────────────────────────────────────

// GET /api/achievements/my — 返回全部成就列表（含解锁状态）
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId  = req.user.id;
    const unlocked = await prisma.userAchievement.findMany({ where: { userId } });
    const unlockedMap = Object.fromEntries(unlocked.map(u => [u.achievementKey, u.unlockedAt]));

    const list = ACHIEVEMENTS.map(def => ({
      ...def,
      unlocked:   !!unlockedMap[def.key],
      unlockedAt: unlockedMap[def.key] ?? null,
    }));

    const total    = list.length;
    const gotCount = list.filter(a => a.unlocked).length;

    res.json({ ok: true, total, gotCount, list });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/achievements/check — 手动触发检查（供各模块调用后前端也可主动触发）
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const newOnes = await checkAchievements(req.user.id, req.body.event);
    res.json({ ok: true, newAchievements: newOnes });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
module.exports.checkAchievements = checkAchievements;
