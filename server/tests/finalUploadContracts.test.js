const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const express = require('express');
const crypto = require('node:crypto');
process.env.SUPABASE_URL = 'http://127.0.0.1:9';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-upload-contract';
const USER = '00000000-0000-4000-8000-000000000002';

async function uploadScenario(endpoint, { metadataError = false, uploadError = false, removeError = false, corrupt = false, concurrent = false } = {}) {
  const files = new Set(), removed = [], uploads = [], records = [];
  const client = {
    storage: { from(bucket) { assert.equal(bucket, 'reading-materials'); return {
      async upload(key) { uploads.push(key); if (uploadError || files.has(key)) return { error: { message: 'Isolated storage rejected upload' } }; files.add(key); return { error: null }; },
      getPublicUrl(key) { return { data: { publicUrl: `https://qa.invalid/storage/${key}` } }; },
      async remove(keys) { removed.push(...keys); if (removeError) return { error: { message: 'Isolated removal unavailable' } }; keys.forEach((key) => files.delete(key)); return { error: null }; },
    }; } },
    from(table) {
      const result = { data: { id: 'qa-material' }, error: metadataError && table === 'pdf_materials' ? { code: metadataError === 'ambiguous' ? '' : 'XX001', message: 'Isolated metadata failure' } : null };
      let query; query = new Proxy({}, { get(_target, key) {
        if (key === 'then') return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
        if (key === 'single') return async () => result;
        return (...args) => { if (key === 'insert') records.push({ table, value: args[0] }); return query; };
      } }); return query;
    },
  };
  const filename = path.resolve(__dirname, '../routes/teacher.js'), actualRequire = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, Buffer, crypto, console: { error() {}, warn() {} }, Date: class extends Date { static now() { return 1792584000000; } }, require(name) {
    if (name === '../config/supabase') return { supabaseAdmin: client };
    if (name === '../middleware/auth') return { requireAuth(req, _res, next) { req.user = { id: USER }; next(); }, requireRole: () => (_req, _res, next) => next() };
    if (name === 'pdf-parse') return async () => ({ text: 'Synthetic reading sample' });
    if (name === '../lib/pdfDrillParser') return { parseDrillPdf: async () => ({ items: [], skipped: [] }) };
    return actualRequire(name);
  } }, { filename });
  const app = express(); app.use(module.exports);
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  async function request() {
    const body = new FormData(); body.append('title', 'Synthetic PDF'); body.append('gradeLevel', '1'); body.append('file', new Blob([corrupt ? 'Invalid PDF' : '%PDF-1.7\nSynthetic content\n%%EOF'], { type: 'application/pdf' }), 'same.pdf');
    const response = await fetch(`http://127.0.0.1:${server.address().port}${endpoint}`, { method: 'POST', body });
    return { status: response.status, body: await response.json() };
  }
  try { const responses = concurrent ? await Promise.all([request(), request()]) : [await request()]; return { responses, files, removed, uploads, records }; }
  finally { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }); }
}
for (const endpoint of ['/pdf', '/pdf-drill']) {
  test(`final upload ${endpoint}: metadata failure compensates only the new owned storage object`, async () => {
    const h = await uploadScenario(endpoint, { metadataError: true });
    assert.equal(h.responses[0].status, 500); assert.equal(h.uploads.length, 1);
    assert.equal(h.removed.length, 1); assert.equal(h.removed[0], h.uploads[0]);
    assert.ok(h.removed[0].startsWith(USER + '/')); assert.equal(h.files.size, 0);
  });
  test(`final upload ${endpoint}: rejected upload never deletes any object`, async () => {
    const h = await uploadScenario(endpoint, { uploadError: true });
    assert.equal(h.responses[0].status, 500); assert.equal(h.removed.length, 0); assert.equal(h.records.length, 0);
  });
  test(`final upload ${endpoint}: lost metadata acknowledgement never deletes a possibly referenced object`, async () => {
    const h = await uploadScenario(endpoint, { metadataError: 'ambiguous' });
    assert.equal(h.responses[0].status, 500); assert.equal(h.removed.length, 0); assert.equal(h.files.size, 1);
  });
  test(`final upload ${endpoint}: compensation failure preserves a safe HTTP failure`, async () => {
    const h = await uploadScenario(endpoint, { metadataError: true, removeError: true });
    assert.equal(h.responses[0].status, 500); assert.equal(h.removed.length, 1);
    assert.equal(h.responses[0].body.error, 'Unable to upload this PDF.');
    assert.equal(h.files.size, 1, 'Failed compensation is not proof that storage was cleaned');
  });
  test(`final upload ${endpoint}: invalid bytes are rejected before storage access`, async () => {
    const h = await uploadScenario(endpoint, { corrupt: true });
    assert.equal(h.responses[0].status, 400); assert.equal(h.uploads.length, 0);
  });
  test(`final upload ${endpoint}: simultaneous same-name uploads use distinct owned paths`, async () => {
    const h = await uploadScenario(endpoint, { concurrent: true });
    assert.ok(h.responses.every((response) => response.status === 200));
    assert.equal(new Set(h.uploads).size, 2); assert.equal(h.files.size, 2);
  });
}
