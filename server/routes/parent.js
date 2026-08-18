const express = require('express');
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');
const { sendMail } = require('../config/mailer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { buildReadingProfile } = require('../services/readingInsights');
const { loadCompletedContentIds } = require('../services/readingProfileData');

const router = express.Router();
router.use(requireAuth, requireRole('parent'));

// Mirrors mobile's backend/routes/auth.js difficultyFromGrade -- keep these in sync.
const difficultyFromGrade = (gradeLevel) => {
  if (gradeLevel <= 2) return 'Beginner';
  if (gradeLevel <= 4) return 'Intermediate';
  return 'Advanced';
};

const escapeIlikePattern = (value) => String(value || '').replace(/[\\%_]/g, (match) => `\\${match}`);

const makeStudentUsernameBase = (name) => {
  const parts = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0] || 'bata';
  const last = parts.length > 1 ? parts[parts.length - 1] : first;
  return `${first[0] || 'b'}${last}`.replace(/\s+/g, '');
};

const getAvailableStudentUsername = async (name) => {
  const base = makeStudentUsernameBase(name);
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = `${base}${suffix === 0 ? '' : suffix + 1}@linawletra.edu.ph`;
    const { data, error } = await supabaseAdmin.from('children').select('id').eq('username', candidate).maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  return `${base}${Date.now()}@linawletra.edu.ph`;
};

const STUDENT_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const makeStudentPassword = () =>
  Array.from({ length: 10 }, () => STUDENT_PASSWORD_CHARS[Math.floor(Math.random() * STUDENT_PASSWORD_CHARS.length)]).join('');

// POST /parent/children  { childName, gradeLevel }
router.post('/children', async (req, res) => {
  let createdAuthUid = null;
  try {
    const parentId = req.user.id;
    const parentEmail = req.user.email;
    const { childName, gradeLevel } = req.body || {};
    const cleanName = String(childName || '').trim();
    const finalGradeLevel = Number(gradeLevel);

    if (!parentEmail || cleanName.length < 2 || !Number.isInteger(finalGradeLevel) || finalGradeLevel < 1 || finalGradeLevel > 6) {
      return res.status(400).json({ error: 'Kailangan ng pangalan at grade level (1-6).' });
    }

    const { data: existingEnrollment, error: existingErr } = await supabaseAdmin
      .from('children')
      .select('id')
      .eq('parent_id', parentId)
      .eq('grade_level', finalGradeLevel)
      .ilike('name', escapeIlikePattern(cleanName))
      .limit(1)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existingEnrollment) {
      return res.status(409).json({ error: 'Naka-enroll na ang mag-aaral na ito sa grade level na ito.' });
    }

    // Reading level auto-defaults from grade -- never left unset/manual.
    const level = difficultyFromGrade(finalGradeLevel);
    const authEmail = await getAvailableStudentUsername(cleanName);
    const password = makeStudentPassword();

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      user_metadata: { displayName: cleanName, role: 'student', parentId },
      email_confirm: true,
    });
    if (createErr) throw createErr;
    createdAuthUid = created.user.id;

    const { data: childRow, error: childErr } = await supabaseAdmin
      .from('children')
      .insert({
        parent_id: parentId,
        name: cleanName,
        grade_level: finalGradeLevel,
        username: authEmail,
        auth_uid: createdAuthUid,
      })
      .select()
      .single();
    if (childErr) throw childErr;

    const { error: profileErr } = await supabaseAdmin.from('users').upsert({
      id: createdAuthUid,
      name: cleanName,
      email: authEmail,
      role: 'student',
      parent_id: parentId,
      email_verified: true,
    });
    if (profileErr) throw profileErr;

    const { error: progressErr } = await supabaseAdmin.from('child_progress').insert({
      child_id: childRow.id,
      level,
      xp: 0,
      streak: 0,
      completed_words: [],
      total_attempts: 0,
      achievements: [],
      badges: [],
    });
    if (progressErr) throw progressErr;

    if (level !== 'Beginner') {
      const { error: overrideErr } = await supabaseAdmin.from('student_reading_level_overrides').insert({
        student_id: childRow.id,
        override_level: level,
        reason: `Automatic grade placement: Grade ${finalGradeLevel}`,
        created_by_auth_uid: parentId,
      });
      if (overrideErr) throw overrideErr;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { error: credentialsErr } = await supabaseAdmin.from('child_credentials').insert({
      child_id: childRow.id,
      username: authEmail,
      hashed_password: hashedPassword,
      plain_password: password,
      sent_at: new Date().toISOString(),
    });
    if (credentialsErr) throw credentialsErr;

    // Auto-roster: link this new student to every teacher already assigned to this grade level.
    const { data: matchingTeachers, error: teachersErr } = await supabaseAdmin
      .from('teacher_profiles')
      .select('user_id')
      .contains('grade_levels', [finalGradeLevel]);
    if (teachersErr) throw teachersErr;
    if (matchingTeachers && matchingTeachers.length > 0) {
      const { error: linkErr } = await supabaseAdmin.from('teacher_student_links').upsert(
        matchingTeachers.map((t) => ({ teacher_id: t.user_id, student_id: childRow.id, assigned_by: parentId })),
        { onConflict: 'teacher_id,student_id', ignoreDuplicates: true },
      );
      if (linkErr) throw linkErr;
    }

    await sendMail({
      to: parentEmail,
      subject: 'LinawLetra — Naka-enroll na ang Inyong Anak',
      text: `Magandang araw!\n\nNaka-enroll na si ${cleanName} sa LinawLetra (Grade ${finalGradeLevel}, ${level} na reading level).\n\nUsername: ${authEmail}\nPassword: ${password}\n\nItago ang detalyeng ito.`,
    });

    res.json({ success: true, child: childRow, level, username: authEmail, temporaryPassword: password });
  } catch (err) {
    console.error('[parent/children create]', err);
    if (createdAuthUid) {
      await supabaseAdmin.from('children').delete().eq('auth_uid', createdAuthUid);
      await supabaseAdmin.from('users').delete().eq('id', createdAuthUid);
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUid).catch(() => {});
    }
    res.status(500).json({ error: err.message || 'Hindi na-enroll ang bata.' });
  }
});

