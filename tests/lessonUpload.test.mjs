import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';
const { uploadPublishedLesson } = loadTs('src/lib/lessons/upload.ts', {}, { crypto: { randomUUID: () => 'upload-id' } });
const draft = { title: ' Patinig ', description: ' Pagkilala sa tunog. ', gradeLevel: '1' };
const pdf = { name: 'aralin.pdf', size: 30, slice: () => ({ text: async () => '%PDF-' }) };
function fixture({ storageError = null, insertError = null, insertThrows = false } = {}) {
  const calls = [], rows = [], removed = [];
  const bucket = { upload: async (path, file, options) => { calls.push({ path, options }); return { error: storageError }; }, getPublicUrl: path => ({ data: { publicUrl: `https://shared.example.invalid/storage/v1/object/public/lesson-pdfs/${path}` } }), remove: async paths => { removed.push(...paths); return { error: null }; } };
  const client = { storage: { from: name => { assert.equal(name, 'lesson-pdfs'); return bucket; } }, from: table => { assert.equal(table, 'lessons'); return { insert: row => { rows.push(row); return { select: fields => { assert.equal(fields, 'id'); return { single: async () => { if (insertThrows) throw new Error('Network interrupted'); return { data: insertError ? null : { id: 'lesson-1' }, error: insertError }; } }; } }; } }; } };
  return { client, calls, rows, removed };
}
test('a web upload publishes an iOS-compatible lesson without a subject', async () => {
  const f = fixture();
  assert.equal(await uploadPublishedLesson(f.client, 'teacher-1', draft, pdf), 'lesson-1');
  const row = f.rows[0];
  assert.equal(row.title, 'Patinig');assert.equal(row.description, 'Pagkilala sa tunog.');assert.equal(row.subject, null);assert.equal(row.grade_level, '1');assert.equal(row.is_published, true);
  assert.equal(row.storage_bucket, 'lesson-pdfs');assert.equal(row.pdf_url, row.legacy_public_url);assert.ok(row.pdf_url.endsWith(row.storage_path));assert.equal(row.file_name, 'aralin.pdf');assert.equal(f.calls[0].options.contentType, 'application/pdf');
});
test('invalid grades or files never start an upload or publish a lesson', async () => {
  for (const [values, file] of [[{ ...draft, gradeLevel: '7' }, pdf], [{ ...draft, title: ' ' }, pdf], [draft, { ...pdf, size: 0 }], [draft, { ...pdf, size: 50 * 1024 * 1024 + 1 }], [draft, { ...pdf, name: 'other.txt' }], [draft, { ...pdf, slice: () => ({ text: async () => 'wrong' }) }]]) {
    const f = fixture();await assert.rejects(uploadPublishedLesson(f.client, 'teacher-1', values, file));assert.equal(f.calls.length, 0);assert.equal(f.rows.length, 0);
  }
});
test('a rejected storage upload does not create a mobile lesson record', async () => {
  const f = fixture({ storageError: new Error('Upload failed') });await assert.rejects(uploadPublishedLesson(f.client, 'teacher-1', draft, pdf));assert.equal(f.rows.length, 0);
});
test('a confirmed database rejection cleans up its file while ambiguous network failure keeps it recoverable', async () => {
  const rejected = fixture({ insertError: { code: '23514', message: 'Rejected metadata' } });await assert.rejects(uploadPublishedLesson(rejected.client, 'teacher-1', draft, pdf));assert.equal(rejected.removed.length, 1);
  const interrupted = fixture({ insertThrows: true });await assert.rejects(uploadPublishedLesson(interrupted.client, 'teacher-1', draft, pdf));assert.equal(interrupted.removed.length, 0);
});
