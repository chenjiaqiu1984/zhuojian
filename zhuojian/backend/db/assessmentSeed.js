const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PHQ9_OPTIONS = JSON.stringify([
  { value: 0, label: '完全不会' }, { value: 1, label: '好几天' },
  { value: 2, label: '超过一周' }, { value: 3, label: '几乎每天' }
]);

const GAD7_OPTIONS = PHQ9_OPTIONS;

const FREQ4_OPTIONS = JSON.stringify([
  { value: 1, label: '很少' }, { value: 2, label: '有时' },
  { value: 3, label: '经常' }, { value: 4, label: '总是' }
]);

const ZERO4_OPTIONS = JSON.stringify([
  { value: 0, label: '没有' }, { value: 1, label: '轻度' },
  { value: 2, label: '中度' }, { value: 3, label: '较重' },
  { value: 4, label: '严重' }
]);

const AGREE5_OPTIONS = JSON.stringify([
  { value: 1, label: '非常不同意' }, { value: 2, label: '不同意' },
  { value: 3, label: '中立' }, { value: 4, label: '同意' },
  { value: 5, label: '非常同意' }
]);

const scales = [
  {
    code: 'PHQ9', name: 'PHQ-9 抑郁症筛查量表', category: 'diagnostic',
    description: '患者健康问卷抑郁量表，用于筛查和评估抑郁症状严重程度，是临床中最常用的抑郁筛查工具之一。',
    isPaid: false, price: 0, totalQuestions: 9, estimatedMinutes: 5,
    scoringRule: JSON.stringify({
      method: 'sum',
      levels: [
        { min: 0, max: 4, level: '无抑郁', detail: '您目前无明显抑郁症状，请继续保持良好的心理状态。' },
        { min: 5, max: 9, level: '轻度抑郁', detail: '存在轻度抑郁症状，建议关注自身情绪变化，适当进行运动和社交活动。' },
        { min: 10, max: 14, level: '中度抑郁', detail: '存在中度抑郁症状，建议寻求专业心理咨询，进行进一步评估和干预。' },
        { min: 15, max: 19, level: '中重度抑郁', detail: '存在中重度抑郁症状，建议尽快就医，寻求专业帮助。' },
        { min: 20, max: 27, level: '重度抑郁', detail: '存在重度抑郁症状，请立即寻求专业帮助，必要时考虑药物治疗。' }
      ]
    }),
    questions: [
      '做事时提不起劲或没有兴趣',
      '感到心情低落、沮丧或绝望',
      '入睡困难、睡不安稳或睡眠过多',
      '感觉疲倦或没有活力',
      '食欲不振或吃太多',
      '觉得自己很糟或觉得自己很失败，或让自己或家人失望',
      '对事物专注有困难，例如看报纸或看电视时注意力不集中',
      '动作或说话速度缓慢到他人已察觉，或烦躁不安、动来动去比平时更多',
      '有不如死掉或用某种方式伤害自己的念头'
    ].map((content, i) => ({ orderNum: i + 1, content, options: PHQ9_OPTIONS }))
  },
  {
    code: 'GAD7', name: 'GAD-7 广泛性焦虑量表', category: 'diagnostic',
    description: '广泛性焦虑障碍量表，用于筛查焦虑症状，在基层医疗和心理健康服务中广泛应用。',
    isPaid: false, price: 0, totalQuestions: 7, estimatedMinutes: 3,
    scoringRule: JSON.stringify({
      method: 'sum',
      levels: [
        { min: 0, max: 4, level: '无焦虑', detail: '您目前无明显焦虑症状，心理状态良好。' },
        { min: 5, max: 9, level: '轻度焦虑', detail: '存在轻度焦虑症状，建议学习放松技巧，如深呼吸、冥想等。' },
        { min: 10, max: 14, level: '中度焦虑', detail: '存在中度焦虑症状，建议寻求专业心理咨询。' },
        { min: 15, max: 21, level: '重度焦虑', detail: '存在重度焦虑症状，建议尽快就医，进行专业评估和治疗。' }
      ]
    }),
    questions: [
      '感觉紧张、焦虑或烦躁',
      '不能停止担忧或控制担忧',
      '对各种各样的事情担忧过多',
      '很难放松下来',
      '由于不安而无法静坐',
      '变得容易烦恼或急躁',
      '感到似乎将有可怕的事情发生而害怕'
    ].map((content, i) => ({ orderNum: i + 1, content, options: GAD7_OPTIONS }))
  },
  {
    code: 'SDS', name: 'SDS 抑郁自评量表', category: 'diagnostic',
    description: 'Zung抑郁自评量表，通过20个项目评估抑郁症状的频率，是经典的自评心理测量工具。',
    isPaid: false, price: 0, totalQuestions: 20, estimatedMinutes: 8,
    scoringRule: JSON.stringify({
      method: 'weighted_sum',
      multiplier: 1.25,
      reverseItems: [2, 5, 6, 11, 12, 14, 16, 17, 18, 20],
      levels: [
        { min: 0, max: 49, level: '无抑郁', detail: '您目前无明显抑郁症状，心理状态良好。' },
        { min: 50, max: 59, level: '轻度抑郁', detail: '存在轻度抑郁，建议关注情绪状态，适当调节生活方式。' },
        { min: 60, max: 69, level: '中度抑郁', detail: '存在中度抑郁，建议寻求专业心理咨询和评估。' },
        { min: 70, max: 100, level: '重度抑郁', detail: '存在重度抑郁，请尽快寻求专业医疗帮助。' }
      ]
    }),
    questions: [
      '我感到情绪沮丧、郁闷', '我感到早晨心情最好', '我要哭泣或觉得想哭',
      '我夜间睡眠不好', '我吃饭像平时一样多', '我的性功能正常',
      '我感到体重减轻', '我为便秘烦恼', '我的心跳比平时快',
      '我无故感到疲乏', '我的头脑和平时一样清楚', '我做事情像平时一样不感到困难',
      '我坐立不安，难以保持平静', '我对将来抱有希望', '我比平时更容易激怒',
      '我觉得决定什么事很容易', '我感到自己是有用的和不可缺少的人',
      '我的生活很有意义', '如果我死了，别人会过得更好', '我仍旧喜爱平时喜爱的东西'
    ].map((content, i) => ({ orderNum: i + 1, content, options: FREQ4_OPTIONS }))
  },
  {
    code: 'SAS', name: 'SAS 焦虑自评量表', category: 'diagnostic',
    description: 'Zung焦虑自评量表，通过20个项目评估焦虑症状，适用于心理咨询和临床研究。',
    isPaid: false, price: 0, totalQuestions: 20, estimatedMinutes: 8,
    scoringRule: JSON.stringify({
      method: 'weighted_sum',
      multiplier: 1.25,
      reverseItems: [5, 9, 13, 17, 19],
      levels: [
        { min: 0, max: 49, level: '无焦虑', detail: '您目前无明显焦虑症状。' },
        { min: 50, max: 59, level: '轻度焦虑', detail: '存在轻度焦虑，建议学习放松方法。' },
        { min: 60, max: 69, level: '中度焦虑', detail: '存在中度焦虑，建议寻求专业帮助。' },
        { min: 70, max: 100, level: '重度焦虑', detail: '存在重度焦虑，请尽快寻求专业医疗帮助。' }
      ]
    }),
    questions: [
      '我感到比往常更加神经过敏和焦虑', '我无缘无故地感到担心',
      '我容易心烦意乱或感到恐慌', '我感到我的身体好像被分成几块，支离破碎',
      '我感到事事都很顺利，不会有倒霉的事情发生', '我的四肢抖动和颤抖',
      '我因头痛、颈痛和背痛而烦恼', '我感到无力且容易疲劳',
      '我感到很平静，能安静坐下来', '我感到我的心跳较快',
      '我因阵阵的眩晕而不舒服', '我有昏倒发作，或觉得要昏倒似的',
      '我呼气、吸气都感到很容易', '我的手脚感到麻木和刺痛',
      '我因胃痛和消化不良而苦恼', '我必须时常排尿',
      '我的手总是温暖而干燥', '我觉得脸发烧发红',
      '我容易入睡，晚上休息很好', '我做噩梦'
    ].map((content, i) => ({ orderNum: i + 1, content, options: FREQ4_OPTIONS }))
  },
  {
    code: 'ISI', name: 'ISI 失眠严重程度指数', category: 'diagnostic',
    description: '失眠严重程度指数量表，用于评估失眠症状的性质、严重程度及对日常功能的影响。',
    isPaid: false, price: 0, totalQuestions: 7, estimatedMinutes: 3,
    scoringRule: JSON.stringify({
      method: 'sum',
      levels: [
        { min: 0, max: 7, level: '无失眠', detail: '您的睡眠状况良好，无明显失眠问题。' },
        { min: 8, max: 14, level: '亚临床失眠', detail: '存在轻度睡眠问题，建议注意睡眠卫生，保持规律作息。' },
        { min: 15, max: 21, level: '中度失眠', detail: '存在中度失眠，对日常功能有一定影响，建议寻求专业帮助。' },
        { min: 22, max: 28, level: '重度失眠', detail: '存在重度失眠，严重影响日常功能，请尽快就医。' }
      ]
    }),
    questions: [
      { content: '入睡困难（躺下后难以入睡）', options: ZERO4_OPTIONS },
      { content: '维持睡眠困难（夜间容易醒来）', options: ZERO4_OPTIONS },
      { content: '早醒问题（比预期时间早醒）', options: ZERO4_OPTIONS },
      { content: '您对当前睡眠模式的满意程度（选择不满意程度）', options: JSON.stringify([
        { value: 0, label: '很满意' }, { value: 1, label: '满意' },
        { value: 2, label: '一般' }, { value: 3, label: '不满意' }, { value: 4, label: '很不满意' }
      ])},
      { content: '您觉得睡眠问题对日间功能（如疲乏、注意力、工作效率等）的影响程度', options: ZERO4_OPTIONS },
      { content: '与他人相比，您认为您的睡眠问题对生活质量的损害程度如何', options: ZERO4_OPTIONS },
      { content: '您对目前睡眠问题的担忧/痛苦程度', options: ZERO4_OPTIONS }
    ].map((q, i) => ({ orderNum: i + 1, content: q.content, options: q.options }))
  }
];

async function seedAssessments() {
  const existing = await prisma.assessmentScale.count();
  if (existing > 0) return console.log('Assessment scales already seeded');

  const allScales = [...scales, ...require('./scales_extra')];
  for (const s of allScales) {
    const { questions, ...scaleData } = s;
    const scale = await prisma.assessmentScale.create({ data: scaleData });
    await prisma.assessmentQuestion.createMany({
      data: questions.map(q => ({ ...q, scaleId: scale.id }))
    });
  }
  console.log('Assessment scales seeded (diagnostic)');
}

module.exports = seedAssessments;
