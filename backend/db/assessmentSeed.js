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

function bdiOpts(...labels) {
  return JSON.stringify(labels.map((label, i) => ({ value: i, label })));
}

const BDI_SCORING = JSON.stringify({
  method: 'sum',
  levels: [
    { min: 0, max: 4, level: '无抑郁倾向', detail: '恭喜您，您的状态很好，天是晴的，花是香的，带着愉快的心情迎接美好的一天吧' },
    { min: 5, max: 13, level: '轻度抑郁', detail: '最近一阵子您可能有持续性的情绪低落、忧郁、心境恶劣、焦虑和思维困难等表现，愁眉苦脸、双目凝视、面无表情或者是暗自流泪是您的常态。请放松心情，和家人朋友多聊天，放缓工作、学习的步伐，保证稳定的睡眠和足够的营养摄入。如果这种状态已经持续了一段时间且自助的方式难以缓解您的症状，建议您可以向专业的心理咨询寻求帮助。' },
    { min: 14, max: 20, level: '中度抑郁', detail: '最近一阵子您可能有明显的情绪低落、心境恶劣、缺乏兴趣和精力减退，且持久和不易变动。建议您注意休息、多运动、与家人朋友倾诉、注意饮食和生活规律。如果这种状态已经持续了一段时间且自助的方式难以缓解您的症状，建议您可以向专业的心理咨询寻求帮助。' },
    { min: 21, max: 63, level: '重度抑郁', detail: '您的抑郁程度已经达到了较高水平，抑郁可能已经对您的生活工作以及社交活动产生比较大的困扰，请不要因为太忙或时间太少而忽略身体传递给自己的真实信息。建议您向专业的心理咨询师、精神科医生寻求帮助。' }
  ]
});

