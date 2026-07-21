const tencentcloud = require('tencentcloud-sdk-nodejs-sms');
const SmsClient = tencentcloud.sms.v20210111.Client;

// 各场景模板及参数
const TEMPLATES = {
  login:        { id: () => process.env.TENCENT_SMS_TEMPLATE_LOGIN,        params: (code) => [code, '5'] },
  register:     { id: () => process.env.TENCENT_SMS_TEMPLATE_REGISTER,     params: (code) => [code, '5'] },
  reset:        { id: () => process.env.TENCENT_SMS_TEMPLATE_RESET,        params: (code) => [code] },
  changePhone:  { id: () => process.env.TENCENT_SMS_TEMPLATE_CHANGE_PHONE, params: (code) => [code] },
};

// type: 'login' | 'register' | 'reset' | 'changePhone'
async function sendSms(phone, code, type = 'login') {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SMS DEV] ${phone} (${type}) -> code: ${code}`);
    return;
  }

  const tpl = TEMPLATES[type] || TEMPLATES.login;
  const client = new SmsClient({
    credential: {
      secretId:  process.env.TENCENT_SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY,
    },
    region: 'ap-guangzhou',
  });

  const res = await client.SendSms({
    SmsSdkAppId:      process.env.TENCENT_SMS_APP_ID,
    SignName:         process.env.TENCENT_SMS_SIGN,
    TemplateId:       tpl.id(),
    TemplateParamSet: tpl.params(code),
    PhoneNumberSet:   [`+86${phone}`],
  });

  const status = res.SendStatusSet?.[0];
  if (!status || status.Code !== 'Ok') {
    const msg = status?.Message || '短信发送失败';
    console.error(`[SMS ERROR] ${phone}: ${status?.Code} - ${msg}`);
    throw new Error(msg);
  }
}

module.exports = { sendSms };
