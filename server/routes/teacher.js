const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { parseDrillPdf } = require('../lib/pdfDrillParser');
const { validatePdfUpload } = require('../lib/pdfValidation');
const { uploadLimiter } = require('../lib/rateLimiters');
const { validateUuidParam, isGrade, isBoundedString } = require('../lib/validation');
const { createMaterialAccessService } = require('../services/materialAccess');

const router = express.Router();
const materialAccess = createMaterialAccessService(supabaseAdmin);
router.use(requireAuth, requireRole('teacher', 'admin'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extensionIsPdf = /\.pdf$/i.test(file.originalname || '');
    const mimeIsPdf = ['application/pdf', 'application/x-pdf'].includes(String(file.mimetype).toLowerCase());
    if (!extensionIsPdf || !mimeIsPdf) return cb(new Error('Only PDF files are allowed.'));
    cb(null, true);
  },
});

// POST /teacher/pdf  (multipart: file) + fields: title, gradeLevel, level
router.post('/pdf', uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });
    const validation = validatePdfUpload(req.file);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    const { title, gradeLevel, level } = req.body || {};
    if (!isBoundedString(title, 160, { allowEmpty: false })) return res.status(400).json({ error: 'A valid title is required (maximum 160 characters).' });
    if (gradeLevel && !isGrade(gradeLevel)) return res.status(400).json({ error: 'Grade level must be 1-6.' });

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
        storage_bucket: 'reading-materials',
        file_url: publicUrlData.publicUrl,
        legacy_public_url: publicUrlData.publicUrl,
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
      storage_bucket: 'reading-materials',
      storage_path: storagePath,
      legacy_public_url: publicUrlData.publicUrl,
      content_type: 'application/pdf',
      size: req.file.size,
      metadata: { title, completed: false },
    });
    if (bridgeErr) console.warn('[teacher/pdf upload] mobile bridge insert failed:', bridgeErr.message);

    res.json({ success: true, material });
  } catch (err) {
    console.error('[teacher/pdf upload]', err);
    res.status(500).json({ error: 'Unable to upload this PDF.' });
  }
});

async function requireOwnedPdfMaterial(req, res) {
  const { id } = req.params;
  const { data: material, error } = await supabaseAdmin
    .from('pdf_materials')
    .select('id, teacher_id, storage_path, file_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!material || material.teacher_id !== req.user.id) {
    res.status(404).json({ error: 'PDF not found.' });
    return null;
  }
  return material;
}

// Compatibility abstraction for the future private-bucket migration. Existing
// viewers can keep using persisted URLs until both web and mobile are migrated.
router.get('/pdf/:id/access-url', validateUuidParam('id'), async (req, res) => {
  try {
    const material = await requireOwnedPdfMaterial(req, res);
    if (!material) return;
    res.json(await materialAccess.accessUrl(material));
  } catch (err) {
    console.error('[teacher/pdf access-url]', err);
    res.status(500).json({ error: 'Unable to open this PDF.' });
  }
});

router.get('/lessons/:id/access-url', validateUuidParam('id'), async (req, res) => {
  try {
    const { data: lesson, error } = await supabaseAdmin
      .from('lessons')
      .select('id, teacher_id, pdf_url, storage_bucket, storage_path, legacy_public_url')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!lesson || lesson.teacher_id !== req.user.id) return res.status(404).json({ error: 'Lesson not found.' });
    res.json(await materialAccess.accessUrl(lesson));
  } catch (err) {
    console.error('[teacher/lesson access-url]', err);
    res.status(500).json({ error: 'Unable to open this lesson.' });
  }
});

// PATCH /teacher/pdf/:id  { title, gradeLevel, level } -- edits metadata only,
// not the file itself (re-upload as a new material for that).
router.patch('/pdf/:id', validateUuidParam('id'), async (req, res) => {
  try {
    const material = await requireOwnedPdfMaterial(req, res);
    if (!material) return;

    const { title, gradeLevel, level } = req.body || {};
    if (!isBoundedString(title, 160, { allowEmpty: false })) return res.status(400).json({ error: 'A valid title is required (maximum 160 characters).' });
    if (gradeLevel && !isGrade(gradeLevel)) return res.status(400).json({ error: 'Grade level must be 1-6.' });
    if (level && !isBoundedString(level, 50)) return res.status(400).json({ error: 'Level is too long.' });

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('pdf_materials')
      .update({
        title: String(title).trim(),
        grade_level: gradeLevel ? Number(gradeLevel) : null,
        level: level || null,
      })
      .eq('id', material.id)
      .select()
      .single();
    if (updateErr) throw updateErr;

    res.json({ success: true, material: updated });
  } catch (err) {
    console.error('[teacher/pdf edit]', err);
    res.status(500).json({ error: 'Unable to save changes.' });
  }
});

