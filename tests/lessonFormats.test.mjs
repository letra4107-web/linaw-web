import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const draft = { title: 'Lesson', description: 'Word lesson', gradeLevel: '4' };
function fixture(response = () => new Response(new Blob(['%PDF-1.7 preview'], { type: 'application/pdf' }), { headers: { 'content-type': 'application/pdf' } })) {
  const requests = [], uploads = [], rows = [];
  const api = loadTs('src/lib/lessons/upload.ts', {}, { File, FormData, AbortController, setTimeout, clearTimeout, crypto,
    fetch: async (url, options) => { requests.push({ url, options }); return response(); },
  });
  const client = { auth: { getSession: async () => ({ data: { session: { user: { id: 'teacher-1' }, access_token: 'test-token' } } }) },
    storage: { from: () => ({ upload: async (path, file, options) => { uploads.push({ path, file, options }); return { error: null }; }, getPublicUrl: path => ({ data: { publicUrl: 'https://storage.example/' + path } }) }) },
    from: () => ({ insert: row => { rows.push(row); return { select: () => ({ single: async () => ({ data: { id: 'new-lesson' } }) }) }; } }),
  };
  return { ...api, client, requests, uploads, rows };
}

test('Word, PowerPoint, Excel and images publish the converted PDF to the existing student feed', async () => {
  for (const extension of ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']) {
    const f = fixture(); const input = new File(['fixture'], `lesson.${extension}`);
    assert.equal(await f.uploadPublishedLesson(f.client, 'teacher-1', draft, input), 'new-lesson');
    assert.equal(f.requests.length, 1); assert.equal(f.requests[0].options.headers.Authorization, 'Bearer test-token');
    assert.equal(f.requests[0].options.headers['Content-Type'], undefined, 'Browser supplies multipart boundary');
    assert.equal(f.requests[0].options.body.get('file').name, input.name);
    assert.equal(f.uploads[0].file.name, 'lesson.pdf'); assert.equal(f.uploads[0].file.type, 'application/pdf');
    assert.match(f.uploads[0].path, /^teacher-1\/.*\.pdf$/);
    assert.equal(f.rows[0].file_name, 'lesson.pdf'); assert.equal(f.rows[0].is_published, true); assert.equal(f.rows[0].grade_level, '4');
  }
});
test('conversion failure, invalid PDF response and wrong owner do not upload or publish', async () => {
  for (const response of [
    () => new Response(JSON.stringify({ message: 'Hindi mabasa ang dokumento.' }), { status: 422 }),
    () => new Response('not PDF', { headers: { 'content-type': 'application/pdf' } }),
    () => new Response('<html>gateway</html>', { headers: { 'content-type': 'text/html' } }),
    () => { throw new Error('Offline'); },
  ]) {
    const f = fixture(response);
    await assert.rejects(f.uploadPublishedLesson(f.client, 'teacher-1', draft, new File(['fixture'], 'lesson.docx')));
    assert.equal(f.uploads.length, 0); assert.equal(f.rows.length, 0);
  }
  const f = fixture();
  await assert.rejects(f.uploadPublishedLesson(f.client, 'other-teacher', draft, new File(['fixture'], 'lesson.docx')));
  assert.equal(f.requests.length, 0); assert.equal(f.uploads.length, 0);
});
test('unsupported formats fail before conversion and existing PDFs bypass the converter', async () => {
  const f = fixture();
  for (const name of ['lesson.exe', 'lesson.html', 'lesson.mp4', 'lesson.svg', 'lesson.zip', 'lesson']) await assert.rejects(f.validateLessonFile(new File(['data'], name)));
  await f.uploadPublishedLesson(f.client, 'teacher-1', draft, new File(['%PDF-1.7 fixture'], 'original.pdf', { type: 'application/pdf' }));
  assert.equal(f.requests.length, 0); assert.equal(f.rows[0].file_name, 'original.pdf');
});
