import test from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../testing-audit/credential-classifier.mjs';

test('credential scan never consumes the next line after an empty example assignment', () => {
  for (const newline of ['\n','\r\n']) {
    assert.deepEqual(classify(['BREVO_API_KEY=', 'ELEVENLABS_API_KEY=', 'SMTP_PASS=your-smtp-password', 'SUPABASE_SERVICE_ROLE_KEY=your-service-role-key'].join(newline)), []);
  }
});
test('credential scan identifies synthetic credential categories without returning values', () => {
  const synthetic = 'xkeysib-' + 'A'.repeat(40);
  const found = classify(`BREVO_API_KEY=${synthetic}\nSMTP_PASS=local-diagnostic-value`);
  assert.deepEqual(found, ['Brevo API key','SMTP password / app password']);
  assert.ok(!JSON.stringify(found).includes(synthetic));
});
