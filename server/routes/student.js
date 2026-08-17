const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { buildReadingProfile } = require('../services/readingInsights');
const { loadCompletedContentIds } = require('../services/readingProfileData');

const router = express.Router();
router.use(requireAuth, requireRole('student'));

// The module-progression RPCs all take p_student_id = children.id, not the
// auth uid -- every route resolves that mapping first via children.auth_uid.
async function resolveStudentId(authUid) {
  const { data, error } = await supabaseAdmin.from('children').select('id').eq('auth_uid', authUid).maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error('No linked student record for this account.'), { status: 404 });
  return data.id;
}

function handleRpcError(res, err) {
  console.error('[student rpc]', err);
  const status = err.status || (err.code === '42501' ? 403 : err.code === 'P0002' ? 404 : 500);
  res.status(status).json({ error: err.message || 'Something went wrong.' });
}

// GET /student/learn/path
router.get('/learn/path', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { data, error } = await supabaseAdmin.rpc('get_student_module_path', { p_student_id: studentId });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    handleRpcError(res, err);
  }
});

// GET /student/learn/module/:moduleId
router.get('/learn/module/:moduleId', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { data, error } = await supabaseAdmin.rpc('get_reading_module_content', {
      p_student_id: studentId,
      p_module_id: req.params.moduleId,
    });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/learn/content/:contentId/attempt
// { accuracy, transcript?, durationSeconds?, isFullSubmission?, source? }
router.post('/learn/content/:contentId/attempt', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { accuracy, transcript, durationSeconds, isFullSubmission, source } = req.body || {};
    const { data, error } = await supabaseAdmin.rpc('record_student_content_attempt', {
      p_student_id: studentId,
      p_content_id: req.params.contentId,
      p_accuracy: accuracy,
      p_transcript: transcript ?? null,
      p_duration_seconds: durationSeconds ?? null,
      p_is_full_submission: Boolean(isFullSubmission),
      p_source: source || 'practice',
    });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/learn/assessment/:assessmentId/start
router.post('/learn/assessment/:assessmentId/start', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { data, error } = await supabaseAdmin.rpc('start_module_assessment', {
      p_student_id: studentId,
      p_assessment_id: req.params.assessmentId,
    });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/learn/assessment/:attemptId/submit  { responses: [{assessment_item_id, content_attempt_id}] }
router.post('/learn/assessment/:attemptId/submit', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { responses } = req.body || {};
    const { data, error } = await supabaseAdmin.rpc('submit_module_assessment', {
      p_student_id: studentId,
      p_attempt_id: req.params.attemptId,
      p_responses: responses || [],
    });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/learn/module/:moduleId/equip  { slotNumber? }
router.post('/learn/module/:moduleId/equip', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { slotNumber } = req.body || {};
    const { data, error } = await supabaseAdmin.rpc('equip_student_module', {
      p_student_id: studentId,
      p_module_id: req.params.moduleId,
      p_slot_number: slotNumber || 1,
    });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/learn/module/:moduleId/unequip
router.post('/learn/module/:moduleId/unequip', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { data, error } = await supabaseAdmin.rpc('unequip_student_module', {
      p_student_id: studentId,
      p_module_id: req.params.moduleId,
      p_slot_number: null,
    });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    handleRpcError(res, err);
  }
});

// GET /student/reading-profile
// Ported from mobile's GET /personalization/profile -- reads directly from
// the shared Supabase project (pronunciation_practice_sessions,
// phoneme_confusion, student_content_completions), no dependency on mobile's
// own backend service.
router.get('/reading-profile', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);

    const [sessionsResult, confusionsResult, completions] = await Promise.all([
      supabaseAdmin
        .from('pronunciation_practice_sessions')
        .select('id,word,spoken_text,accuracy_percentage,is_correct,duration_seconds,practice_source,created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true })
        .limit(500),
      supabaseAdmin
        .from('phoneme_confusion')
        .select('confusion_key,target_word,source,created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true })
        .limit(1000),
      loadCompletedContentIds(supabaseAdmin, studentId),
    ]);
    if (sessionsResult.error) throw sessionsResult.error;
    if (confusionsResult.error) throw confusionsResult.error;

    const profile = buildReadingProfile({
      sessions: sessionsResult.data || [],
      confusions: confusionsResult.data || [],
      completions: completions.map((content_id) => ({ content_id })),
    });
    res.json({ profile });
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/word-of-day/attempt  { logId, attempts, correct, accuracy, bonusXp }
// word_of_day_log itself is student-writable directly via RLS (the frontend upserts/updates
// it straight from the client), but the XP reward is not -- child_progress has no student
// UPDATE policy on xp (confirmed via live RLS probe), matching this schema's established
// convention that XP writes are server-trusted, not client-trusted, even though the accuracy
// score itself is computed client-side (same split used by record_student_content_attempt).
router.post('/word-of-day/attempt', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { logId, attempts, correct, accuracy, bonusXp } = req.body || {};
    if (!logId) return res.status(400).json({ error: 'logId is required.' });

    const { data: logRow, error: fetchErr } = await supabaseAdmin
      .from('word_of_day_log')
      .select('id, child_id')
      .eq('id', logId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!logRow || logRow.child_id !== studentId) {
      return res.status(404).json({ error: 'Word of the day entry not found for this student.' });
    }

    const { error: updErr } = await supabaseAdmin
      .from('word_of_day_log')
      .update({
        attempts: attempts ?? 1,
        correct: Boolean(correct),
        accuracy: accuracy ?? null,
        xp_awarded: correct ? (bonusXp ?? 25) : 0,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId);
    if (updErr) throw updErr;

    let newXp = null;
    if (correct) {
      const { data: progress, error: progressErr } = await supabaseAdmin
        .from('child_progress')
        .select('xp')
        .eq('child_id', studentId)
        .maybeSingle();
      if (progressErr) throw progressErr;
      newXp = (progress?.xp ?? 0) + (bonusXp ?? 25);
      const { error: xpErr } = await supabaseAdmin.from('child_progress').update({ xp: newXp }).eq('child_id', studentId);
      if (xpErr) throw xpErr;
    }

    res.json({ success: true, xpAwarded: correct ? (bonusXp ?? 25) : 0, newXp });
  } catch (err) {
    handleRpcError(res, err);
  }
});

module.exports = router;
