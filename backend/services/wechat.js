/**
 * 微信公众平台 Access Token 及手机号工具
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

module.exports = { getAccessToken, getPhoneByCode };
