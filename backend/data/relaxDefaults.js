/**
 * 解压游戏 FeatureConfig 默认配置（纯数据，无 Prisma）
 */
const BREATHING_MODES = [
  {
    key: '4-7-8', name: '4-7-8 放松', icon: 'droplets', enabled: true,
    desc: '吸气4秒・屏息7秒・呼气8秒，深度放松神经', color: '#4A7A9E',
    steps: [
      { label: '吸气', duration: 4, phase: 'in' },
      { label: '屏息', duration: 7, phase: 'hold' },
      { label: '呼气', duration: 8, phase: 'out' },
    ],
  },
  {
    key: '4-4-4', name: '4-4-4 专注', icon: 'aperture', enabled: true,
    desc: '均匀三段，稳定注意力，适合工作前准备', color: '#3A7E8A',
    steps: [
      { label: '吸气', duration: 4, phase: 'in' },
      { label: '屏息', duration: 4, phase: 'hold' },
      { label: '呼气', duration: 4, phase: 'out' },
    ],
  },
  {
    key: '4-2-6', name: '4-2-6 助眠', icon: 'moon', enabled: true,
    desc: '延长呼气激活副交感神经，帮助入睡', color: '#6A5ACD',
    steps: [
      { label: '吸气', duration: 4, phase: 'in' },
      { label: '屏息', duration: 2, phase: 'hold' },
      { label: '呼气', duration: 6, phase: 'out' },
    ],
  },
  {
    key: '5-5', name: '5-5 心率同调', icon: 'activity', enabled: true,
    desc: '吸气5秒・呼气5秒，改善心率变异性', color: '#4AB8A0',
    steps: [
      { label: '吸气', duration: 5, phase: 'in' },
      { label: '呼气', duration: 5, phase: 'out' },
    ],
  },
];

