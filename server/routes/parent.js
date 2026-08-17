const express = require('express');
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');
const { sendMail } = require('../config/mailer');
const { requireAuth, requireRole } = require('../middleware/auth');

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

module.exports = router;
