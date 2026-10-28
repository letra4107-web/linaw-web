// Real Express + HTTP integration. No mocked services or database: these cases
// must finish at the public/middleware boundary without any upstream call.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:9';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-local-http-key';
process.env.CORS_ORIGIN = 'http://localhost:5173';
delete process.env.ELEVENLABS_API_KEY;
delete process.env.SMTP_HOST;
const { app } = require('../server');
let server;
let base;
test.before(async () => {
  server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); });

test('local HTTP health returns compatibility, security headers, and correlation ID', async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.environment, 'test');
  assert.equal(body.apiCompatibilityVersion, '3');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(response.headers.get('x-request-id'));
  assert.equal(response.headers.get('x-powered-by'), null);
});
for (const role of ['admin', 'teacher', 'parent', 'student', 'notifications', 'auth']) {
  test(`local HTTP ${role} API rejects anonymous access`, async () => {
    const suffix = { admin: '/analytics', teacher: `/students/11111111-1111-4111-8111-111111111111/modules`, parent: '/children', student: '/learn/path', notifications: '', auth: '/events' }[role];
    const response = await fetch(`${base}/api/${role}${suffix}`, { method: role === 'auth' ? 'POST' : 'GET' });
    assert.equal(response.status, 401);
    assert.match((await response.json()).error, /bearer/i);
    assert.ok(response.headers.get('ratelimit-policy'));
  });
}
test('local HTTP TTS rejects anonymous synthesis before service use', async () => {
  const response = await fetch(`${base}/api/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"text":"bata"}' });
  assert.equal(response.status, 401);
});
test('local HTTP CORS exposes version headers to the configured frontend', async () => {
  const response = await fetch(`${base}/api/health`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.match(response.headers.get('access-control-expose-headers'), /X-API-Compatibility-Version/i);
});
test('local HTTP CORS denies unapproved origins', async () => {
  const response = await fetch(`${base}/api/health`, { headers: { Origin: 'https://unapproved.example.test' } });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
test('local HTTP handles malformed and oversized JSON with client errors', async () => {
  for (const [body, status] of [['{', 400], [JSON.stringify({ text: 'a'.repeat(1048576) }), 413]]) {
    const response = await fetch(`${base}/api/student/practice/attempt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    assert.equal(response.status, status);
    assert.ok((await response.json()).error);
  }
});
test('local HTTP returns a JSON 404 for an unknown endpoint', async () => {
  const response = await fetch(`${base}/api/not-implemented`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Not found' });
});

for (const role of ['admin', 'teacher', 'parent', 'student', 'notifications', 'authEvents']) {
  const source = fs.readFileSync(path.join(__dirname, '../routes', `${role}.js`), 'utf8');
  const prefix = role === 'authEvents' ? 'auth' : role;
  for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\('([^']+)'/g)) {
    const [, verb, route] = match;
    test(`local HTTP endpoint matrix ${verb.toUpperCase()} /api/${prefix}${route} denies anonymous`, async () => {
      const target = route.replace(/:[A-Za-z]+/g, '11111111-1111-4111-8111-111111111111');
      const response = await fetch(`${base}/api/${prefix}${target}`, { method: verb.toUpperCase(), headers: { 'Content-Type': 'application/json' }, ...(verb !== 'get' ? { body: '{}' } : {}) });
      assert.equal(response.status, 401);
      assert.ok((await response.json()).error);
    });
  }
}
