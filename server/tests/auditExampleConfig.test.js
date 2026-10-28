const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateServerConfig } = require('../config/validateConfig');

test('audit tracked server environment example contains placeholders rather than credentials', () => {
  const text = fs.readFileSync(path.resolve(__dirname, '../.env.example'), 'utf8').replace(/^\uFEFF/, '');
  assert.doesNotMatch(text, /\b(?:xkeysib-[A-Za-z0-9-]{30,}|sk_[a-f0-9]{32,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})/, 'Comments and unused lines must also be free of credential-shaped literals');
  const entries = Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    return match ? [[match[1], match[2]]] : [];
  }));
  for (const name of ['SUPABASE_SERVICE_ROLE_KEY', 'SMTP_PASS', 'BREVO_API_KEY', 'ELEVENLABS_API_KEY']) {
    assert.ok(Object.hasOwn(entries, name), `${name} must remain documented`);
    assert.ok(!entries[name] || /^(?:your-|replace-|<)/i.test(entries[name]), `${name} must be a placeholder or empty`);
  }
  assert.equal(entries.SUPABASE_URL, 'https://your-project.supabase.co');
  assert.equal(validateServerConfig(entries).valid, true);
});
