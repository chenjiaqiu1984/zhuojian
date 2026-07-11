const WxPay = require('wechatpay-node-v3');
const path = require('path');
const fs = require('fs');

const certsDir = path.join(__dirname, '../cert414');

function loadFile(filename) {
  const p = path.join(certsDir, filename);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

let _pay = null;
function getPay() {
  if (_pay) return _pay;
  const privateKey = loadFile('apiclient_key.pem');
  const publicKey  = loadFile('apiclient_cert.pem');
  if (!privateKey) throw new Error('缺少商户私钥文件 certs/apiclient_key.pem');
  if (!publicKey)  throw new Error('缺少微信平台证书文件 certs/apiclient_cert.pem');
  _pay = new WxPay({
    appid:      process.env.WX_APPID,
    mchid:      process.env.WECHAT_PAY_MCH_ID,
    publicKey,
    privateKey,
  });
  return _pay;
}

/** 小程序 JSAPI 支付 */
async function createJsapiOrder({ orderNo, amount, desc, openid, notifyUrl }) {
  const pay = getPay();
  const result = await pay.transactions_jsapi({
    description: desc,
    out_trade_no: orderNo,
    notify_url: notifyUrl,
    amount: { total: amount, currency: 'CNY' },
    payer: { openid },
  });
  const prepayId = result.data?.prepay_id;
  if (!prepayId) throw new Error(`微信下单失败: ${JSON.stringify(result.data)}`);
  const payParams = pay.buildMiniProgramPayment(process.env.WX_APPID, prepayId);
  return { prepayId, payParams };
}

/**
 * H5 支付（手机浏览器 / 微信内H5）
 * 返回 mweb_url，前端直接跳转即可
 */
async function createH5Order({ orderNo, amount, desc, clientIp, notifyUrl }) {
  const pay = getPay();
  const result = await pay.transactions_h5({
    description: desc,
    out_trade_no: orderNo,
    notify_url: notifyUrl,
    amount: { total: amount, currency: 'CNY' },
    scene_info: {
      payer_client_ip: clientIp || '127.0.0.1',
      h5_info: { type: 'Wap' },
    },
  });
  console.log('[wechatpay] h5 raw result:', JSON.stringify(result));
  const mwebUrl = result.data?.h5_url;
  if (!mwebUrl) throw new Error(`H5下单失败: ${JSON.stringify(result.data)}`);
  return { mwebUrl };
}

/** 验证微信回调签名并解密 */
async function parseNotify(headers, body) {
  const pay = getPay();
  return pay.decipher_gcm(
    body.resource.ciphertext,
    body.resource.associated_data,
    body.resource.nonce,
    process.env.WECHAT_PAY_API_V3_KEY
  );
}

/** 申请退款 */
async function refund({ transactionId, refundNo, refundAmount, totalAmount, reason }) {
  const pay = getPay();
  const result = await pay.refunds({
    transaction_id: transactionId,
    out_refund_no: refundNo,
    reason,
    amount: { refund: refundAmount, total: totalAmount, currency: 'CNY' },
  });
  return result.data;
}

async function queryWechatOrder(outTradeNo) {
  const pay = getPay();
  const result = await pay.query({ out_trade_no: outTradeNo });
  return result.data;
}

/** Native 扫码支付（电脑浏览器），返回 code_url */
async function createNativeOrder({ orderNo, amount, desc, notifyUrl }) {
  const pay = getPay();
  let result;
  try {
    result = await pay.transactions_native({
      description: desc,
      out_trade_no: orderNo,
      notify_url: notifyUrl,
      amount: { total: amount, currency: 'CNY' },
    });
  } catch (err) {
    // axios 抛出 HTTP 错误时，错误详情在 err.response.data
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error('[wechatpay] native error:', detail);
    throw new Error(`Native下单失败: ${detail}`);
  }
  console.log('[wechatpay] native result:', JSON.stringify(result));
  // 兼容库直接返回 body 或包在 .data 中两种格式
  const codeUrl = result?.data?.code_url ?? result?.code_url;
  if (!codeUrl) throw new Error(`Native下单失败: ${JSON.stringify(result?.data ?? result)}`);
  return { codeUrl };
}

module.exports = { createJsapiOrder, createH5Order, createNativeOrder, parseNotify, refund, queryWechatOrder };
