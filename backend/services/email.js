const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendEmail(to, code) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[EMAIL DEV] ${to} -> code: ${code}`);
    return;
  }
  await transporter.sendMail({
    from: `卓见心理 <${process.env.SMTP_USER}>`,
    to,
    subject: '卓见心理 - 登录验证码',
    html: `<div style="font-family:sans-serif;padding:20px"><h2>卓见心理</h2><p>您的验证码为：</p><h1 style="color:#4A7BBA;letter-spacing:8px">${code}</h1><p style="color:#999">验证码5分钟内有效，请勿泄露给他人。</p></div>`
  });
}

module.exports = { sendEmail };
