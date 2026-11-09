import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const upload = loadTs('src/lib/lessons/upload.ts', {}, { crypto: { randomUUID: () => 'new-upload' } });
const manage = loadTs('src/lib/lessons/manage.ts');
const { saveOwnedLessonEdit: save } = loadTs('src/lib/lessons/edit.ts', { './manage': manage, './upload': upload }, { URL });
const oldUrl = 'https://shared.example.invalid/storage/v1/object/public/lesson-pdfs/teacher/old.pdf';
const pdf = { name: 'kapalit.pdf', size: 50, slice: () => ({ text: async () => '%PDF-' }) };
const keep = { kind: 'keep' }, replace = { kind: 'replace', file: pdf }, remove = { kind: 'remove' };
const changes = { title: 'Bagong pamagat', description: 'Pagbasa', grade_level: '2' };
function fixture({ updateError, throws, stale = false, cleanupError, cleanupDenied = false, uploadError, row = {} } = {}) {
  const stored = { id: 'lesson', teacher_id: 'teacher', title: 'Aralin', is_published: true, pdf_url: oldUrl, legacy_public_url: oldUrl, storage_bucket: 'lesson-pdfs', storage_path: 'teacher/old.pdf', file_name: 'old.pdf', ...row };
  const previous = { ...stored }, events = [];
  const client = {
    storage: { from(bucket) {
      assert.equal(bucket, 'lesson-pdfs');
      return {
        async upload(path) { events.push(['upload', path]); return { error: uploadError || null }; },
        getPublicUrl(path) { return { data: { publicUrl: `https://shared.example.invalid/storage/v1/object/public/lesson-pdfs/${path}` } }; },
        async remove(paths) { events.push(['remove', ...paths]); return { data: cleanupDenied ? [] : paths.map(name => ({ name })), error: cleanupError || null }; },
      };
    } },
    from(table) {
      assert.equal(table, 'lessons'); let payload; const filters = [];
      const query = {
        update(values) { payload = values; return query; },
        eq(key, value) { filters.push([key, value]); return query; },
        is(key, value) { filters.push([key, value]); return query; },
        select(fields) { assert.equal(fields, 'id'); return query; },
        async maybeSingle() {
          events.push(['update', JSON.parse(JSON.stringify(payload)), JSON.parse(JSON.stringify(filters))]);
          if (throws) throw new Error('Network interrupted');
          if (updateError) return { data: null, error: updateError };
          if (stale || !filters.every(([key, value]) => stored[key] === value)) return { data: null, error: null };
          Object.assign(stored, payload); return { data: { id: stored.id }, error: null };
        },
      };
      return query;
    },
  };
  return { stored, previous, events, client, save: change => save(client, 'teacher', 'lesson', changes, previous, change) };
}
test('editing metadata keeps the existing PDF and performs no storage operations', async () => {
  const f = fixture(); await f.save(keep);
  assert.equal(f.stored.title, changes.title); assert.equal(f.stored.pdf_url, oldUrl);
  assert.deepEqual(f.events.map(event => event[0]), ['update']);
});
test('replacement saves a unique PDF on the same lesson before removing the original', async () => {
  const f = fixture(); assert.equal((await f.save(replace)).warning, '');
  assert.equal(f.stored.id, 'lesson'); assert.equal(f.stored.is_published, true);
  assert.equal(f.stored.storage_path, 'teacher/new-upload-kapalit.pdf');
  assert.equal(f.stored.pdf_url, f.stored.legacy_public_url); assert.equal(f.stored.file_name, 'kapalit.pdf');
  assert.deepEqual(f.events.map(event => event[0]), ['upload', 'update', 'remove']);
  assert.deepEqual(f.events[2], ['remove', 'teacher/old.pdf']);
  assert.ok(f.events[1][2].some(([key, value]) => key === 'teacher_id' && value === 'teacher'));
  assert.ok(f.events[1][2].some(([key, value]) => key === 'pdf_url' && value === oldUrl));
});
test('removing only the PDF retains the lesson as a draft and clears every file reference', async () => {
  const f = fixture(); await f.save(remove);
  assert.equal(f.stored.id, 'lesson'); assert.equal(f.stored.is_published, false); assert.equal(f.stored.title, changes.title);
  for (const field of ['pdf_url', 'legacy_public_url', 'storage_bucket', 'storage_path', 'file_name']) assert.equal(f.stored[field], null);
  assert.deepEqual(f.events.map(event => event[0]), ['update', 'remove']);
});
test('a draft stays a draft after adding a replacement PDF', async () => {
  const f = fixture({ row: { is_published: false } }); await f.save(replace); assert.equal(f.stored.is_published, false);
});
test('a PDF can be added again after attachment removal', async () => {
  const f = fixture({ row: { is_published: false, pdf_url: null, storage_path: null, storage_bucket: null } });
  await f.save(replace); assert.ok(f.stored.pdf_url); assert.equal(f.stored.is_published, false);
  assert.deepEqual(f.events.map(event => event[0]), ['upload', 'update']);
});
test('invalid, empty, oversized or disguised files cannot change the lesson', async () => {
  for (const file of [{ ...pdf, size: 0 }, { ...pdf, size: 50 * 1024 * 1024 + 1 }, { ...pdf, name: 'bad.txt' }, { ...pdf, slice: () => ({ text: async () => 'wrong' }) }]) {
    const f = fixture(); await assert.rejects(f.save({ kind: 'replace', file }));
    assert.equal(f.events.length, 0); assert.equal(f.stored.pdf_url, oldUrl);
  }
});
test('upload failure leaves the original lesson and file intact', async () => {
  const f = fixture({ uploadError: new Error('Upload failed') }); await assert.rejects(f.save(replace), /Upload failed/);
  assert.equal(f.stored.pdf_url, oldUrl); assert.deepEqual(f.events.map(event => event[0]), ['upload']);
});
test('a confirmed database rejection cleans up only the uncommitted replacement', async () => {
  const f = fixture({ updateError: { code: '42501', message: 'RLS denied' } }); await assert.rejects(f.save(replace));
  assert.equal(f.stored.pdf_url, oldUrl); assert.deepEqual(f.events[2], ['remove', 'teacher/new-upload-kapalit.pdf']);
});
test('an interrupted or ambiguous save keeps both files recoverable', async () => {
  for (const options of [{ throws: true }, { updateError: { code: '', message: 'Failed to fetch' } }]) {
    const f = fixture(options); await assert.rejects(f.save(replace));
    assert.ok(!f.events.some(event => event[0] === 'remove'));
  }
});
test('a stale PDF reference never overwrites a newer save or removes its file', async () => {
  const f = fixture({ stale: true }); await assert.rejects(f.save(replace), /Nagbago na/);
  assert.equal(f.stored.pdf_url, oldUrl); assert.deepEqual(f.events[2], ['remove', 'teacher/new-upload-kapalit.pdf']);
});
test('another teacher cannot update the lesson or remove its attachment', async () => {
  const f = fixture({ row: { teacher_id: 'other' } }); await assert.rejects(f.save(remove), /Nagbago na/);
  assert.equal(f.stored.pdf_url, oldUrl); assert.ok(!f.events.some(event => event[0] === 'remove'));
});
test('legacy PDFs are cleaned up only within the authenticated teacher folder', async () => {
  const own = fixture({ row: { storage_bucket: null, storage_path: null } }); await own.save(remove);
  assert.deepEqual(own.events[1], ['remove', 'teacher/old.pdf']);
  for (const pdf_url of [oldUrl.replace('/teacher/', '/other/'), 'https://example.invalid/lesson.pdf']) {
    const f = fixture({ row: { storage_bucket: null, storage_path: null, pdf_url } }); await f.save(remove);
    assert.ok(!f.events.some(event => event[0] === 'remove'));
  }
});
test('cleanup failure reports a warning while preserving the confirmed replacement', async () => {
  const f = fixture({ cleanupError: new Error('Cleanup unavailable') });
  assert.match((await f.save(replace)).warning, /hindi makumpirma ang pagtanggal/);
  assert.notEqual(f.stored.pdf_url, oldUrl);
});
test('a silently denied storage deletion is reported instead of claiming the old file was removed', async () => {
  const f = fixture({ cleanupDenied: true });
  assert.match((await f.save(remove)).warning, /hindi makumpirma ang pagtanggal/);
  assert.equal(f.stored.pdf_url, null); assert.equal(f.stored.is_published, false);
});
test('a signed-in teacher is required before any file upload or mutation', async () => {
  const f = fixture(); await assert.rejects(save(f.client, undefined, 'lesson', changes, f.previous, replace), /Mag-login/);
  assert.equal(f.events.length, 0);
});
