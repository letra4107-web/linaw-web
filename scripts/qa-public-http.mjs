import fs from 'node:fs';
import assert from 'node:assert/strict';

// Explicitly read-only. No bearer tokens, Supabase keys, forms, SMTP or TTS.
const frontend = 'https://linawletra.com';
const api = 'https://linawletra-production-409e.up.railway.app/api';
const rows = [];
async function check(id, module, url, expected, inspect = () => {}) {
  const start = performance.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { Origin: frontend } });
    const content = await response.text();
    const headers = Object.fromEntries(['content-type', 'content-security-policy', 'cache-control', 'x-content-type-options', 'x-api-compatibility-version', 'access-control-allow-origin', 'access-control-expose-headers', 'x-request-id', 'ratelimit-policy'].map((key) => [key, response.headers.get(key)]));
    assert.equal(response.status, expected);
    inspect({ response, content, headers });
    rows.push({ id, module, url, expected: `HTTP ${expected}`, actual: `HTTP ${response.status}`, status: 'PASS', durationMs: Math.round(performance.now() - start), bytes: Buffer.byteLength(content), headers });
  } catch (error) {
    rows.push({ id, module, url, expected: `HTTP ${expected}`, actual: error.message, status: error.cause?.code || error.name === 'TimeoutError' ? 'BLOCKED' : 'FAIL', durationMs: Math.round(performance.now() - start) });
  }
}
for (const [index, route] of ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/resend-verification', '/privacy', '/terms', '/child-data', '/account-deletion', '/accessibility', '/admin', '/teacher', '/parent', '/student', '/robots.txt', '/sitemap.xml'].entries()) {
  await check(`LIVE-${String(index + 1).padStart(3, '0')}`, 'Deployed public HTTP', `${frontend}${route}`, 200, ({ content, headers }) => {
    if (!route.endsWith('.txt') && !route.endsWith('.xml')) {
      assert.match(content, /<div id="root"/);
      assert.match(headers['content-type'], /text\/html/);
    }
  });
}
await check('LIVE-019', 'Deployed API', `${api}/health`, 200, ({ content, headers }) => {
  const body = JSON.parse(content);
  assert.equal(body.ok, true);
  assert.ok(body.apiCompatibilityVersion);
  assert.equal(headers['x-content-type-options'], 'nosniff');
});
for (const [index, route] of ['/admin/analytics', '/teacher/students/11111111-1111-4111-8111-111111111111/modules', '/parent/children', '/student/learn/path', '/notifications'].entries()) {
  await check(`LIVE-${String(index + 20).padStart(3, '0')}`, 'Deployed anonymous authorization', `${api}${route}`, 401, ({ content }) => { assert.ok(JSON.parse(content).error); });
}
await check('LIVE-025', 'Deployed CORS compatibility', `${api}/health`, 200, ({ headers }) => {
  assert.equal(headers['access-control-allow-origin'], frontend);
  assert.match(headers['access-control-expose-headers'] || '', /x-api-compatibility-version/i);
});
const evidence = process.env.QA_EVIDENCE_DIR || 'docs/qa/evidence/phase3';
fs.mkdirSync(evidence, { recursive: true });
fs.writeFileSync(`${evidence}/deployed-public-http.json`, JSON.stringify({ scope: 'Unauthenticated GET requests only; status/headers are not proof of authenticated dashboard functionality.', rows }, null, 2) + '\n');
console.log(JSON.stringify({ pass: rows.filter((row) => row.status === 'PASS').length, fail: rows.filter((row) => row.status === 'FAIL').length, blocked: rows.filter((row) => row.status === 'BLOCKED').length, failures: rows.filter((row) => row.status !== 'PASS') }, null, 2));
if (rows.some((row) => row.status !== 'PASS')) process.exitCode = 1;
