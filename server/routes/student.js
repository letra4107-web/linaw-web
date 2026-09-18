const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { buildReadingProfile } = require('../services/readingInsights');
const { loadCompletedContentIds } = require('../services/readingProfileData');
const { checkAndAwardBadges } = require('../lib/badgeEngine');
const { generateNonsenseWords } = require('../lib/nonsenseWords');
const { extractChallengeWords } = require('../lib/challengeWords');
const { isAccuracy, isBoundedString, validateUuidParam, isUuid } = require('../lib/validation');
const { assessmentLimiter } = require('../lib/rateLimiters');
const { createSupabaseAuthorizationService } = require('../services/authorization');
const { createMaterialAccessService } = require('../services/materialAccess');
const { scoreTranscript } = require('../lib/speechScoring');
const { randomUUID } = require('crypto');

const router = express.Router();
const authorization = createSupabaseAuthorizationService(supabaseAdmin);
const materialAccess = createMaterialAccessService(supabaseAdmin);

const WORD_OF_DAY_MAX_ATTEMPTS = 3;
const TRANSCRIPT_SCORABLE_CONTENT_TYPES = new Set(['phonetic', 'syllable', 'word', 'phrase', 'paragraph']);
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
  const messages = {
    400: 'Invalid student request.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested student resource was not found.',
  };
  res.status(status).json({ error: messages[status] || 'Unable to complete the student request.' });
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
router.get('/learn/module/:moduleId', validateUuidParam('moduleId'), async (req, res) => {
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
// { transcript, durationSeconds?, source? }
// The response is speech-derived for every currently supported module and
// assessment item type. Accuracy/completion are always derived below from the
// stored content, rather than supplied by the browser.
router.post('/learn/content/:contentId/attempt', validateUuidParam('contentId'), async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { transcript, durationSeconds, source } = req.body || {};
    if (!isBoundedString(transcript, 2000, { allowEmpty: false })) return res.status(400).json({ error: 'A spoken response is required.' });
    if (durationSeconds != null && (!Number.isFinite(Number(durationSeconds)) || Number(durationSeconds) < 0 || Number(durationSeconds) > 3600)) return res.status(400).json({ error: 'Invalid duration.' });
    if (source != null && !['practice', 'assessment'].includes(source)) return res.status(400).json({ error: 'Invalid attempt source.' });
    const { data: content, error: contentError } = await supabaseAdmin
      .from('reading_content')
      .select('id, content_text, content_type, is_active')
      .eq('id', req.params.contentId)
      .maybeSingle();
    if (contentError) throw contentError;
    if (!content || !content.is_active || !content.content_text) return res.status(404).json({ error: 'Reading content not found.' });
    if (!TRANSCRIPT_SCORABLE_CONTENT_TYPES.has(content.content_type)) {
      return res.status(422).json({ error: 'This activity type cannot be scored by a speech response.' });
    }
    const score = scoreTranscript(content.content_text, transcript);
    const { data, error } = await supabaseAdmin.rpc('record_student_content_attempt', {
      p_student_id: studentId,
      p_content_id: content.id,
      p_accuracy: score.accuracy,
      p_transcript: transcript,
      p_duration_seconds: durationSeconds ?? null,
      p_is_full_submission: content.content_type === 'paragraph',
      p_source: source || 'practice',
    });
    if (error) throw error;
    const newlyUnlockedBadges = await checkAndAwardBadges(supabaseAdmin, studentId);
    res.json({ ...data, accuracy: score.accuracy, correct: score.correct, newlyUnlockedBadges });
  } catch (err) {
    handleRpcError(res, err);
  }
});