const BREATHING_PROGRAMS = [
  {
    key: 'sleep', name: '入睡准备', icon: 'moon', emoji: '🌙', enabled: true,
    desc: '渐进放松神经系统，帮助身心平静进入睡眠', totalMin: 12, color: '#6A5ACD',
    stages: [
      { label: '热身', rounds: 10, mode: '4-4-4', hint: '让身体慢慢安静下来…' },
      { label: '深化', rounds: 10, mode: '4-2-6', hint: '延长呼气，激活副交感神经…' },
      { label: '沉降', rounds: 8, mode: '4-7-8', hint: '深度放松，让意识慢慢沉入…' },
    ],
  },
  {
    key: 'focus', name: '专注启动', icon: 'aperture', emoji: '🎯', enabled: true,
    desc: '唤醒注意力，进入清醒专注的工作状态', totalMin: 8, color: '#3A7E8A',
    stages: [
      { label: '激活', rounds: 10, mode: '4-4-4', hint: '均匀呼吸，稳定注意力…' },
      { label: '强化', rounds: 12, mode: '5-5', hint: '心率同调，进入心流…' },
      { label: '锁定', rounds: 10, mode: '4-4-4', hint: '保持清醒，专注当下…' },
    ],
  },
  {
    key: 'anxiety', name: '焦虑急救', icon: 'droplets', emoji: '🫧', enabled: true,
    desc: '快速平复紧张情绪，降低焦虑和压力反应', totalMin: 7, color: '#4AB8A0',
    stages: [
      { label: '稳定', rounds: 10, mode: '4-4-4', hint: '先稳住呼吸节奏…' },
      { label: '释放', rounds: 8, mode: '4-7-8', hint: '用呼气释放紧绷感…' },
      { label: '平复', rounds: 12, mode: '5-5', hint: '回归平静，感受当下…' },
    ],
  },
  {
    key: 'meditation', name: '冥想入定', icon: 'umbrella', emoji: '🧘', enabled: true,
    desc: '逐步引导进入深度冥想，扩展觉察与专注', totalMin: 16, color: '#B57BCA',
    stages: [
      { label: '收心', rounds: 10, mode: '4-4-4', hint: '将注意力收回到呼吸…' },
      { label: '沉淀', rounds: 12, mode: '5-5', hint: '随着呼吸，思绪慢慢沉淀…' },
      { label: '扩展', rounds: 8, mode: '4-7-8', hint: '在静默中扩展觉察…' },
      { label: '安住', rounds: 12, mode: '5-5', hint: '安住于此刻，不迎不拒…' },
    ],
  },
  {
    key: 'morning', name: '晨间唤醒', icon: 'zap', emoji: '🌅', enabled: true,
    desc: '温和激活身体与大脑，迎接充满活力的一天', totalMin: 7, color: '#F5A623',
    stages: [
      { label: '苏醒', rounds: 10, mode: '4-4-4', hint: '轻柔地唤醒身体…' },
      { label: '注入', rounds: 12, mode: '5-5', hint: '深呼吸，为身体注入氧气…' },
      { label: '振奋', rounds: 10, mode: '4-4-4', hint: '感受清醒与能量…' },
    ],
  },
  {
    key: 'exam', name: '考前冷静训练', icon: 'aperture', emoji: '📝', enabled: true,
    desc: '稳定心率、集中注意，降低应激反应，从容应考', totalMin: 8, color: '#3A8AC9',
    stages: [
      { label: '稳定', rounds: 10, mode: '4-4-4', hint: '先让呼吸稳下来，放下紧张…' },
      { label: '释压', rounds: 8, mode: '4-7-8', hint: '用长呼气带走压力…' },
      { label: '聚焦', rounds: 12, mode: '5-5', hint: '心率同调，专注在当下这道题…' },
    ],
  },
  {
    key: 'stage', name: '演讲/上台前', icon: 'activity', emoji: '🎤', enabled: true,
    desc: '快速沉稳，缓解怯场，让声音和身体都稳下来', totalMin: 6, color: '#4A7A9E',
    stages: [
      { label: '沉稳', rounds: 8, mode: '4-4-4', hint: '站定，把呼吸放慢放稳…' },
      { label: '松肩', rounds: 8, mode: '4-7-8', hint: '呼气时松开肩膀和下巴…' },
      { label: '登场', rounds: 8, mode: '5-5', hint: '感受稳定的节奏，准备好了…' },
    ],
  },
  {
    key: 'anger', name: '愤怒平复', icon: 'droplets', emoji: '🌋', enabled: true,
    desc: '延长呼气降低生理唤醒，让怒火慢慢降温', totalMin: 7, color: '#E8705A',
    stages: [
      { label: '降温', rounds: 10, mode: '4-7-8', hint: '用长长的呼气给情绪降温…' },
      { label: '松开', rounds: 8, mode: '4-2-6', hint: '松开紧握的拳头，继续呼气…' },
      { label: '回稳', rounds: 12, mode: '5-5', hint: '回到平稳，重新掌控自己…' },
    ],
  },
  {
    key: 'deepsleep', name: '睡前深度放松', icon: 'moon', emoji: '🛌', enabled: true,
    desc: '更长的呼气节奏，深度放松身心，滑入沉睡', totalMin: 14, color: '#5A6FCD',
    stages: [
      { label: '卸力', rounds: 10, mode: '4-2-6', hint: '躺好，把身体的重量交给床…' },
      { label: '沉降', rounds: 12, mode: '4-7-8', hint: '每一次呼气都更沉一点…' },
      { label: '入眠', rounds: 12, mode: '4-7-8', hint: '不用努力，让意识慢慢飘远…' },
    ],
  },
];

const SQUEEZE_COUNTS = [
  { key: 60, label: '60 个', desc: '大颗粒，戳起来更过瘾', enabled: true },
  { key: 80, label: '80 个', desc: '大小适中，经典解压手感', enabled: true },
  { key: 100, label: '100 个', desc: '小而密，连戳超爽', enabled: true },
];

const MONSTER_STAGES = {
  targetDays: 30,
  stages: [
    { maxDays: 0, label: '诞生', key: 'born' },
    { maxDays: 2, label: '灰色幼苗', key: 'seedling' },
    { maxDays: 6, label: '初显色彩', key: 'color' },
    { maxDays: 13, label: '活力成长', key: 'growing' },
    { maxDays: null, label: '饱满鲜艳', key: 'full' },
  ],
};

const DEFAULTS = {
  breathing_modes: BREATHING_MODES,
  breathing_programs: BREATHING_PROGRAMS,
  squeeze_counts: SQUEEZE_COUNTS,
  monster_stages: MONSTER_STAGES,
};

module.exports = { DEFAULTS, BREATHING_MODES, BREATHING_PROGRAMS, SQUEEZE_COUNTS, MONSTER_STAGES };
