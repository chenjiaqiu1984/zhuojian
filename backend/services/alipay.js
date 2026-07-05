const { AlipaySdk, AlipayFormData } = require('alipay-sdk');

let _sdk = null;

function getSdk() {
  if (_sdk) return _sdk;
  const appPrivateKey = process.env.ALIPAY_APP_PRIVATE_KEY;
  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
  if (!appPrivateKey) throw new Error('缺少 ALIPAY_APP_PRIVATE_KEY 环境变量');
  if (!alipayPublicKey) throw new Error('缺少 ALIPAY_PUBLIC_KEY 环境变量');
  _sdk = new AlipaySdk({
    appId:          process.env.ALIPAY_APP_ID,
    privateKey:     appPrivateKey,
    alipayPublicKey,
    gateway:        process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
    signType:       'RSA2',
  });
  return _sdk;
}

/**
 * 手机网站支付（WAP）
 * 返回表单 HTML 字符串，前端 document.write 后自动跳转支付宝
 */
async function createAlipayOrder({ orderNo, amount, desc, returnUrl, notifyUrl }) {
  const sdk = getSdk();
  const formData = new AlipayFormData();
  formData.setMethod('get');
  formData.addField('bizContent', {
    out_trade_no:  orderNo,
    total_amount:  (amount / 100).toFixed(2), // 支付宝单位：元
    subject:       desc,
    product_code:  'QUICK_WAP_WAY',
  });
  formData.addField('returnUrl',  returnUrl  || process.env.ALIPAY_RETURN_URL || '');
  formData.addField('notifyUrl',  notifyUrl);

  const result = await sdk.exec('alipay.trade.wap.pay', {}, { formData });
  // result 是一个包含跳转参数的 URL（GET 方式）
  return { payUrl: result };
}

/**
 * 验证支付宝异步通知签名并返回通知内容
 */
function verifyAlipayNotify(postBody) {
  const sdk = getSdk();
  const ok = sdk.checkNotifySign(postBody);
  if (!ok) throw new Error('支付宝通知签名验证失败');
  return postBody;
}

module.exports = { createAlipayOrder, verifyAlipayNotify };
