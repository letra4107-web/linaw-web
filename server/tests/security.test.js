const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validatePdfUpload, MAX_PDF_SIZE_BYTES } = require('../lib/pdfValidation');
const { buildReadingProfile } = require('../services/readingInsights');
const { bearerTokenFrom, createAuthMiddleware } = require('../middleware/authCore');
const { createAuthorizationService, notificationBelongsTo } = require('../services/authorization');
const { isUuid, isAccuracy } = require('../lib/validation');
const express = require('express');
const { createTtsRouter, MAX_TEXT_LENGTH } = require('../routes/tts');
const { userLimiter } = require('../lib/rateLimiters');
const { createMaterialAccessService } = require('../services/materialAccess');
const { credentialStatus, safeCredentialStatus, summarizeCredentialSecurity } = require('../services/credentialSecurity');
const { validateServerConfig } = require('../config/validateConfig');
const { extractStorageLocation, storageReadiness } = require('../services/storageMigration');

const fakePdf = (overrides = {}) => ({
  originalname: 'lesson.pdf',
  mimetype: 'application/pdf',
  buffer: Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'),
  ...overrides,
});

test('PDF validation accepts a structurally plausible PDF', () => {
  assert.equal(validatePdfUpload(fakePdf()).valid, true);
});

test('PDF validation rejects spoofed MIME, extension, signature, empty, and truncated files', () => {
  assert.equal(validatePdfUpload(fakePdf({ mimetype: 'text/plain' })).valid, false);
  assert.equal(validatePdfUpload(fakePdf({ originalname: 'lesson.txt' })).valid, false);
  assert.equal(validatePdfUpload(fakePdf({ buffer: Buffer.from('not a pdf %%EOF') })).valid, false);
  assert.equal(validatePdfUpload(fakePdf({ buffer: Buffer.alloc(0) })).valid, false);
  assert.equal(validatePdfUpload(fakePdf({ buffer: Buffer.from('%PDF-1.7 without trailer') })).valid, false);
  assert.equal(validatePdfUpload(fakePdf({ buffer: Buffer.alloc(MAX_PDF_SIZE_BYTES + 1) })).valid, false);
});

test('reading profile keeps progress calculations bounded and flags weak performance', () => {
  const profile = buildReadingProfile({
    sessions: [
      { word: 'bata', accuracy_percentage: 40, created_at: '2026-08-30T00:00:00Z' },
      { word: 'bata', accuracy_percentage: 55, created_at: '2026-08-31T00:00:00Z' },
      { word: 'bata', accuracy_percentage: 60, created_at: '2026-09-01T00:00:00Z' },
    ],
    now: new Date('2026-09-01T12:00:00Z'),
  });
  assert.ok(profile.averageAccuracy >= 0 && profile.averageAccuracy <= 100);
  assert.equal(profile.needsIntervention, true);
  assert.equal(profile.sessionCount, 3);
});

test('security-critical routes retain authorization and ownership checks', () => {
  const root = path.resolve(__dirname, '..');
  const tts = fs.readFileSync(path.join(root, 'routes', 'tts.js'), 'utf8');
  const teacher = fs.readFileSync(path.join(root, 'routes', 'teacher.js'), 'utf8');
  const parent = fs.readFileSync(path.join(root, 'routes', 'parent.js'), 'utf8');
  const student = fs.readFileSync(path.join(root, 'routes', 'student.js'), 'utf8');
  assert.match(tts, /authMiddleware = requireAuth/);
  assert.match(tts, /ttsLimiter/);
  assert.match(teacher, /requireRole\('teacher', 'admin'\)/);
  assert.match(parent, /authorization\.parentChild/);
  assert.match(student, /requireRole\('student'\)/);
  assert.match(student, /\.is\('completed_at', null\)/);
  assert.doesNotMatch(student, /bonusXp/);
});

