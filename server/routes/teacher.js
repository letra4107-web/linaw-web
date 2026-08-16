const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('teacher', 'admin'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files are allowed.'));
    cb(null, true);
  },
});

// POST /teacher/pdf  (multipart: file) + fields: title, gradeLevel, level
router.post('/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });
    const { title, gradeLevel, level } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const parsed = await pdfParse(req.file.buffer).catch(() => ({ text: '' }));

    const storagePath = `${req.user.id}/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('reading-materials')
      .upload(storagePath, req.file.buffer, { contentType: 'application/pdf', upsert: false });
    if (uploadErr) throw uploadErr;

    const { data: publicUrlData } = supabaseAdmin.storage.from('reading-materials').getPublicUrl(storagePath);

    const { data: material, error: insertErr } = await supabaseAdmin
      .from('pdf_materials')
      .insert({
        teacher_id: req.user.id,
        title,
        storage_path: storagePath,
        file_url: publicUrlData.publicUrl,
        extracted_text: parsed.text || null,
        grade_level: gradeLevel ? Number(gradeLevel) : null,
        level: level || null,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    res.json({ success: true, material });
  } catch (err) {
    console.error('[teacher/pdf upload]', err);
    res.status(500).json({ error: err.message || 'Unable to upload this PDF.' });
  }
});

module.exports = router;
