const path = require('path');

const PDF_MIME_TYPES = new Set(['application/pdf', 'application/x-pdf']);
const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

function validatePdfUpload(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return { valid: false, error: 'The uploaded PDF is empty.' };
  }
  if (file.buffer.length > MAX_PDF_SIZE_BYTES) {
    return { valid: false, error: 'PDF is too large (maximum 15 MB).' };
  }
  if (path.extname(String(file.originalname || '')).toLowerCase() !== '.pdf') {
    return { valid: false, error: 'The file must use the .pdf extension.' };
  }
  if (!PDF_MIME_TYPES.has(String(file.mimetype || '').toLowerCase())) {
    return { valid: false, error: 'The uploaded file is not recognized as a PDF.' };
  }
  if (file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return { valid: false, error: 'The file does not contain a valid PDF signature.' };
  }
  const trailer = file.buffer.subarray(Math.max(0, file.buffer.length - 2048)).toString('latin1');
  if (!trailer.includes('%%EOF')) {
    return { valid: false, error: 'The PDF appears incomplete or corrupted.' };
  }
  return { valid: true, error: null };
}

module.exports = { validatePdfUpload, MAX_PDF_SIZE_BYTES };