const BDI_QUESTIONS = [
  { content: '悲伤感', options: bdiOpts('我没有感到悲伤', '我有时感到悲伤', '我总是感到悲伤，而且不能摆脱它', '我感到极度悲伤或不愉快，不堪忍受') },
  { content: '对未来的悲观感', options: bdiOpts('我对未来有足够的信心', '我对未来信心不足', '我感到对未来没有什么可期望', '我感到未来毫无希望，情况也不会改善') },
  { content: '失败感', options: bdiOpts('我没有失败的感觉', '我感到我比一般人失败的多些', '当我回顾过去时，我看到的都是失败', '我感到自己总是失败，毫无出息') },
  { content: '不满足感', options: bdiOpts('我对做过的事，没有什么不满意的', '我对做过的事，不太满意', '我对任何事情都感到不满意', '我对一切都感到厌倦') },
  { content: '罪恶感', options: bdiOpts('我不感到有什么罪恶感', '有时，我感到自己有罪', '大部分时间内，我感到自己有罪', '我总是感到自己有罪') },
  { content: '惩罚感', options: bdiOpts('我不认为我会受罚', '我感到我可能受罚', '我预感到我会受罚', '我感到我正受到惩罚') },
  { content: '自我失望感', options: bdiOpts('我从没有大失所望的感觉', '我有时有对自己感到失望', '我对自己感到厌恶', '我十分怨恨自己') },
  { content: '自我责备感', options: bdiOpts('我从不认为我比别人差', '对自己的缺点和错误总是感到不满', '对自己的失败总是在责备自己', '对所有的过错总是在谴责自己') },
  { content: '自杀意念', options: bdiOpts('我从没有想过要自杀', '我想过自杀，但没有干过', '我想要去自杀', '如果有机会，我会自杀的') },
  { content: '哭泣', options: bdiOpts('我不象一般人那样爱哭', '我比过去爱哭了', '我近来爱哭了', '我过去总爱哭，但现在想哭也哭不出来了') },
  { content: '易激惹', options: bdiOpts('和过去相比，我现在生气并不更多', '我现在比过去更容易生气发火', '我觉得现在所有的时间都容易生气', '过去使我生气的事，现在一点也不能使我生气了') },
  { content: '对他人兴趣减退', options: bdiOpts('我对别人没有失去兴趣', '与过去相比，我对别人的兴趣减退了', '我对别人已没有多大兴趣了', '我对别人已经毫无兴趣') },
  { content: '犹豫不决', options: bdiOpts('我仍象往常一样自己可以决定事情', '与过去相比，我常推迟作出决定', '与过去相比，我常难以作出决定', '我不能做成任何决定') },
  { content: '自我形象', options: bdiOpts('我感到自己各方面跟过去一样', '我担心自己在变老或失去魅力', '我感到青春已逝而失去魅力', '我确信自己很丑') },
  { content: '工作困难', options: bdiOpts('我能和往常一样地工作', '开始去做某些事时要付出很大的努力', '我不得不强迫自己去做事情', '我什么事也干不成') },
  { content: '睡眠障碍', options: bdiOpts('我象往常一样睡的香', '我不如以前睡得香', '我比过去早1~2小时醒来，而且再难入睡', '我比过去早几小时醒来，而再也不能入睡') },
  { content: '疲倦感', options: bdiOpts('我并不感到比往常更容易疲倦', '我比过去容易疲倦', '我做什么事情都容易疲倦', '我疲乏得不愿意做什么事了') },
  { content: '食欲减退', options: bdiOpts('我的食欲和以前一样好', '我的食欲不如以前好', '我的食欲很差', '我没有一点食欲') },
  { content: '体重减轻', options: bdiOpts('近来我的体重没有减轻多少', '我的体重减轻了2公斤多', '我的体重减轻了5公斤多', '我的体重减轻了7公斤多') },
  { content: '健康忧虑', options: bdiOpts('我对自己的健康并不比往常更担心', '我担心自己的健康，如胃不舒服、便秘', '我很担心自己的健康，很难去顾及其他', '我非常担心自己的健康，根本不能想别的事情') },
  { content: '性欲减退', options: bdiOpts('最近我的性兴趣跟过去一样没有变化', '我不象往常那样对性感兴趣', '我现在对性没有多大兴趣', '我对性完全失去了兴趣') },
].map((q, i) => ({ ...q, orderNum: i + 1 }));

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
      '做事时提不起劲或没有兴趣', '感到心情低落、沮丧或绝望', '入睡困难、睡不安稳或睡眠过多',
      '感觉疲倦或没有活力', '食欲不振或吃太多',
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
      '感觉紧张、焦虑或烦躁', '不能停止担忧或控制担忧', '对各种各样的事情担忧过多',
      '很难放松下来', '由于不安而无法静坐', '变得容易烦恼或急躁',
      '感到似乎将有可怕的事情发生而害怕'
    ].map((content, i) => ({ orderNum: i + 1, content, options: GAD7_OPTIONS }))
  },
  {
    code: 'SDS', name: 'SDS 抑郁自评量表', category: 'diagnostic',
    description: 'Zung抑郁自评量表，通过20个项目评估抑郁症状的频率，是经典的自评心理测量工具。',
    isPaid: false, price: 0, totalQuestions: 20, estimatedMinutes: 8,
    scoringRule: JSON.stringify({
      method: 'weighted_sum', multiplier: 1.25,
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
      method: 'weighted_sum', multiplier: 1.25,
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
  },
  {
    code: 'BDI', name: 'BDI 贝克抑郁自评量表', category: 'diagnostic',
    description: '贝克抑郁自评量表（Beck Depression Inventory），共21题，每题4个选项，评测过去一周内的抑郁程度。该量表只能表明近期抑郁的程度，程度高并不代表一定是抑郁症，而只能说明需要注意自己的情绪。',
    isPaid: false, price: 0, totalQuestions: 21, estimatedMinutes: 10,
    scoringRule: BDI_SCORING,
    questions: BDI_QUESTIONS
  }
];

async function seedAssessments() {
  const allScales = [...scales, ...require('./scales_extra')];
  for (const s of allScales) {
    const { questions, ...scaleData } = s;
    const existing = await prisma.assessmentScale.findUnique({ where: { code: scaleData.code } });
    if (existing) continue;
    const scale = await prisma.assessmentScale.create({ data: scaleData });
    await prisma.assessmentQuestion.createMany({
      data: questions.map(q => ({ ...q, scaleId: scale.id }))
    });
  }
  console.log('Assessment scales seeded');
}

module.exports = seedAssessments;
