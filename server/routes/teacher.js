const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { parseDrillPdf } = require('../lib/pdfDrillParser');

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

    // Bridge into mobile's pre-existing (separate) teacher_uploads table so students
    // see this PDF in the mobile app too, without any mobile app code changes -- mobile's
    // openUpload() already falls back to Linking.openURL() for any path starting with
    // "https://", so pointing it at our public reading-materials URL works as-is.
    const { error: bridgeErr } = await supabaseAdmin.from('teacher_uploads').insert({
      id: crypto.randomUUID(),
      uploader_id: req.user.id,
      path: publicUrlData.publicUrl,
      content_type: 'application/pdf',
      size: req.file.size,
      metadata: { title, completed: false },
    });
    if (bridgeErr) console.warn('[teacher/pdf upload] mobile bridge insert failed:', bridgeErr.message);

    res.json({ success: true, material });
  } catch (err) {
    console.error('[teacher/pdf upload]', err);
    res.status(500).json({ error: err.message || 'Unable to upload this PDF.' });
  }
});

// POST /teacher/pdf-drill  (multipart: file) + fields: title, gradeLevel, level
// Same upload as /pdf, plus geometric table parsing (see lib/pdfDrillParser.js)
// into scoreable syllable-drill items. Always lands as drill_status:
// 'pending_review' -- the teacher must review/edit parsed items via
// PATCH .../items before POST .../publish makes it visible to students.
router.post('/pdf-drill', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });
    const { title, gradeLevel, level } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const { items: parsedItems, skipped } = await parseDrillPdf(req.file.buffer).catch((err) => {
      console.error('[teacher/pdf-drill parse]', err);
      return { items: [], skipped: [] };
    });

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
        grade_level: gradeLevel ? Number(gradeLevel) : null,
        level: level || null,
        drill_status: 'pending_review',
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    let items = [];
    if (parsedItems.length > 0) {
      const { data: insertedItems, error: itemsErr } = await supabaseAdmin
        .from('pdf_drill_items')
        .insert(parsedItems.map((item) => ({ ...item, pdf_material_id: material.id })))
        .select();
      if (itemsErr) throw itemsErr;
      items = insertedItems;
    }

    res.json({ success: true, material, items, skippedCount: skipped.length });
  } catch (err) {
    console.error('[teacher/pdf-drill upload]', err);
    res.status(500).json({ error: err.message || 'Unable to upload this PDF.' });
  }
});

async function requireOwnedDrillMaterial(req, res) {
  const { materialId } = req.params;
  const { data: material, error } = await supabaseAdmin
    .from('pdf_materials')
    .select('id, teacher_id, drill_status')
    .eq('id', materialId)
    .maybeSingle();
  if (error) throw error;
  if (!material || material.teacher_id !== req.user.id) {
    res.status(404).json({ error: 'PDF not found.' });
    return null;
  }
  return material;
}

// GET /teacher/pdf-drill/:materialId/items
router.get('/pdf-drill/:materialId/items', async (req, res) => {
  try {
    const material = await requireOwnedDrillMaterial(req, res);
    if (!material) return;

    const { data: items, error } = await supabaseAdmin
      .from('pdf_drill_items')
      .select('*')
      .eq('pdf_material_id', material.id)
      .order('item_order', { ascending: true });
    if (error) throw error;

    res.json({ material, items: items || [] });
  } catch (err) {
    console.error('[teacher/pdf-drill items]', err);
    res.status(500).json({ error: err.message || 'Unable to load drill items.' });
  }
});

// PATCH /teacher/pdf-drill/:materialId/items  { items: [{id?, band_index, item_order, syllable_pattern, word, image_url, xp_value}] }
// Full replace, since the review UI edits/reorders/deletes freely -- simpler and
// safer than diffing than trying to reconcile individual inserts/updates/deletes.
router.patch('/pdf-drill/:materialId/items', async (req, res) => {
  try {
    const material = await requireOwnedDrillMaterial(req, res);
    if (!material) return;

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    for (const item of items) {
      if (!item.syllable_pattern || !item.word) {
        return res.status(400).json({ error: 'Every item needs a syllable pattern and a word.' });
      }
    }

    const { error: deleteErr } = await supabaseAdmin.from('pdf_drill_items').delete().eq('pdf_material_id', material.id);
    if (deleteErr) throw deleteErr;

    let saved = [];
    if (items.length > 0) {
      const { data: insertedItems, error: insertErr } = await supabaseAdmin
        .from('pdf_drill_items')
        .insert(
          items.map((item, index) => ({
            pdf_material_id: material.id,
            band_index: item.band_index ?? index,
            item_order: item.item_order ?? index,
            syllable_pattern: item.syllable_pattern,
            word: item.word,
            image_url: item.image_url || null,
            xp_value: item.xp_value || 25,
          })),
        )
        .select();
      if (insertErr) throw insertErr;
      saved = insertedItems;
    }

    res.json({ success: true, items: saved });
  } catch (err) {
    console.error('[teacher/pdf-drill save items]', err);
    res.status(500).json({ error: err.message || 'Unable to save drill items.' });
  }
});

// POST /teacher/pdf-drill/:materialId/publish
router.post('/pdf-drill/:materialId/publish', async (req, res) => {
  try {
    const material = await requireOwnedDrillMaterial(req, res);
    if (!material) return;

    const { count, error: countErr } = await supabaseAdmin
      .from('pdf_drill_items')
      .select('id', { count: 'exact', head: true })
      .eq('pdf_material_id', material.id);
    if (countErr) throw countErr;
    if (!count) return res.status(400).json({ error: 'Add at least one drill item before publishing.' });

    const { error: updateErr } = await supabaseAdmin.from('pdf_materials').update({ drill_status: 'published' }).eq('id', material.id);
    if (updateErr) throw updateErr;

    res.json({ success: true });
  } catch (err) {
    console.error('[teacher/pdf-drill publish]', err);
    res.status(500).json({ error: err.message || 'Unable to publish this drill.' });
  }
});

module.exports = router;
