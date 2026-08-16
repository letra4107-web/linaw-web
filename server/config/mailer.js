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
    // Dev fallback: no SMTP credentials configured yet for this project.
    console.warn(`[mailer] SMTP not configured — would send "${subject}" to ${to}:\n${text ?? html}`);
    return { queued: false, devFallback: true };
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
