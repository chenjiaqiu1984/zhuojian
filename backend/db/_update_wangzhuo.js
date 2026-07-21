const p = require('./database');
p.consultant.update({
  where: { id: 1 },
  data: {
    consultHours: 8000,
    supervisionHours: 500,
    certifications: '国际NGH注册催眠师,国际NLP注册执行师,高级感统师,家庭教育指导师'
  }
}).then(r => console.log('ok', r.name, r.consultHours)).finally(() => p.$disconnect());
