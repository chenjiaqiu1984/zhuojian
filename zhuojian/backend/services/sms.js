// SMS provider integration — swap in real provider here
// Aliyun: npm install @alicloud/dysmsapi20170525
// Tencent: npm install tencentcloud-sdk-nodejs

async function sendSms(phone, code) {
  if (process.env.NODE_ENV !== 'production') {
    // Dev mode: log code instead of sending
    console.log(`[SMS DEV] ${phone} -> code: ${code}`);
    return;
  }
  // Production: uncomment and configure your provider
  // const Core = require('@alicloud/pop-core');
  // const client = new Core({ accessKeyId: process.env.ALI_KEY, accessKeySecret: process.env.ALI_SECRET, endpoint: 'https://dysmsapi.aliyuncs.com', apiVersion: '2017-05-25' });
  // await client.request('SendSms', { PhoneNumbers: phone, SignName: '卓见心理', TemplateCode: 'YOUR_TEMPLATE', TemplateParam: JSON.stringify({ code }) }, { method: 'POST' });
  throw new Error('请配置短信服务商');
}

module.exports = { sendSms };
