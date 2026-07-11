const { AlipaySdk } = require('alipay-sdk');

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
 */
async function createAlipayOrder({ orderNo, amount, desc, returnUrl, notifyUrl }) {
  const sdk = getSdk();
  const payUrl = await sdk.pageExec('alipay.trade.wap.pay', {
    bizContent: {
      out_trade_no: orderNo,
      total_amount: (amount / 100).toFixed(2),
      subject:      desc,
      product_code: 'QUICK_WAP_WAY',
    },
    returnUrl: returnUrl || process.env.ALIPAY_RETURN_URL || '',
    notifyUrl,
  });
  return { payUrl };
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

async function alipayRefund({ tradeNo, refundAmount, outRequestNo, reason }) {
  const sdk = getSdk();
  const result = await sdk.exec('alipay.trade.refund', {
    bizContent: {
      trade_no:       tradeNo,
      refund_amount:  (refundAmount / 100).toFixed(2),
      refund_reason:  reason || '用户取消预约',
      out_request_no: outRequestNo,
    }
  });
  if (result.code !== '10000') throw new Error(result.subMsg || result.msg || '支付宝退款失败');
  return result;
}

async function queryAlipayOrder(outTradeNo, tradeNo) {
  const sdk = getSdk();
  const bizContent = tradeNo
    ? { trade_no: tradeNo }
    : { out_trade_no: outTradeNo };
  const result = await sdk.exec('alipay.trade.query', { bizContent });
  return result;
}

async function createAlipayPcOrder({ orderNo, amount, desc, returnUrl, notifyUrl }) {
  const sdk = getSdk();
  const payUrl = await sdk.pageExec('alipay.trade.page.pay', {
    bizContent: {
      out_trade_no:  orderNo,
      total_amount:  (amount / 100).toFixed(2),
      subject:       desc,
      product_code:  'FAST_INSTANT_TRADE_PAY',
    },
    returnUrl: returnUrl || '',
    notifyUrl,
  });
  return { payUrl };
}

module.exports = { createAlipayOrder, createAlipayPcOrder, verifyAlipayNotify, alipayRefund, queryAlipayOrder };