// POST /parent/children/:id/reading-level  { level, reason? }
// student_reading_level_overrides is SELECT-only for clients (server-owned),
// so changing a child's placement has to go through here even though it's a
// parent-initiated action.
router.post('/children/:id/reading-level', async (req, res) => {
  try {
    const { id } = req.params;
    const { level, reason } = req.body || {};
    const allowed = ['Beginner', 'Intermediate', 'Advanced'];
    if (!allowed.includes(level)) {
      return res.status(400).json({ error: 'Invalid reading level.' });
    }

    const { data: child, error: childErr } = await supabaseAdmin
      .from('children')
      .select('id, parent_id')
      .eq('id', id)
      .maybeSingle();
    if (childErr) throw childErr;
    if (!child || child.parent_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your child account.' });
    }

    const { data: activeOverride, error: activeErr } = await supabaseAdmin
      .from('student_reading_level_overrides')
      .select('id')
      .eq('student_id', id)
      .is('revoked_at', null)
      .maybeSingle();
    if (activeErr) throw activeErr;

    if (activeOverride) {
      const { error: revokeErr } = await supabaseAdmin
        .from('student_reading_level_overrides')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by_auth_uid: req.user.id,
          revocation_reason: 'Replaced by a new parent-set reading level.',
        })
        .eq('id', activeOverride.id);
      if (revokeErr) throw revokeErr;
    }

    const { error: insertErr } = await supabaseAdmin.from('student_reading_level_overrides').insert({
      student_id: id,
      override_level: level,
      reason: reason?.trim() || 'Manually set by parent.',
      created_by_auth_uid: req.user.id,
    });
    if (insertErr) throw insertErr;

    res.json({ success: true });
  } catch (err) {
    console.error('[parent/children/:id/reading-level]', err);
    res.status(500).json({ error: err.message || 'Unable to update reading level.' });
  }
});

