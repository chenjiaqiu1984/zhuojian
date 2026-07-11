const { verify } = require('../services/captcha');

module.exports = function captchaCheck(req, res, next) {
  const { captchaToken, captchaAnswer } = req.body;
  if (!captchaToken || !captchaAnswer)
    return res.status(400).json({ error: '请完成图形验证码' });
  if (!verify(captchaToken, captchaAnswer))
    return res.status(400).json({ error: '图形验证码错误，请重新获取' });
  next();
};
