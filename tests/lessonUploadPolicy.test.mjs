import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('production browser policy permits the lesson conversion endpoint used by non-PDF uploads', () => {
  const uploader = fs.readFileSync(new URL('../src/lib/lessons/upload.ts', import.meta.url), 'utf8');
  const endpoint = uploader.match(/LESSON_PREVIEW_ENDPOINT\s*=\s*'([^']+)'/)[1];
  const config = fs.readFileSync(new URL('../public/.htaccess', import.meta.url), 'utf8');
  const connect = config.match(/connect-src\s+([^;]+)/)[1].split(/\s+/);
  assert.ok(connect.includes(new URL(endpoint).origin), 'Hostinger CSP must allow the converter, otherwise browsers report Failed to fetch');
  assert.ok(!connect.includes('*'), 'Allow only the required converter origin');
});
