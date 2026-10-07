const test = require('node:test');
const assert = require('node:assert/strict');
const { platformFor } = require('../services/audit');

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
