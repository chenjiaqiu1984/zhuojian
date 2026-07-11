const svgCaptcha = require('svg-captcha');
const { randomUUID } = require('crypto');

// token -> { text, expiresAt }
const store = new Map();

function create() {
  const captcha = svgCaptcha.create({
    size: 4,
    noise: 2,
    color: true,
    background: '#f0f4f3',
    ignoreChars: '0o1il',
  });
  const token = randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  store.set(token, { text: captcha.text.toLowerCase(), expiresAt });
  setTimeout(() => store.delete(token), 5 * 60 * 1000);
  return { token, svg: captcha.data };
}

function verify(token, answer) {
  const entry = store.get(token);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { store.delete(token); return false; }
  store.delete(token); // 一次性使用
  return (answer || '').toLowerCase() === entry.text;
}

module.exports = { create, verify };
