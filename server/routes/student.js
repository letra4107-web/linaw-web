const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { buildReadingProfile } = require('../services/readingInsights');
const { loadCompletedContentIds } = require('../services/readingProfileData');
const { checkAndAwardBadges } = require('../lib/badgeEngine');

const router = express.Router();

const WORD_OF_DAY_MAX_ATTEMPTS = 3;
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

// POST /student/notify-login -- mirrors mobile's backend/routes/auth.js notify-login:
// alerts the parent every time their student logs in via web. Called once from the
// student's AuthContext right after role resolution, not on every token refresh.
router.post('/notify-login', async (req, res) => {
  try {
    const { data: child, error: childErr } = await supabaseAdmin
      .from('children')
      .select('id, name, parent_id')
      .eq('auth_uid', req.user.id)
      .maybeSingle();
    if (childErr) throw childErr;

    if (!child?.parent_id) return res.json({ success: true, notified: false });

    const studentName = child.name || 'Mag-aaral';
    const timestamp = new Date().toLocaleString('fil-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });
    const message = `Nag-login si ${studentName} — ${timestamp}`;

    const { error: insertErr } = await supabaseAdmin.from('notifications').insert({
      user_id: child.parent_id,
      parent_id: child.parent_id,
      student_id: child.id,
      title: 'Nag-login ang Mag-aaral',
      body: message,
      message,
      type: 'student_login',
      is_read: false,
      read: false,
    });
    if (insertErr) throw insertErr;

    res.json({ success: true, notified: true });
  } catch (err) {
    console.error('[student/notify-login]', err);
    // Never fatal to the caller -- a missed notification shouldn't look like a failed login.
    res.status(200).json({ success: false, notified: false });
  }
});

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
    const newlyUnlockedBadges = await checkAndAwardBadges(supabaseAdmin, studentId);
    res.json({ ...data, newlyUnlockedBadges });
  } catch (err) {
    handleRpcError(res, err);
  }
});

// Shuffles an array in place (Fisher-Yates) using a fresh copy.
function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// start_module_assessment never populates answer_options/correct_answer_index for any
// module in this curriculum today (they're reserved DB columns for a future authored
// reading-comprehension item type -- confirmed empty for every existing Beginner/
// Intermediate module). To let the student pick an answer by listening ("babasahin ng
// system, huhulaan ng bata ang tunog"), synthesize 4-option multiple choice here using
// the assessment's own other items as the distractor pool -- the same item set the
// module already teaches, so every option is something the student has practiced.
// Only applied when the RPC didn't already supply real options, and only when there
// are enough sibling items to form 3 distinct wrong answers.
function synthesizeAnswerOptions(items) {
  return items.map((item) => {
    if (item.answer_options) return item;
    const pool = items
      .filter((other) => other.assessment_item_id !== item.assessment_item_id && other.content_text !== item.content_text)
      .map((other) => other.content_text);
    const uniquePool = [...new Set(pool)];
    if (uniquePool.length < 3) return item;
    const distractors = shuffled(uniquePool).slice(0, 3);
    const options = shuffled([item.content_text, ...distractors]);
    return { ...item, answer_options: options, correct_answer_index: options.indexOf(item.content_text) };
  });
}

