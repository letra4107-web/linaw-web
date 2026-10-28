const nodemailer = require('nodemailer');

const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function sendMail({ to, subject, html, text }) {
  if (!smtpConfigured) {
    // Never log a credential/OTP email, even in development. Parent enrollment
    // can still deliver a one-time password on screen; teacher creation must
    // surface delivery failure instead of claiming the message was sent.
    throw new Error('Email service is not configured.');
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'LinawLetra <no-reply@linawletra.app>',
    to,
    subject,
    html,
    text,
  });
  return { queued: true, devFallback: false };
}

module.exports = { sendMail, smtpConfigured };
