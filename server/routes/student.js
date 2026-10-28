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
const { evaluateLevelPromotion } = require('../services/learningProgression');
const { randomUUID } = require('crypto');
const { recordWordOfDayAttempt } = require('../services/wordOfDayAttempt');
const {startProgressEvent,recordProgressEvent,requireProgressContract}=require('../services/progressEvents');

const router = express.Router();
const authorization = createSupabaseAuthorizationService(supabaseAdmin);
const materialAccess = createMaterialAccessService(supabaseAdmin);

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

// The database RPC remains the source of truth for module completion. Once it
// reports a whole level as complete, this server-owned check promotes the
// learner only if their recorded average also meets the passing score.
function handleRpcError(res, err) {
  console.error('[student rpc]', err);
  const status = err.status || (err.code === '42501' ? 403 : err.code === 'P0002' ? 404 : ['PT409','40001','40P01'].includes(err.code) ? 409 : ['PGRST202','42883','42703'].includes(err.code) ? 503 : 500);
  const messages = {
    400: 'Invalid student request.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested student resource was not found.',
    409:'Saved progress changed. Retry the same attempt or refresh.',
    503:'Saving rewards is temporarily unavailable. Retry the same attempt later.',
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
router.post('/progress/events/start',async(req,res)=>{try{const id=await resolveStudentId(req.user.id);res.json(await startProgressEvent(supabaseAdmin,id,req.body,'web'));}catch(error){handleRpcError(res,error);}});
router.post('/progress/events/:eventId',async(req,res)=>{try{const id=await resolveStudentId(req.user.id);res.json(await recordProgressEvent(supabaseAdmin,id,req.params.eventId,req.body));}catch(error){handleRpcError(res,error);}});
router.post('/learn/content/:contentId/attempt',validateUuidParam('contentId'),(req,res)=>res.status(400).json({error:'Use a server-issued learning attempt. Client completion claims are not accepted.'}));

// Staging-only pilot for moving a contained practice flow from client-scored to
// server-scored. It is deliberately not a replacement for the established
// route above until score comparisons and rollout evidence are reviewed.
router.post('/learn/content/:contentId/authoritative-attempt',(req,res)=>res.status(400).json({error:'Use a server-issued learning attempt.'}));

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
    await requireProgressContract(supabaseAdmin);
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
    if (!Array.isArray(responses) || responses.length > 100 || responses.some((response) => !isUuid(response?.assessment_item_id) || !isUuid(response?.content_attempt_id))) {
      return res.status(400).json({ error: 'Invalid assessment responses.' });
    }
    await requireProgressContract(supabaseAdmin);
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
router.post('/learn/module/:moduleId/nonsense-check/submit',validateUuidParam('moduleId'),(req,res)=>res.status(503).json({error:'This reading check cannot save rewards yet. Please try again later.'}));

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
router.post('/practice/attempt',(req,res)=>res.status(400).json({error:'Use a server-issued learning attempt.'}));

// Completion, reward, streak and attempt receipt must commit together in the
// dedicated service-only RPC. The SQL proposal is review-only; if it has not
// been approved/installed, return a safe retryable error without partial writes.
router.get('/word-of-day',async(req,res)=>{try{const id=await resolveStudentId(req.user.id);res.json({success:true,log:await require('../services/wordOfDayInitialization').loadWordOfDay(supabaseAdmin,id)});}catch(error){handleRpcError(res,error);}});
router.post('/word-of-day/attempt', async (req, res) => {
  try {
    const studentId = await resolveStudentId(req.user.id);
    const { logId, attempts, transcript } = req.body || {};
    const result = await recordWordOfDayAttempt(supabaseAdmin, { studentId, logId, attempts, transcript });
    res.json(result);
  } catch (error) {
    if (error.publicMessage) return res.status(error.status).json({ error: error.publicMessage });
    handleRpcError(res, error);
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
router.post('/pdf-drill/attempt',(req,res)=>res.status(503).json({error:'PDF reading rewards are temporarily unavailable. Your saved progress is safe.'}));

module.exports = router;