test('bearer and role middleware rejects missing, invalid, and unauthorized sessions', async () => {
  assert.equal(bearerTokenFrom('Bearer abc'), 'abc');
  assert.equal(bearerTokenFrom('Basic abc'), '');

  let requestedToken;
  const client = {
    auth: { getUser: async (token) => {
      requestedToken = token;
      return token === 'valid' ? { data: { user: { id: 'user-a' } }, error: null } : { data: {}, error: new Error('invalid') };
    } },
    from: () => ({ select: () => ({ eq: (_field, id) => ({ maybeSingle: async () => ({ data: { role: id === 'admin-a' ? 'admin' : id === 'teacher-a' ? 'teacher' : 'parent' }, error: null }) }) }) }),
  };
  const { requireAuth, requireRole } = createAuthMiddleware(client);
  const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

  let res = response();
  await requireAuth({ headers: {} }, res, () => assert.fail('missing token must not continue'));
  assert.equal(res.statusCode, 401);

  res = response();
  await requireAuth({ headers: { authorization: 'Bearer bad' } }, res, () => assert.fail('invalid token must not continue'));
  assert.equal(res.statusCode, 401);

  const req = { headers: { authorization: 'Bearer valid' } };
  let continued = false;
  await requireAuth(req, response(), () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(requestedToken, 'valid');
  assert.equal(req.user.id, 'user-a');

  res = response();
  await requireRole('admin')({ user: { id: 'user-a' } }, res, () => assert.fail('parent must not enter admin route'));
  assert.equal(res.statusCode, 403);
  continued = false;
  await requireRole('admin')({ user: { id: 'admin-a' } }, response(), () => { continued = true; });
  assert.equal(continued, true);
  res = response();
  await requireRole('teacher', 'admin')({ user: { id: 'user-a' } }, res, () => assert.fail('parent must not upload PDFs'));
  assert.equal(res.statusCode, 403);
  continued = false;
  await requireRole('teacher', 'admin')({ user: { id: 'teacher-a' } }, response(), () => { continued = true; });
  assert.equal(continued, true);
});

test('central authorization denies cross-parent, cross-teacher, and cross-student access', async () => {
  const children = new Map([
    ['child-a', { id: 'child-a', parent_id: 'parent-a' }],
    ['child-b', { id: 'child-b', parent_id: 'parent-b' }],
  ]);
  const assignments = new Map([
    ['assignment-a', { id: 'assignment-a', student_id: 'child-a' }],
    ['assignment-b', { id: 'assignment-b', student_id: 'child-b' }],
  ]);
  const authorization = createAuthorizationService({
    findChild: async (id) => children.get(id) || null,
    findTeacherStudentLink: async (teacherId, studentId) => teacherId === 'teacher-a' && studentId === 'child-a' ? { id: 'link-a' } : null,
    findAssignment: async (id) => assignments.get(id) || null,
  });
  assert.equal((await authorization.parentChild('parent-a', 'child-a')).id, 'child-a');
  assert.equal(await authorization.parentChild('parent-a', 'child-b'), null);
  assert.equal(await authorization.teacherStudent('teacher-a', 'child-a'), true);
  assert.equal(await authorization.teacherStudent('teacher-b', 'child-a'), false);
  assert.equal((await authorization.studentAssignment('child-a', 'assignment-a')).id, 'assignment-a');
  assert.equal(await authorization.studentAssignment('child-a', 'assignment-b'), null);
});

test('notification ownership and primitive input validation fail closed', () => {
  const children = [{ id: 'child-a', auth_uid: 'auth-child-a' }];
  assert.equal(notificationBelongsTo({ user_id: 'parent-a' }, 'parent-a', children), true);
  assert.equal(notificationBelongsTo({ student_id: 'child-a' }, 'parent-a', children), true);
  assert.equal(notificationBelongsTo({ user_id: 'parent-b', student_id: 'child-b' }, 'parent-a', children), false);
  assert.equal(isUuid('0198f4c0-7f66-7b11-8d37-11dbf31bfced'), true);
  assert.equal(isUuid('../admin'), false);
  assert.equal(isAccuracy(100), true);
  assert.equal(isAccuracy(101), false);
});

async function withHttpApp(router, run) {
  const app = express();
  app.use(express.json());
  app.use('/api/tts', router);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}/api/tts`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('TTS route enforces auth, input bounds, successful synthesis, and per-user rate limits', async () => {
  const deny = (_req, res) => res.status(401).json({ error: 'Unauthorized' });
  const allow = (req, _res, next) => { req.user = { id: 'student-a' }; next(); };
  const noLimit = (_req, _res, next) => next();
  const provider = async () => ({ ok: true, json: async () => ({ audioContent: 'bXAz' }) });

  await withHttpApp(createTtsRouter({ authMiddleware: deny, limiter: noLimit, fetchImpl: provider, apiKey: 'test' }), async (url) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'bata' }) });
    assert.equal(response.status, 401);
  });
  await withHttpApp(createTtsRouter({ authMiddleware: allow, limiter: noLimit, fetchImpl: provider, apiKey: 'test' }), async (url) => {
    let response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(MAX_TEXT_LENGTH + 1) }) });
    assert.equal(response.status, 400);
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'bata' }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).audioContent, 'bXAz');
  });
  await withHttpApp(createTtsRouter({ authMiddleware: allow, limiter: userLimiter({ windowMs: 60_000, limit: 1 }), fetchImpl: provider, apiKey: 'test' }), async (url) => {
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'bata' }) };
    assert.equal((await fetch(url, options)).status, 200);
    assert.equal((await fetch(url, options)).status, 429);
  });
});

test('material access abstraction supports legacy and short-lived signed URLs', async () => {
  const material = { file_url: 'https://public.example/file.pdf', storage_path: 'teacher/file.pdf' };
  const fakeClient = { storage: { from: () => ({ createSignedUrl: async (path, expiresIn) => ({ data: { signedUrl: `https://signed.example/${path}?ttl=${expiresIn}` }, error: null }) }) } };
  const legacy = await createMaterialAccessService(fakeClient, { signedUrlsEnabled: false }).accessUrl(material);
  assert.equal(legacy.mode, 'legacy-public');
  const signed = await createMaterialAccessService(fakeClient, { signedUrlsEnabled: true, expiresIn: 300 }).accessUrl(material);
  assert.equal(signed.mode, 'signed');
  assert.equal(signed.expiresIn, 300);
  assert.match(signed.url, /teacher\/file\.pdf/);
});

