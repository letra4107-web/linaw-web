const path = require('path');

const PDF_MIME_TYPES = new Set(['application/pdf', 'application/x-pdf']);
const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

function validatePdfUpload(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return { valid: false, error: "Walang laman ang ipinadalang PDF." };
  }
  if (file.buffer.length > MAX_PDF_SIZE_BYTES) {
    return { valid: false, error: "Masyadong malaki ang PDF. Hanggang 15 MB lamang." };
  }
  if (path.extname(String(file.originalname || '')).toLowerCase() !== '.pdf') {
    return { valid: false, error: "Kailangang nagtatapos sa .pdf ang pangalan ng file." };
  }
  if (!PDF_MIME_TYPES.has(String(file.mimetype || '').toLowerCase())) {
    return { valid: false, error: "Hindi kinikilalang PDF ang ipinadalang file." };
  }
  if (file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return { valid: false, error: "Hindi wastong PDF ang napiling file." };
  }
  const trailer = file.buffer.subarray(Math.max(0, file.buffer.length - 2048)).toString('latin1');
  if (!trailer.includes('%%EOF')) {
    return { valid: false, error: "Mukhang kulang o sira ang PDF. Pumili ng ibang file." };
  }
  return { valid: true, error: null };
}

module.exports = { validatePdfUpload, MAX_PDF_SIZE_BYTES };
