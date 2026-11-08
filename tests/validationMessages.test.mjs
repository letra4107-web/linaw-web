import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';
const { tagalogError } = loadTs('src/lib/validationMessages.ts');

test('authentication validation uses error codes and provides actionable Tagalog feedback', () => {
  const cases = [
    ['invalid_credentials', 'Mali ang email o password'],
    ['email_not_confirmed', 'Kumpirmahin muna'],
    ['email_exists', 'May account nang'],
    ['weak_password', 'matibay na password'],
    ['same_password', 'iba sa kasalukuyan'],
    ['otp_expired', 'Humiling ng bagong code'],
    ['mfa_verification_failed', 'pinakabagong code'],
    ['over_email_send_rate_limit', 'Maghintay sandali'],
    ['email_address_invalid', 'wastong email'],
    ['refresh_token_not_found', 'Mag-login muli'],
  ];
  for (const [code, text] of cases) assert.ok(tagalogError({ code, message: 'Provider diagnostic' }).includes(text), code);
});

test('service errors without codes are translated without changing app-owned Tagalog messages', () => {
  for (const message of ['Invalid login credentials', 'User already registered', 'Email not confirmed', 'Token has expired or is invalid', 'New password should be different from the old password', 'Failed to fetch']) {
    assert.notEqual(tagalogError(new Error(message)), message);
    assert.notEqual(tagalogError(new Error(message)), tagalogError(null));
  }
  for (const message of ['Hindi magkatugma ang password.', 'Pumili ng wastong guro.', 'Ang marka ay dapat 0 hanggang 100.', 'May hindi pinapayagang karakter sa teksto.', 'Naka-enroll na ang mag-aaral na ito sa grade level na ito.', 'I-save muna ang nakabinbing sagot gamit ang subukan muli.', 'PDF file lamang ang maaaring i-upload.']) assert.equal(tagalogError(message), message);
});

test('unknown errors use a Tagalog fallback and hide provider diagnostics', () => {
  for (const error of [null, undefined, {}, new Error('Database diagnostic: relation private_users does not exist'), 'May not access relation private_users']) assert.equal(tagalogError(error), tagalogError(null));
  assert.equal(tagalogError(new Error('Unknown provider error'), 'Hindi maitala ang sagot.'), 'Hindi maitala ang sagot.');
  assert.match(tagalogError({ code: '23505', message: 'private unique constraint' }), /kaparehong tala/);
  assert.match(tagalogError({ code: '42501', message: 'private policy' }), /pahintulot/);
});