test('legacy credential reporting is aggregate and never returns credential values', () => {
  const rows = [
    { child_id: 'a', plain_password: 'legacy-secret', password_rotated_at: null, plaintext_retired_at: null },
    { child_id: 'b', plain_password: 'old-secret', password_rotated_at: '2026-01-01', plaintext_retired_at: null },
    { child_id: 'c', plain_password: null, password_rotated_at: '2026-01-01', plaintext_retired_at: '2026-01-01' },
  ];
  assert.equal(credentialStatus(rows[0]), 'legacy');
  assert.deepEqual(safeCredentialStatus(rows[0]), { status: 'legacy', requiresRotation: true });
  const summary = summarizeCredentialSecurity(4, rows);
  assert.deepEqual(summary, { totalStudents: 4, legacy: 1, rotatedPending: 1, secure: 0, fullyRetired: 1, missing: 1, requiresRotation: 2 });
  assert.equal(JSON.stringify(summary).includes('legacy-secret'), false);
  assert.equal(JSON.stringify(summary).includes('old-secret'), false);
});

test('production configuration validation fails closed without printing secret values', () => {
  const invalid = validateServerConfig({ NODE_ENV: 'production', SUPABASE_SERVICE_ROLE_KEY: 'private-value', CORS_ORIGIN: '*', FRONTEND_URL: 'http://localhost' });
  assert.equal(invalid.valid, false);
  assert.equal(JSON.stringify(invalid).includes('private-value'), false);
  assert.ok(invalid.issues.some((issue) => issue.name === 'CORS_ORIGIN'));

  const valid = validateServerConfig({
    NODE_ENV: 'production',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'private-value',
    CORS_ORIGIN: 'https://linawletra.com,https://www.linawletra.com',
    FRONTEND_URL: 'https://linawletra.com',
    GOOGLE_TTS_API_KEY: 'private-google-value',
    STORAGE_SIGNED_URLS_ENABLED: 'false',
    API_COMPATIBILITY_VERSION: '3',
  });
  assert.equal(valid.valid, true);
});

test('storage paths are extracted without destroying legacy URLs', async () => {
  assert.deepEqual(
    extractStorageLocation('https://project.supabase.co/storage/v1/object/public/lesson-pdfs/teacher%20one/file.pdf?x=1'),
    { bucket: 'lesson-pdfs', path: 'teacher one/file.pdf' },
  );
  assert.equal(extractStorageLocation('https://external.example/file.pdf'), null);
  assert.deepEqual(storageReadiness([
    { storage_path: 'a.pdf', file_url: 'https://project.supabase.co/storage/v1/object/public/reading-materials/a.pdf' },
    { pdf_url: 'https://external.example/file.pdf' },
  ]), { total: 2, withStoragePath: 1, publicUrlDependencies: 2, unparseableUrls: 1 });

  let issued = 0;
  const fakeClient = { storage: { from: (bucket) => ({ createSignedUrl: async () => ({ data: { signedUrl: `https://signed.example/${bucket}/${++issued}` }, error: null }) }) } };
  const access = createMaterialAccessService(fakeClient, { signedUrlsEnabled: true, expiresIn: 1 });
  const first = await access.accessUrl({ storage_bucket: 'lesson-pdfs', storage_path: 'a.pdf' });
  const refreshed = await access.accessUrl({ storage_bucket: 'lesson-pdfs', storage_path: 'a.pdf' });
  assert.notEqual(first.url, refreshed.url);
});