// POST /student/learn/assessment/:assessmentId/start
router.post('/learn/assessment/:assessmentId/start', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { data, error } = await supabaseAdmin.rpc('start_module_assessment', {
      p_student_id: studentId,
      p_assessment_id: req.params.assessmentId,
    });
    if (error) throw error;
    res.json({ ...data, items: synthesizeAnswerOptions(data.items || []) });
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
    const newlyUnlockedBadges = await checkAndAwardBadges(supabaseAdmin, studentId);
    res.json({ ...data, newlyUnlockedBadges });
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

    const attemptsCount = attempts ?? 1;
    const isCorrect = Boolean(correct);
    // Only end the word-of-the-day once the student nails it exactly, or runs out of the 3
    // tries -- a partial/near match must not mark it "correct" or stop further attempts early.
    const isFinal = isCorrect || attemptsCount >= WORD_OF_DAY_MAX_ATTEMPTS;

    const update = { attempts: attemptsCount, accuracy: accuracy ?? null };
    if (isFinal) {
      update.correct = isCorrect;
      update.xp_awarded = isCorrect ? (bonusXp ?? 25) : 0;
      update.completed_at = new Date().toISOString();
    }

    const { error: updErr } = await supabaseAdmin.from('word_of_day_log').update(update).eq('id', logId);
    if (updErr) throw updErr;

    let newXp = null;
    let newStreak = null;
    let newlyUnlockedBadges = [];
    if (isFinal && isCorrect) {
      const { data: progress, error: progressErr } = await supabaseAdmin
        .from('child_progress')
        .select('xp, streak, longest_streak, last_practice_date')
        .eq('child_id', studentId)
        .maybeSingle();
      if (progressErr) throw progressErr;
      newXp = (progress?.xp ?? 0) + (bonusXp ?? 25);

      // Mirrors mobile's complete_word_of_day_attempt streak rule (its migrations
      // 022/031): already practiced today -> keep streak (min 1); practiced
      // yesterday -> +1; any bigger gap (or first-ever) -> reset to 1. Streak is
      // owned exclusively by a correct Word of the Day completion, same as mobile.
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const prevStreak = progress?.streak ?? 0;
      if (progress?.last_practice_date === today) newStreak = Math.max(prevStreak, 1);
      else if (progress?.last_practice_date === yesterday) newStreak = prevStreak + 1;
      else newStreak = 1;
      const newLongestStreak = Math.max(progress?.longest_streak ?? 0, newStreak);

      const { error: xpErr } = await supabaseAdmin
        .from('child_progress')
        .update({ xp: newXp, streak: newStreak, longest_streak: newLongestStreak, last_practice_date: today })
        .eq('child_id', studentId);
      if (xpErr) throw xpErr;

      newlyUnlockedBadges = await checkAndAwardBadges(supabaseAdmin, studentId);
    }

    res.json({
      success: true,
      isFinal,
      correct: isFinal ? isCorrect : null,
      xpAwarded: isFinal && isCorrect ? (bonusXp ?? 25) : 0,
      newXp,
      newStreak,
      newlyUnlockedBadges,
    });
  } catch (err) {
    handleRpcError(res, err);
  }
});

