const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');

test('patched Nodemailer composes a credential-style email locally without SMTP delivery', async () => {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const info = await transport.sendMail({ from: 'LinawLetra <no-reply@example.test>', to: 'qa-parent@example.test', subject: 'Verification test', text: 'Synthetic test code: 123456' });
  assert.deepEqual(info.envelope.to, ['qa-parent@example.test']);
  const message = info.message.toString();
  assert.match(message, /Subject: Verification test/);
  assert.match(message, /Synthetic test code: 123456/);
});

test('patched Multer preserves memory uploads, file filtering, and size-limit errors over real local HTTP', async () => {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 64 }, fileFilter: (_req, file, next) => next(null, file.mimetype === 'application/pdf') });
  const app = express();
  app.post('/upload', upload.single('file'), (req, res) => res.json({ present: Boolean(req.file), size: req.file?.buffer.length }));
  app.use((error, _req, res, _next) => res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code }));
  const server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  try {
    for (const [text, type, expected, present] of [['%PDF-1.7\n%%EOF', 'application/pdf', 200, true], ['not a PDF', 'text/plain', 200, false], ['a'.repeat(65), 'application/pdf', 413, undefined]]) {
      const form = new FormData();
      form.append('file', new Blob([text], { type }), 'test.pdf');
      const response = await fetch(`http://127.0.0.1:${server.address().port}/upload`, { method: 'POST', body: form });
      assert.equal(response.status, expected);
      const body = await response.json();
      if (expected === 200) assert.equal(body.present, present);
      else assert.equal(body.error, 'LIMIT_FILE_SIZE');
    }
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
