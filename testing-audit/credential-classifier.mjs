export function classify(source) {
  const found = new Set();
  if (/\bxkeysib-[A-Za-z0-9-]{30,}/.test(source)) found.add('Brevo API key');
  if (/\bsk_[a-f0-9]{32,}/.test(source)) found.add('ElevenLabs API key');
  for (const match of source.matchAll(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g)) {
    try { if (JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url')).role === 'service_role') found.add('Supabase legacy service-role JWT'); } catch { /* No raw token output. */ }
  }
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^[ \t]*(SMTP_PASS|BREVO_API_KEY|ELEVENLABS_API_KEY|SUPABASE_SERVICE_ROLE_KEY)[ \t]*=(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (value && !/^(?:your[-_]|replace[-_]|<|\$|example|test[-_]|synthetic[-_]|isolated[-_])/i.test(value)) found.add({ SMTP_PASS: 'SMTP password / app password', BREVO_API_KEY: 'Brevo API key', ELEVENLABS_API_KEY: 'ElevenLabs API key', SUPABASE_SERVICE_ROLE_KEY: 'Supabase service-role key' }[match[1]]);
  }
  return [...found].sort();
}