// POST /teacher/pdf/:id/archive -- hides it from students' assignment lists
// (see migration 017) without deleting it or any attempt history.
router.post('/pdf/:id/archive', validateUuidParam('id'), async (req, res) => {
  try {
    const material = await requireOwnedPdfMaterial(req, res);
    if (!material) return;

    const { error: updateErr } = await supabaseAdmin
      .from('pdf_materials')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', material.id);
    if (updateErr) throw updateErr;

    res.json({ success: true });
  } catch (err) {
    console.error('[teacher/pdf archive]', err);
    res.status(500).json({ error: 'Unable to archive this PDF.' });
  }
});

// POST /teacher/pdf/:id/unarchive
router.post('/pdf/:id/unarchive', validateUuidParam('id'), async (req, res) => {
  try {
    const material = await requireOwnedPdfMaterial(req, res);
    if (!material) return;

    const { error: updateErr } = await supabaseAdmin.from('pdf_materials').update({ archived_at: null }).eq('id', material.id);
    if (updateErr) throw updateErr;

    res.json({ success: true });
  } catch (err) {
    console.error('[teacher/pdf unarchive]', err);
    res.status(500).json({ error: 'Unable to unarchive this PDF.' });
  }
});

// POST /teacher/pdf-drill  (multipart: file) + fields: title, gradeLevel, level
// Same upload as /pdf, plus geometric table parsing (see lib/pdfDrillParser.js)
// into scoreable syllable-drill items. Always lands as drill_status:
// 'pending_review' -- the teacher must review/edit parsed items via
// PATCH .../items before POST .../publish makes it visible to students.
router.post('/pdf-drill', uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });
    const validation = validatePdfUpload(req.file);
    if (!validation.valid) return res.status(400).json({ error: validation.error });
    const { title, gradeLevel, level } = req.body || {};
    if (!isBoundedString(title, 160, { allowEmpty: false })) return res.status(400).json({ error: 'A valid title is required (maximum 160 characters).' });
    if (gradeLevel && !isGrade(gradeLevel)) return res.status(400).json({ error: 'Grade level must be 1-6.' });

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
        storage_bucket: 'reading-materials',
        file_url: publicUrlData.publicUrl,
        legacy_public_url: publicUrlData.publicUrl,
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
    res.status(500).json({ error: 'Unable to upload this PDF.' });
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
router.get('/pdf-drill/:materialId/items', validateUuidParam('materialId'), async (req, res) => {
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
    res.status(500).json({ error: 'Unable to load drill items.' });
  }
});

// PATCH /teacher/pdf-drill/:materialId/items  { items: [{id?, band_index, item_order, syllable_pattern, word, image_url, xp_value}] }
// Full replace, since the review UI edits/reorders/deletes freely -- simpler and
// safer than diffing than trying to reconcile individual inserts/updates/deletes.
router.patch('/pdf-drill/:materialId/items', validateUuidParam('materialId'), async (req, res) => {
  try {
    const material = await requireOwnedDrillMaterial(req, res);
    if (!material) return;

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length > 250) return res.status(400).json({ error: 'A drill may contain at most 250 items.' });
    for (const item of items) {
      if (!isBoundedString(item.syllable_pattern, 80, { allowEmpty: false }) || !isBoundedString(item.word, 120, { allowEmpty: false })) {
        return res.status(400).json({ error: 'Every item needs a syllable pattern and a word.' });
      }
      if (item.image_url && !isBoundedString(item.image_url, 2048)) return res.status(400).json({ error: 'An image URL is too long.' });
      if (item.xp_value != null && (!Number.isInteger(Number(item.xp_value)) || Number(item.xp_value) < 0 || Number(item.xp_value) > 100)) {
        return res.status(400).json({ error: 'Item XP must be an integer from 0 to 100.' });
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
    res.status(500).json({ error: 'Unable to save drill items.' });
  }
});

// POST /teacher/pdf-drill/:materialId/publish
router.post('/pdf-drill/:materialId/publish', validateUuidParam('materialId'), async (req, res) => {
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
    res.status(500).json({ error: 'Unable to publish this drill.' });
  }
});

module.exports = router;
