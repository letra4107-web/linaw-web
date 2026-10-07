const test = require('node:test');
const assert = require('node:assert/strict');
const { platformFor, shouldNotifyAdmins } = require('../services/audit');

test('audit platform label is web-only until native audit integration is enabled', () => {
  assert.equal(platformFor({ body: { platform: 'web' }, headers: {} }), 'Web');
  assert.equal(platformFor({ body: { platform: 'android' }, headers: {} }), 'Web');
  assert.equal(platformFor({ body: { platform: 'iOS' }, headers: {} }), 'Web');
});

test('audit platform label stays web for all user agents', () => {
  assert.equal(platformFor({ body: {}, headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' } }), 'Web');
  assert.equal(platformFor({ body: {}, headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 8)' } }), 'Web');
  assert.equal(platformFor({ body: {}, headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }), 'Web');
});

test('only successful non-admin sign-ins create an admin notification', () => {
  assert.equal(shouldNotifyAdmins('AUTH.LOGIN_SUCCESS', 'student', 'successful'), true);
  assert.equal(shouldNotifyAdmins('AUTH.LOGIN_SUCCESS', 'admin', 'successful'), false);
  assert.equal(shouldNotifyAdmins('AUTH.LOGOUT', 'student', 'successful'), false);
  assert.equal(shouldNotifyAdmins('AUTH.LOGIN_SUCCESS', 'parent', 'failed'), false);
});