// Staging-only pilot for moving a contained practice flow from client-scored to
// server-scored. It is deliberately not a replacement for the established
// route above until score comparisons and rollout evidence are reviewed.
router.post('/learn/content/:contentId/authoritative-attempt', assessmentLimiter, validateUuidParam('contentId'), async (req, res) => {
  if (process.env.NODE_ENV === 'production' || process.env.AUTHORITATIVE_SPEECH_SCORING_PILOT_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Not found.' });
  }
  try {
    const { transcript, durationSeconds, isFullSubmission, idempotencyKey, clientAccuracy } = req.body || {};
    if (!isBoundedString(transcript, 2000)) return res.status(400).json({ error: 'A transcript is required and must be at most 2000 characters.' });
    if (!isUuid(idempotencyKey)) return res.status(400).json({ error: 'A valid idempotencyKey is required.' });
    if (durationSeconds != null && (!Number.isFinite(Number(durationSeconds)) || Number(durationSeconds) < 0 || Number(durationSeconds) > 3600)) {
      return res.status(400).json({ error: 'Invalid duration.' });
    }
    if (clientAccuracy != null && !isAccuracy(clientAccuracy)) return res.status(400).json({ error: 'Invalid client comparison score.' });

    const studentId = await resolveStudentId(req.user.id);
    const { data: content, error: contentError } = await supabaseAdmin
      .from('reading_content')
      .select('id, content_text')
      .eq('id', req.params.contentId)
      .maybeSingle();
    if (contentError) throw contentError;
    if (!content?.content_text) return res.status(404).json({ error: 'Reading content not found.' });

    const { data: key, error: keyError } = await supabaseAdmin
      .from('authoritative_speech_attempt_keys')
      .insert({ student_id: studentId, content_id: content.id, idempotency_key: idempotencyKey })
      .select('response')
      .maybeSingle();
    if (keyError) {
      if (keyError.code !== '23505') throw keyError;
      const { data: prior, error: priorError } = await supabaseAdmin
        .from('authoritative_speech_attempt_keys')
        .select('content_id, response')
        .eq('student_id', studentId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (priorError) throw priorError;
      if (!prior || prior.content_id !== content.id) return res.status(409).json({ error: 'Idempotency key was already used for different content.' });
      if (!prior.response) return res.status(409).json({ error: 'This attempt is still being processed. Retry with the same key shortly.' });
      return res.json({ ...prior.response, replayed: true });
    }
    if (!key) throw Object.assign(new Error('Unable to reserve attempt key.'), { status: 409 });

    const score = scoreTranscript(content.content_text, transcript);
    const { data: attempt, error: attemptError } = await supabaseAdmin.rpc('record_student_content_attempt', {
      p_student_id: studentId,
      p_content_id: content.id,
      p_accuracy: score.accuracy,
      p_transcript: transcript,
      p_duration_seconds: durationSeconds == null ? null : Math.trunc(Number(durationSeconds)),
      p_is_full_submission: Boolean(isFullSubmission),
      p_source: 'practice',
    });
    if (attemptError) throw attemptError;
    const newlyUnlockedBadges = await checkAndAwardBadges(supabaseAdmin, studentId);
    const response = {
      ...attempt,
      score,
      newlyUnlockedBadges,
      // Comparison-only telemetry for staging; this field never affects outcomes.
      clientScoreDifference: clientAccuracy == null ? null : score.accuracy - Number(clientAccuracy),
      authoritative: true,
      replayed: false,
    };
    const { error: persistError } = await supabaseAdmin
      .from('authoritative_speech_attempt_keys')
      .update({ response })
      .eq('student_id', studentId)
      .eq('idempotency_key', idempotencyKey);
    if (persistError) throw persistError;
    res.json(response);
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

function pdfReadingChunks(rawText, chunkSize) {
  // Keep the server's source of truth aligned with the student reading view:
  // upload-ready stories have a teacher-only cover ending in "Ako Naman".
  const text = String(rawText || '').replace(/^[\s\S]*?Ako Naman[.â€"]*\s*/i, '');
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  const size = Math.min(3, Math.max(1, Number(chunkSize) || 1));
  return sentences.reduce((all, _sentence, index) => {
    if (index % size === 0) all.push(sentences.slice(index, index + size).join(' ').trim());
    return all;
  }, []).filter(Boolean);
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
  }).map(({ correct_answer_index: _answerKey, ...item }) => item);
}

// POST /student/learn/assessment/:assessmentId/start
router.post('/learn/assessment/:assessmentId/start', validateUuidParam('assessmentId'), assessmentLimiter, async (req, res) => {
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
router.post('/learn/assessment/:attemptId/submit', validateUuidParam('attemptId'), assessmentLimiter, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { responses } = req.body || {};
    if (!Array.isArray(responses) || responses.length > 100 || responses.some((response) => !isUuid(response.assessment_item_id) || !isUuid(response.content_attempt_id))) {
      return res.status(400).json({ error: 'Invalid assessment responses.' });
    }
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

// GET /student/learn/module/:moduleId/nonsense-check
// Phonological-dyslexia-focused decoding check, built by recombining that
// module's own taught units: phonetic/word modules recombine their taught
// letters/syllables directly; phrase/paragraph modules recombine syllables
// extracted from their vocabulary instead (see nonsenseWords.js). Only
// returns available:false if there genuinely aren't enough units to combine.
router.get('/learn/module/:moduleId/nonsense-check', validateUuidParam('moduleId'), async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { moduleId } = req.params;

    const { data: module, error: moduleErr } = await supabaseAdmin
      .from('reading_modules')
      .select('id, instructional_content_type')
      .eq('id', moduleId)
      .maybeSingle();
    if (moduleErr) throw moduleErr;
    if (!module) return res.status(404).json({ error: 'Module not found.' });

    const { data: existingCheck, error: existingErr } = await supabaseAdmin
      .from('student_nonsense_checks')
      .select('score')
      .eq('student_id', studentId)
      .eq('module_id', moduleId)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existingCheck) {
      return res.json({ available: true, alreadyCompleted: true, score: existingCheck.score, words: [] });
    }

    const { data: savedSet, error: setError } = await supabaseAdmin
      .from('student_nonsense_check_sets')
      .select('items')
      .eq('student_id', studentId)
      .eq('module_id', moduleId)
      .maybeSingle();
    if (setError) throw setError;
    if (Array.isArray(savedSet?.items) && savedSet.items.length >= 2) {
      return res.json({ available: true, alreadyCompleted: false, words: savedSet.items });
    }

    const generatedWords = await generateNonsenseWords(supabaseAdmin, moduleId, module.instructional_content_type);
    if (generatedWords.length < 2) return res.json({ available: false, alreadyCompleted: false, words: [] });
    const items = generatedWords.map((word) => ({ id: randomUUID(), word }));
    const { error: insertSetError } = await supabaseAdmin.from('student_nonsense_check_sets').insert({
      student_id: studentId,
      module_id: moduleId,
      items,
    });
    if (insertSetError && insertSetError.code !== '23505') throw insertSetError;
    if (insertSetError?.code === '23505') {
      const { data: concurrentSet, error: concurrentError } = await supabaseAdmin
        .from('student_nonsense_check_sets').select('items').eq('student_id', studentId).eq('module_id', moduleId).maybeSingle();
      if (concurrentError) throw concurrentError;
      return res.json({ available: true, alreadyCompleted: false, words: concurrentSet?.items || [] });
    }
    res.json({ available: true, alreadyCompleted: false, words: items });
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/learn/module/:moduleId/nonsense-check/submit  { results: [{itemId, transcript}] }
// One shot per student+module (enforced by the unique constraint) -- refreshing
// or replaying can't re-farm XP. XP/badges only apply on the first submission.
router.post('/learn/module/:moduleId/nonsense-check/submit', validateUuidParam('moduleId'), async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { moduleId } = req.params;
    const { results } = req.body || {};
    if (!Array.isArray(results) || results.length === 0 || results.length > 20) {
      return res.status(400).json({ error: 'results is required.' });
    }
    if (results.some((result) => !isUuid(result?.itemId) || !isBoundedString(result?.transcript, 2000, { allowEmpty: false }))) {
      return res.status(400).json({ error: 'Each result needs a valid item and spoken response.' });
    }

    const { data: existingCheck, error: existingErr } = await supabaseAdmin
      .from('student_nonsense_checks')
      .select('id, score')
      .eq('student_id', studentId)
      .eq('module_id', moduleId)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existingCheck) {
      return res.json({ success: true, alreadyCompleted: true, score: existingCheck.score, xpAwarded: 0, newlyUnlockedBadges: [] });
    }

    const { data: issuedSet, error: issuedSetError } = await supabaseAdmin
      .from('student_nonsense_check_sets')
      .select('items')
      .eq('student_id', studentId)
      .eq('module_id', moduleId)
      .maybeSingle();
    if (issuedSetError) throw issuedSetError;
    const issuedItems = Array.isArray(issuedSet?.items) ? issuedSet.items : [];
    const issuedById = new Map(issuedItems.map((item) => [item?.id, item?.word]));
    const submittedIds = results.map((result) => result.itemId);
    if (issuedItems.length < 2 || submittedIds.length !== issuedItems.length || new Set(submittedIds).size !== submittedIds.length || submittedIds.some((id) => !issuedById.has(id))) {
      return res.status(400).json({ error: 'These responses do not match this reading check.' });
    }

    const scoredResults = results.map((result) => {
      const score = scoreTranscript(issuedById.get(result.itemId), result.transcript);
      return { itemId: result.itemId, accuracy: score.accuracy, correct: score.correct };
    });
    const correctCount = scoredResults.filter((result) => result.correct).length;
    const score = Math.round((correctCount / results.length) * 100);
    const xpAwarded = correctCount * 15;

    const { error: insertErr } = await supabaseAdmin
      .from('student_nonsense_checks')
      .insert({ student_id: studentId, module_id: moduleId, score, xp_awarded: xpAwarded });
    if (insertErr) {
      if (insertErr.code !== '23505') throw insertErr;
      const { data: completed, error: completedError } = await supabaseAdmin
        .from('student_nonsense_checks').select('score').eq('student_id', studentId).eq('module_id', moduleId).maybeSingle();
      if (completedError) throw completedError;
      return res.json({ success: true, alreadyCompleted: true, score: completed?.score ?? 0, xpAwarded: 0, newlyUnlockedBadges: [] });
    }

    let newXp = null;
    let newlyUnlockedBadges = [];
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
      newlyUnlockedBadges = await checkAndAwardBadges(supabaseAdmin, studentId);
    }

    res.json({ success: true, alreadyCompleted: false, score, xpAwarded, newXp, newlyUnlockedBadges, results: scoredResults });
  } catch (err) {
    handleRpcError(res, err);
  }
});

// GET /student/learn/module/:moduleId/challenge-words
// Decoding warm-up shown before a story-type (paragraph) module: the 3+
// syllable words straight out of that story's own text. Ungated, no
// persistence -- purely formative practice, not scored/tracked like the
// nonsense-word check.
router.get('/learn/module/:moduleId/challenge-words', validateUuidParam('moduleId'), async (req, res) => {
  try {
    await resolveStudentId(req.user.id);
    const { moduleId } = req.params;

    const { data: module, error: moduleErr } = await supabaseAdmin
      .from('reading_modules')
      .select('id, instructional_content_type')
      .eq('id', moduleId)
      .maybeSingle();
    if (moduleErr) throw moduleErr;
    if (!module) return res.status(404).json({ error: 'Module not found.' });

    if (module.instructional_content_type !== 'paragraph') {
      return res.json({ available: false, words: [] });
    }

    const words = await extractChallengeWords(supabaseAdmin, moduleId);
    res.json({ available: words.length > 0, words });
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/learn/module/:moduleId/equip  { slotNumber? }
router.post('/learn/module/:moduleId/equip', validateUuidParam('moduleId'), async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { slotNumber } = req.body || {};
    if (slotNumber != null && (!Number.isInteger(Number(slotNumber)) || Number(slotNumber) < 1 || Number(slotNumber) > 3)) {
      return res.status(400).json({ error: 'Slot number must be 1, 2, or 3.' });
    }
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
router.post('/learn/module/:moduleId/unequip', validateUuidParam('moduleId'), async (req, res) => {
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

// POST /student/practice/attempt  { contentId, transcript }
// Free practice still contributes to progress and badge eligibility, so its
// target, score, student identity, and saved result cannot come from the
// browser. The content id is only a lookup key for active word content.
router.post('/practice/attempt', assessmentLimiter, async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { contentId, transcript } = req.body || {};
    if (!isUuid(contentId)) return res.status(400).json({ error: 'A valid practice word is required.' });
    if (!isBoundedString(transcript, 2000, { allowEmpty: false })) return res.status(400).json({ error: 'A spoken response is required.' });
    const { data: content, error: contentError } = await supabaseAdmin
      .from('reading_content')
      .select('id, content_text, content_type, is_active')
      .eq('id', contentId)
      .maybeSingle();
    if (contentError) throw contentError;
    if (!content || content.content_type !== 'word' || !content.is_active || !content.content_text) {
      return res.status(404).json({ error: 'Practice word not found.' });
    }
    const score = scoreTranscript(content.content_text, transcript);
    const { error: sessionError } = await supabaseAdmin.from('pronunciation_practice_sessions').insert({
      student_id: studentId,
      word: content.content_text,
      spoken_text: transcript,
      accuracy_percentage: score.accuracy,
      is_correct: score.correct,
      practice_source: 'practice',
    });
    if (sessionError) throw sessionError;
    const newlyUnlockedBadges = await checkAndAwardBadges(supabaseAdmin, studentId);
    res.json({ success: true, accuracy: score.accuracy, correct: score.correct, newlyUnlockedBadges });
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/word-of-day/attempt  { logId, attempts, transcript }
// word_of_day_log itself is student-writable directly via RLS (the frontend upserts/updates
// it straight from the client), but the XP reward is not -- child_progress has no student
// UPDATE policy on xp (confirmed via live RLS probe), matching this schema's established
// convention that XP writes are server-trusted, not client-trusted, even though the accuracy
// score itself is computed client-side (same split used by record_student_content_attempt).
router.post('/word-of-day/attempt', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { logId, attempts, transcript } = req.body || {};
    if (!isUuid(logId)) return res.status(400).json({ error: 'A valid logId is required.' });
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > WORD_OF_DAY_MAX_ATTEMPTS) {
      return res.status(400).json({ error: 'Attempts must be an integer from 1 to 3.' });
    }
    if (!isBoundedString(transcript, 2000, { allowEmpty: false })) return res.status(400).json({ error: 'A spoken response is required.' });

    const { data: logRow, error: fetchErr } = await supabaseAdmin
      .from('word_of_day_log')
      .select('id, child_id, word, completed_at')
      .eq('id', logId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!logRow || logRow.child_id !== studentId) {
      return res.status(404).json({ error: 'Word of the day entry not found for this student.' });
    }
    if (logRow.completed_at) return res.status(409).json({ error: 'This word-of-the-day attempt is already complete.' });

    const attemptsCount = attempts;
    // The browser may help the learner with immediate feedback, but rewards and
    // completion must always come from the server's comparison with the stored
    // word. Never accept a browser-provided correct/accuracy value here.
    const score = scoreTranscript(logRow.word, transcript);
    const isCorrect = score.correct;
    // Only end the word-of-the-day once the student nails it exactly, or runs out of the 3
    // tries -- a partial/near match must not mark it "correct" or stop further attempts early.
    const isFinal = isCorrect || attemptsCount >= WORD_OF_DAY_MAX_ATTEMPTS;

    const update = { attempts: attemptsCount, accuracy: score.accuracy };
    if (isFinal) {
      update.correct = isCorrect;
      update.xp_awarded = isCorrect ? 25 : 0;
      update.completed_at = new Date().toISOString();
    }

    const { data: updatedRows, error: updErr } = await supabaseAdmin
      .from('word_of_day_log')
      .update(update)
      .eq('id', logId)
      .is('completed_at', null)
      .select('id');
    if (updErr) throw updErr;
    if (!updatedRows?.length) return res.status(409).json({ error: 'This word-of-the-day attempt is already complete.' });

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
      newXp = (progress?.xp ?? 0) + 25;

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
      xpAwarded: isFinal && isCorrect ? 25 : 0,
      accuracy: score.accuracy,
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
router.get('/pdf-drill/:assignmentId', validateUuidParam('assignmentId'), async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { assignmentId } = req.params;

    const assignment = await authorization.studentAssignment(studentId, assignmentId);
    if (!assignment) {
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

router.get('/pdf-materials/:assignmentId/access-url', validateUuidParam('assignmentId'), async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const assignment = await authorization.studentAssignment(studentId, req.params.assignmentId);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found for this student.' });
    const { data: material, error } = await supabaseAdmin
      .from('pdf_materials')
      .select('id, storage_path, file_url')
      .eq('id', assignment.pdf_material_id)
      .maybeSingle();
    if (error) throw error;
    if (!material) return res.status(404).json({ error: 'PDF not found.' });
    res.json(await materialAccess.accessUrl(material));
  } catch (err) {
    handleRpcError(res, err);
  }
});

// GET /student/pdf-reading/:assignmentId -- server-owned resume state for a
// guided PDF reading activity. This replaces browser reads of attempt rows.
router.get('/pdf-reading/:assignmentId', validateUuidParam('assignmentId'), async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const assignment = await authorization.studentAssignment(studentId, req.params.assignmentId);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found for this student.' });
    const { data: attempts, error } = await supabaseAdmin
      .from('pdf_reading_attempts')
      .select('chunk_index')
      .eq('pdf_assignment_id', assignment.id)
      .eq('student_id', studentId)
      .not('chunk_index', 'is', null);
    if (error) throw error;
    res.json({ status: assignment.status, completedChunkIndexes: (attempts || []).map((row) => row.chunk_index) });
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/pdf-reading/attempt  { assignmentId, chunkIndex, transcript }
// Chunk text and accuracy are intentionally derived from the assigned PDF,
// never received from the browser.
router.post('/pdf-reading/attempt', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { assignmentId, chunkIndex, transcript } = req.body || {};
    if (!isUuid(assignmentId) || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return res.status(400).json({ error: 'A valid assignment and chunk are required.' });
    }
    if (!isBoundedString(transcript, 2000, { allowEmpty: false })) return res.status(400).json({ error: 'A spoken response is required.' });
    const assignment = await authorization.studentAssignment(studentId, assignmentId);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found for this student.' });
    if (['submitted', 'reviewed', 'completed'].includes(assignment.status)) return res.status(409).json({ error: 'This reading activity has already been submitted.' });

    const { data: material, error: materialError } = await supabaseAdmin
      .from('pdf_materials')
      .select('extracted_text, chunk_size')
      .eq('id', assignment.pdf_material_id)
      .maybeSingle();
    if (materialError) throw materialError;
    const targetText = pdfReadingChunks(material?.extracted_text, material?.chunk_size)[chunkIndex];
    if (!targetText) return res.status(400).json({ error: 'The requested reading section was not found.' });

    const score = scoreTranscript(targetText, transcript);
    const { error: insertError } = await supabaseAdmin.from('pdf_reading_attempts').insert({
      pdf_assignment_id: assignment.id,
      student_id: studentId,
      transcript,
      accuracy: score.accuracy,
      chunk_index: chunkIndex,
      chunk_text: targetText,
    });
    if (insertError) throw insertError;
    const { error: statusError } = await supabaseAdmin.from('pdf_assignments')
      .update({ status: 'in_progress' })
      .eq('id', assignment.id)
      .in('status', ['assigned', 'in_progress']);
    if (statusError) throw statusError;
    res.json({ success: true, accuracy: score.accuracy, correct: score.correct });
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/pdf-reading/:assignmentId/submit -- the server verifies every
// authoritative PDF chunk has an attempt before changing assignment state.
router.post('/pdf-reading/:assignmentId/submit', validateUuidParam('assignmentId'), async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const assignment = await authorization.studentAssignment(studentId, req.params.assignmentId);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found for this student.' });
    if (['submitted', 'reviewed', 'completed'].includes(assignment.status)) return res.json({ success: true, alreadySubmitted: true });
    const { data: material, error: materialError } = await supabaseAdmin
      .from('pdf_materials').select('extracted_text, chunk_size').eq('id', assignment.pdf_material_id).maybeSingle();
    if (materialError) throw materialError;
    const chunks = pdfReadingChunks(material?.extracted_text, material?.chunk_size);
    if (!chunks.length) return res.status(400).json({ error: 'This PDF has no readable sections to submit.' });
    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from('pdf_reading_attempts').select('chunk_index').eq('pdf_assignment_id', assignment.id).eq('student_id', studentId).not('chunk_index', 'is', null);
    if (attemptsError) throw attemptsError;
    const completed = new Set((attempts || []).map((row) => row.chunk_index));
    if (!chunks.every((_chunk, index) => completed.has(index))) return res.status(409).json({ error: 'Complete every reading section before submitting.' });
    const { error: submitError } = await supabaseAdmin.from('pdf_assignments')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', assignment.id)
      .in('status', ['assigned', 'in_progress']);
    if (submitError) throw submitError;
    res.json({ success: true, alreadySubmitted: false });
  } catch (err) {
    handleRpcError(res, err);
  }
});

router.get('/lessons/:lessonId/access-url', validateUuidParam('lessonId'), async (req, res) => {
  try {
    await resolveStudentId(req.user.id);
    const { data: lesson, error } = await supabaseAdmin
      .from('lessons')
      .select('id, pdf_url, storage_bucket, storage_path, legacy_public_url, is_published')
      .eq('id', req.params.lessonId)
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    res.json(await materialAccess.accessUrl(lesson));
  } catch (err) {
    handleRpcError(res, err);
  }
});

// POST /student/pdf-drill/attempt  { assignmentId, drillItemId, transcript }
// The browser's speech API provides a transcript only. This route derives the
// score and reward eligibility from the teacher-authored drill item on the server.
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

    const { assignmentId, drillItemId, transcript } = req.body || {};
    if (!isUuid(assignmentId) || !isUuid(drillItemId)) {
      return res.status(400).json({ error: 'assignmentId and drillItemId are required.' });
    }
    if (!isBoundedString(transcript, 2000, { allowEmpty: false })) return res.status(400).json({ error: 'A spoken response is required.' });

    const assignment = await authorization.studentAssignment(studentId, assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found for this student.' });
    }

    const { data: item, error: itemErr } = await supabaseAdmin
      .from('pdf_drill_items')
      .select('id, pdf_material_id, word, xp_value')
      .eq('id', drillItemId)
      .maybeSingle();
    if (itemErr) throw itemErr;
    if (!item || item.pdf_material_id !== assignment.pdf_material_id) {
      return res.status(404).json({ error: 'Drill item not found in this assignment.' });
    }

    const score = scoreTranscript(item.word, transcript);
    const isCorrect = score.correct;

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
      transcript,
      accuracy: score.accuracy,
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

    res.json({ success: true, correct: isCorrect, accuracy: score.accuracy, xpAwarded, newXp, drillCompleted: justCompletedDrill, newlyUnlockedBadges });
  } catch (err) {
    handleRpcError(res, err);
  }
});

module.exports = router;
