const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');
const { sendMail } = require('../config/mailer');

const router = express.Router();

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function findUserByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, account_status, is_active')
    .eq('email', String(email).toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

// POST /auth/login-otp/send  { email }
router.post('/login-otp/send', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await findUserByEmail(email);
    // Always return generic success to avoid account enumeration.
    if (!user || user.account_status === 'archived' || user.is_active === false) {
      return res.json({ success: true, message: 'If an account exists, a code was sent.' });
    }

    const { data: existing } = await supabaseAdmin
      .from('web_login_otp')
      .select('id, last_resend_at, resend_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.last_resend_at) {
      const elapsed = Date.now() - new Date(existing.last_resend_at).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        return res.json({ success: true, message: 'Code already sent recently.' });
      }
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);

    await supabaseAdmin.from('web_login_otp').delete().eq('user_id', user.id);
    const { error: insertErr } = await supabaseAdmin.from('web_login_otp').insert({
      user_id: user.id,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      resend_count: (existing?.resend_count || 0) + 1,
      last_resend_at: new Date().toISOString(),
    });
    if (insertErr) throw insertErr;

    await sendMail({
      to: email,
      subject: 'Ang iyong LinawLetra login code',
      text: `Ang iyong 6-digit na code para sa pag-login: ${code}\n\nMag-e-expire ito sa loob ng 10 minuto.`,
    });

    res.json({ success: true, message: 'If an account exists, a code was sent.' });
  } catch (err) {
    console.error('[auth/login-otp/send]', err);
    res.status(500).json({ error: 'Unable to send code right now.' });
  }
});

// POST /auth/login-otp/verify  { email, code }
router.post('/login-otp/verify', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'Invalid or expired code.' });

    const { data: otpRow } = await supabaseAdmin
      .from('web_login_otp')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) return res.status(400).json({ error: 'Invalid or expired code.' });

    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from('web_login_otp').delete().eq('id', otpRow.id);
      return res.status(400).json({ error: 'Nag-expire na ang code. Humiling ng bago.' });
    }

    if (otpRow.attempts >= MAX_ATTEMPTS) {
      await supabaseAdmin.from('web_login_otp').delete().eq('id', otpRow.id);
      return res.status(400).json({ error: 'Sobra na ang maling pagtatangka. Humiling ng bagong code.' });
    }

    const matches = await bcrypt.compare(String(code), otpRow.code_hash);
    if (!matches) {
      await supabaseAdmin
        .from('web_login_otp')
        .update({ attempts: otpRow.attempts + 1 })
        .eq('id', otpRow.id);
      return res.status(400).json({ error: 'Maling code. Subukan ulit.' });
    }

    await supabaseAdmin.from('web_login_otp').delete().eq('id', otpRow.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/login-otp/verify]', err);
    res.status(500).json({ error: 'Unable to verify code right now.' });
  }
});

module.exports = router;
