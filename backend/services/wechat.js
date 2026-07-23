/**
 * 微信公众平台 Access Token 及手机号 / 内容安全工具
 * Access Token 会在内存中缓存，提前 60s 刷新避免过期
 */

let _token = '';
let _expiresAt = 0;

async function getAccessToken() {
  if (_token && Date.now() < _expiresAt - 60_000) return _token;

  const appid  = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;
  if (!appid || !secret) throw new Error('WX_APPID / WX_SECRET 未配置');

  const r = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
  );
  const data = await r.json();
  if (data.errcode) throw new Error(`getAccessToken 失败: ${data.errmsg} (${data.errcode})`);

  _token     = data.access_token;
  _expiresAt = Date.now() + data.expires_in * 1000;
  return _token;
}

function invalidateAccessToken() {
  _token = '';
  _expiresAt = 0;
}

/**
 * 用 getPhoneNumber 返回的 code 换取手机号（明文）
 * @param {string} code  前端 button getphonenumber 事件里的 detail.code
 * @returns {Promise<string>} 11位手机号
 */
async function getPhoneByCode(code) {
  const token = await getAccessToken();
  const r = await fetch(
    `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${token}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code }),
    }
  );
  const data = await r.json();
  if (data.errcode !== 0) throw new Error(data.errmsg || '获取手机号失败');
  return data.phone_info.purePhoneNumber;
}

/**
 * 文本内容安全识别（msgSecCheck 2.0）
 * @param {{ content: string, openid: string, scene?: number, nickname?: string }} opts
 * @returns {Promise<{ pass: boolean, message?: string, raw?: object }>}
 */
async function msgSecCheck(opts, { retried = false } = {}) {
  const { content, openid, scene = 2, nickname } = opts;
  const token = await getAccessToken();
  const body = {
    version: 2,
    openid,
    scene,
    content: String(content || '').slice(0, 2500),
  };
  if (nickname) body.nickname = String(nickname).slice(0, 30);

  const r = await fetch(
    `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    }
  );
  const data = await r.json();

  if (data.errcode === 40001 && !retried) {
    invalidateAccessToken();
    return msgSecCheck(opts, { retried: true });
  }

  if (data.errcode && data.errcode !== 0) {
    console.error('[msgSecCheck] api error', data.errcode, data.errmsg);
    if (data.errcode === 61010) {
      return { pass: false, message: '登录状态已过期，请重新进入小程序后再试', raw: data };
    }
    if (data.errcode === 40003) {
      return { pass: false, message: '账号异常，请重新微信登录后再试', raw: data };
    }
    return { pass: false, message: '内容审核暂时不可用，请稍后再试', raw: data };
  }

  const result = data.result || {};
  const suggest = result.suggest;
  const label = result.label;

  if (suggest === 'pass' || label === 100) {
    return { pass: true, raw: data };
  }
  if (suggest === 'review') {
    return { pass: false, message: '内容需人工复核，请修改后重试', raw: data };
  }
  return { pass: false, message: '内容含有违规信息，请修改后重试', raw: data };
}

module.exports = { getAccessToken, getPhoneByCode, msgSecCheck };
