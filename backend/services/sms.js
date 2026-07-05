const tencentcloud = require('tencentcloud-sdk-nodejs-sms');
const SmsClient = tencentcloud.sms.v20210111.Client;

async function sendSms(phone, code) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SMS DEV] ${phone} -> code: ${code}`);
    return;
  }

  const client = new SmsClient({
    credential: {
      secretId: process.env.TENCENT_SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY,
    },
    region: 'ap-guangzhou',
  });

  const res = await client.SendSms({
    SmsSdkAppId: process.env.TENCENT_SMS_APP_ID,
    SignName: process.env.TENCENT_SMS_SIGN,
    TemplateId: process.env.TENCENT_SMS_TEMPLATE_ID,
    TemplateParamSet: [code, '5'],   // 验证码 + 有效期(分钟)
    PhoneNumberSet: [`+86${phone}`],
  });

  // 腾讯云 SendSms 返回 SendStatusSet，Code 为 "Ok" 才算成功
  const status = res.SendStatusSet?.[0];
  if (!status || status.Code !== 'Ok') {
    const msg = status?.Message || '短信发送失败';
    console.error(`[SMS ERROR] ${phone}: ${status?.Code} - ${msg}`);
    throw new Error(msg);
  }
}

module.exports = { sendSms };