// GET /student/pdf-drill/:assignmentId -- items + which ones this student
// already completed, so re-opening a drill mid-way resumes correctly.
router.get('/pdf-drill/:assignmentId', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { assignmentId } = req.params;

    const { data: assignment, error: assignmentErr } = await supabaseAdmin
      .from('pdf_assignments')
      .select('id, pdf_material_id, student_id, status')
      .eq('id', assignmentId)
      .maybeSingle();
    if (assignmentErr) throw assignmentErr;
    if (!assignment || assignment.student_id !== studentId) {
      return res.status(404).json({ error: 'Assignment not found for this student.' });
    }

    const { data: material, error: materialErr } = await supabaseAdmin
      .from('pdf_materials')
      .select('id, title, drill_status')
      .eq('id', assignment.pdf_material_id)
      .maybeSingle();
    if (materialErr) throw materialErr;
    if (!material || material.drill_status !== 'published') {
      return res.status(404).json({ error: 'This PDF is not a published drill.' });
    }

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('pdf_drill_items')
      .select('id, band_index, item_order, syllable_pattern, word, image_url, xp_value')
      .eq('pdf_material_id', material.id)
      .order('item_order', { ascending: true });
    if (itemsErr) throw itemsErr;

    const { data: completedAttempts, error: attemptsErr } = await supabaseAdmin
      .from('pdf_reading_attempts')
      .select('drill_item_id')
      .eq('student_id', studentId)
      .eq('correct', true)
      .in('drill_item_id', (items || []).map((i) => i.id));
    if (attemptsErr) throw attemptsErr;

    res.json({
      title: material.title,
      items: items || [],
      completedItemIds: (completedAttempts || []).map((a) => a.drill_item_id),
    });
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/pdf-drill/attempt  { assignmentId, drillItemId, transcript, accuracy, correct }
// Same client-trust split as /word-of-day/attempt: the client computes speech-match
// accuracy, but the XP write and "already completed" check happen server-side.
router.post('/pdf-drill/attempt', async (req, res) => {
  try {
    const { data: child, error: childErr } = await supabaseAdmin
      .from('children')
      .select('id, name, auth_uid, parent_id')
      .eq('auth_uid', req.user.id)
      .maybeSingle();
    if (childErr) throw childErr;
    if (!child) return res.status(404).json({ error: 'No linked student record for this account.' });
    const studentId = child.id;

    const { assignmentId, drillItemId, transcript, accuracy, correct } = req.body || {};
    if (!assignmentId || !drillItemId) {
      return res.status(400).json({ error: 'assignmentId and drillItemId are required.' });
    }

    const { data: assignment, error: assignmentErr } = await supabaseAdmin
      .from('pdf_assignments')
      .select('id, pdf_material_id, student_id')
      .eq('id', assignmentId)
      .maybeSingle();
    if (assignmentErr) throw assignmentErr;
    if (!assignment || assignment.student_id !== studentId) {
      return res.status(404).json({ error: 'Assignment not found for this student.' });
    }

    const { data: item, error: itemErr } = await supabaseAdmin
      .from('pdf_drill_items')
      .select('id, pdf_material_id, xp_value')
      .eq('id', drillItemId)
      .maybeSingle();
    if (itemErr) throw itemErr;
    if (!item || item.pdf_material_id !== assignment.pdf_material_id) {
      return res.status(404).json({ error: 'Drill item not found in this assignment.' });
    }

    const isCorrect = Boolean(correct);

    // Only the first correct attempt on a given item ever pays out -- repeat
    // correct reads (e.g. the student replays it for practice) earn nothing more.
    const { data: priorCorrect, error: priorErr } = await supabaseAdmin
      .from('pdf_reading_attempts')
      .select('id')
      .eq('student_id', studentId)
      .eq('drill_item_id', drillItemId)
      .eq('correct', true)
      .maybeSingle();
    if (priorErr) throw priorErr;

    const xpAwarded = isCorrect && !priorCorrect ? item.xp_value : 0;

    const { error: insertErr } = await supabaseAdmin.from('pdf_reading_attempts').insert({
      pdf_assignment_id: assignmentId,
      student_id: studentId,
      drill_item_id: drillItemId,
      transcript: transcript || null,
      accuracy: accuracy ?? null,
      correct: isCorrect,
      xp_awarded: xpAwarded,
    });
    if (insertErr) throw insertErr;

    let newXp = null;
    if (xpAwarded > 0) {
      const { data: progress, error: progressErr } = await supabaseAdmin
        .from('child_progress')
        .select('xp')
        .eq('child_id', studentId)
        .maybeSingle();
      if (progressErr) throw progressErr;
      newXp = (progress?.xp ?? 0) + xpAwarded;
      const { error: xpErr } = await supabaseAdmin.from('child_progress').update({ xp: newXp }).eq('child_id', studentId);
      if (xpErr) throw xpErr;
    }

    // If every item in this drill now has a correct attempt from this student,
    // mark the assignment completed and notify parent/teacher once.
    let justCompletedDrill = false;
    if (xpAwarded > 0) {
      const { data: allItems, error: allItemsErr } = await supabaseAdmin
        .from('pdf_drill_items')
        .select('id')
        .eq('pdf_material_id', assignment.pdf_material_id);
      if (allItemsErr) throw allItemsErr;

      const { data: allCorrect, error: allCorrectErr } = await supabaseAdmin
        .from('pdf_reading_attempts')
        .select('drill_item_id')
        .eq('student_id', studentId)
        .eq('correct', true)
        .in('drill_item_id', (allItems || []).map((i) => i.id));
      if (allCorrectErr) throw allCorrectErr;

      const completedIds = new Set((allCorrect || []).map((a) => a.drill_item_id));
      justCompletedDrill = (allItems || []).length > 0 && (allItems || []).every((i) => completedIds.has(i.id));

      if (justCompletedDrill) {
        await supabaseAdmin.from('pdf_assignments').update({ status: 'completed' }).eq('id', assignmentId);

        const { data: material } = await supabaseAdmin.from('pdf_materials').select('title').eq('id', assignment.pdf_material_id).maybeSingle();
        const studentName = child.name || 'Ang mag-aaral';
        const completionMessage = `Natapos ni ${studentName} ang buong pagsasanay: ${material?.title || ''}`;
        await supabaseAdmin.from('notifications').insert({
          user_id: child.auth_uid,
          student_id: studentId,
          parent_id: child.parent_id,
          title: 'Natapos ang Pagsasanay sa Pantig',
          body: completionMessage,
          message: completionMessage,
          type: 'pdf_assignment',
          is_read: false,
          read: false,
        });
      }
    }

    const newlyUnlockedBadges = xpAwarded > 0 ? await checkAndAwardBadges(supabaseAdmin, studentId) : [];

    res.json({ success: true, correct: isCorrect, xpAwarded, newXp, drillCompleted: justCompletedDrill, newlyUnlockedBadges });
  } catch (err) {
    handleRpcError(res, err);
  }
});

module.exports = router;