// GET /parent/children/:id/reading-profile
// Same computation as GET /student/reading-profile, scoped to one of this
// parent's own children (ownership re-checked here, not just trusted from
// the URL param).
router.get('/children/:id/reading-profile', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: child, error: childErr } = await supabaseAdmin
      .from('children')
      .select('id, name, parent_id')
      .eq('id', id)
      .maybeSingle();
    if (childErr) throw childErr;
    if (!child || child.parent_id !== req.user.id) {
      return res.status(404).json({ error: 'Child not found for this parent.' });
    }

    const [sessionsResult, confusionsResult, completions] = await Promise.all([
      supabaseAdmin
        .from('pronunciation_practice_sessions')
        .select('id,word,spoken_text,accuracy_percentage,is_correct,duration_seconds,practice_source,created_at')
        .eq('student_id', child.id)
        .order('created_at', { ascending: true })
        .limit(500),
      supabaseAdmin
        .from('phoneme_confusion')
        .select('confusion_key,target_word,source,created_at')
        .eq('student_id', child.id)
        .order('created_at', { ascending: true })
        .limit(1000),
      loadCompletedContentIds(supabaseAdmin, child.id),
    ]);
    if (sessionsResult.error) throw sessionsResult.error;
    if (confusionsResult.error) throw confusionsResult.error;

    const profile = buildReadingProfile({
      sessions: sessionsResult.data || [],
      confusions: confusionsResult.data || [],
      completions: completions.map((content_id) => ({ content_id })),
    });
    res.json({ student: { id: child.id, name: child.name }, profile });
  } catch (err) {
    console.error('[parent/children/:id/reading-profile]', err);
    res.status(500).json({ error: err.message || 'Unable to build the reading profile.' });
  }
});

const STUDENT_ACCESSIBILITY_DEFAULTS = {
  dyslexia_font: true,
  font_size: 'medium',
  high_contrast: false,
  reading_guide: false,
  tts_enabled: true,
};

const loadOwnedChild = async (childId, parentId) => {
  const { data: child, error } = await supabaseAdmin
    .from('children')
    .select('id, name, parent_id, auth_uid')
    .eq('id', childId)
    .maybeSingle();
  if (error) throw error;
  if (!child || child.parent_id !== parentId) return null;
  return child;
};

// GET /parent/children/:id/settings
// student_settings RLS only allows a student's own auth session to read/write
// their row -- there's no parent-facing policy, so this (and the PATCH below)
// go through the service-role client with ownership re-checked via `children`.
router.get('/children/:id/settings', async (req, res) => {
  try {
    const child = await loadOwnedChild(req.params.id, req.user.id);
    if (!child) return res.status(404).json({ error: 'Child not found for this parent.' });
    if (!child.auth_uid) return res.status(409).json({ error: 'Ang batang ito ay wala pang student login.' });

    const { data, error } = await supabaseAdmin
      .from('student_settings')
      .select('dyslexia_font, font_size, high_contrast, reading_guide, tts_enabled')
      .eq('auth_uid', child.auth_uid)
      .maybeSingle();
    if (error) throw error;
    if (data) return res.json({ settings: { ...STUDENT_ACCESSIBILITY_DEFAULTS, ...data } });

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('student_settings')
      .insert({ auth_uid: child.auth_uid, ...STUDENT_ACCESSIBILITY_DEFAULTS })
      .select('dyslexia_font, font_size, high_contrast, reading_guide, tts_enabled')
      .single();
    if (insertErr) throw insertErr;
    res.json({ settings: inserted });
  } catch (err) {
    console.error('[parent/children/:id/settings get]', err);
    res.status(500).json({ error: err.message || 'Unable to load accessibility settings.' });
  }
});

// PATCH /parent/children/:id/settings  { dyslexia_font?, font_size?, high_contrast?, reading_guide?, tts_enabled? }
router.patch('/children/:id/settings', async (req, res) => {
  try {
    const child = await loadOwnedChild(req.params.id, req.user.id);
    if (!child) return res.status(404).json({ error: 'Child not found for this parent.' });
    if (!child.auth_uid) return res.status(409).json({ error: 'Ang batang ito ay wala pang student login.' });

    const patch = {};
    for (const key of Object.keys(STUDENT_ACCESSIBILITY_DEFAULTS)) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }

    const { data, error } = await supabaseAdmin
      .from('student_settings')
      .upsert({ auth_uid: child.auth_uid, ...patch }, { onConflict: 'auth_uid' })
      .select('dyslexia_font, font_size, high_contrast, reading_guide, tts_enabled')
      .single();
    if (error) throw error;
    res.json({ settings: data });
  } catch (err) {
    console.error('[parent/children/:id/settings patch]', err);
    res.status(500).json({ error: err.message || 'Unable to update accessibility settings.' });
  }
});

module.exports = router;
