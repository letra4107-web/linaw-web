const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { sendMail } = require('../config/mailer');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const BAN_FOREVER = '876000h'; // ~100 years, matches Supabase's convention for an effectively permanent ban
const BAN_LIFT = 'none';

async function notifyUser(userId, title, body, type) {
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title,
    body,
    message: body,
    type,
    is_read: false,
    read: false,
  });
}

// GET /admin/users?role=&status=
router.get('/users', async (req, res) => {
  try {
    const { role, status } = req.query;
    let query = supabaseAdmin
      .from('users')
      .select('id, email, name, role, account_status, is_active, created_at, lastLoginAt')
      .neq('account_status', 'archived')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('account_status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ users: data });
  } catch (err) {
    console.error('[admin/users]', err);
    res.status(500).json({ error: 'Unable to load users.' });
  }
});

// GET /admin/users/archived
router.get('/users/archived', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, archived_at, archived_reason, archived_by')
      .eq('account_status', 'archived')
      .order('archived_at', { ascending: false });
    if (error) throw error;
    res.json({ users: data });
  } catch (err) {
    console.error('[admin/users/archived]', err);
    res.status(500).json({ error: 'Unable to load archived users.' });
  }
});

// POST /admin/users/:id/disable  { reason? }
router.post('/users/:id/disable', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: BAN_FOREVER,
    });
    if (authErr) throw authErr;

    const { error } = await supabaseAdmin
      .from('users')
      .update({ account_status: 'disabled', is_active: false })
      .eq('id', id);
    if (error) throw error;

    await notifyUser(
      id,
      'Na-disable ang iyong account',
      reason || 'Na-disable ng admin ang iyong account. Makipag-ugnayan para sa detalye.',
      'account_disabled',
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[admin/users/:id/disable]', err);
    res.status(500).json({ error: 'Unable to disable this account.' });
  }
});

// POST /admin/users/:id/restore
router.post('/users/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: BAN_LIFT,
    });
    if (authErr) throw authErr;

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        account_status: 'active',
        is_active: true,
        archived_at: null,
        archived_reason: null,
        archived_by: null,
      })
      .eq('id', id);
    if (error) throw error;

    await notifyUser(id, 'Naibalik ang iyong account', 'Maaari ka nang mag-login muli.', 'account_restored');

    res.json({ success: true });
  } catch (err) {
    console.error('[admin/users/:id/restore]', err);
    res.status(500).json({ error: 'Unable to restore this account.' });
  }
});

// POST /admin/users/:id/archive  { reason? }
router.post('/users/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
      ban_duration: BAN_FOREVER,
    });
    if (authErr) throw authErr;

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        account_status: 'archived',
        is_active: false,
        archived_at: new Date().toISOString(),
        archived_reason: reason || null,
        archived_by: req.user.id,
      })
      .eq('id', id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('[admin/users/:id/archive]', err);
    res.status(500).json({ error: 'Unable to archive this account.' });
  }
});

// DELETE /admin/users/:id  -- hard delete, only permitted once already archived (two-step safety)
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from('users')
      .select('account_status')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (!profile || profile.account_status !== 'archived') {
      return res.status(400).json({
        error: 'Only archived accounts can be permanently deleted. Archive it first.',
      });
    }

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authErr) throw authErr;

    await supabaseAdmin.from('users').delete().eq('id', id);

    res.json({ success: true });
  } catch (err) {
    console.error('[admin/users/:id delete]', err);
    res.status(500).json({ error: 'Unable to delete this account.' });
  }
});

// POST /admin/teachers  { email, name, gradeLevels: number[] }
router.post('/teachers', async (req, res) => {
  try {
    const { email, name, gradeLevels } = req.body || {};
    if (!email || !name) return res.status(400).json({ error: 'Email and name are required.' });

    const password = Array.from({ length: 12 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 57)],
    ).join('');

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'teacher', full_name: name },
    });
    if (createErr) throw createErr;

    const teacherId = created.user.id;

    const { error: profileErr } = await supabaseAdmin.from('users').upsert({
      id: teacherId,
      email,
      name,
      role: 'teacher',
      email_verified: true,
      account_status: 'active',
      is_active: true,
    });
    if (profileErr) throw profileErr;

    const cleanGradeLevels = Array.isArray(gradeLevels) ? gradeLevels : [];
    const { error: teacherProfileErr } = await supabaseAdmin.from('teacher_profiles').upsert({
      user_id: teacherId,
      grade_levels: cleanGradeLevels,
    });
    if (teacherProfileErr) throw teacherProfileErr;

    // Auto-roster: every existing student in the teacher's assigned grade levels is
    // linked immediately, so "Mag-aaral Ko" is populated without a manual add step.
    if (cleanGradeLevels.length > 0) {
      const { data: matchingStudents, error: studentsErr } = await supabaseAdmin
        .from('children')
        .select('id')
        .in('grade_level', cleanGradeLevels);
      if (studentsErr) throw studentsErr;
      if (matchingStudents && matchingStudents.length > 0) {
        const { error: linkErr } = await supabaseAdmin.from('teacher_student_links').upsert(
          matchingStudents.map((s) => ({ teacher_id: teacherId, student_id: s.id, assigned_by: req.user.id })),
          { onConflict: 'teacher_id,student_id', ignoreDuplicates: true },
        );
        if (linkErr) throw linkErr;
      }
    }

    await sendMail({
      to: email,
      subject: 'LinawLetra — Naka-gawa na ang Inyong Teacher Account',
      text: `Magandang araw, ${name}!\n\nNakagawa na ang inyong teacher account sa LinawLetra.\n\nEmail: ${email}\nPassword: ${password}\n\nMangyaring mag-log in at palitan agad ang password para sa seguridad. Itago ang detalyeng ito nang lihim.`,
    });

    res.json({ success: true, teacherId });
  } catch (err) {
    console.error('[admin/teachers create]', err);
    res.status(500).json({ error: 'Unable to create this teacher account.' });
  }
});

// GET /admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    const [{ data: children }, { data: users }, { data: progress }, { data: sessions }] = await Promise.all([
      supabaseAdmin.from('children').select('id, grade_level, created_at'),
      supabaseAdmin.from('users').select('id, role, account_status, created_at, lastLoginAt'),
      supabaseAdmin.from('child_progress').select('achievements, xp, streak'),
      supabaseAdmin.from('pronunciation_practice_sessions').select('id, created_at, is_correct'),
    ]);

    const enrollmentByMonth = {};
    for (const c of children || []) {
      const key = String(c.created_at).slice(0, 7);
      enrollmentByMonth[key] = (enrollmentByMonth[key] || 0) + 1;
    }

    const roleCounts = {};
    for (const u of users || []) {
      roleCounts[u.role || 'unknown'] = (roleCounts[u.role || 'unknown'] || 0) + 1;
    }

    const usageByMonth = {};
    for (const s of sessions || []) {
      const key = String(s.created_at).slice(0, 7);
      usageByMonth[key] = (usageByMonth[key] || 0) + 1;
    }

    const totalXp = (progress || []).reduce((sum, p) => sum + (p.xp || 0), 0);
    const badgeUnlockCount = (progress || []).reduce((sum, p) => {
      const achievements = p.achievements;
      if (Array.isArray(achievements)) return sum + achievements.length;
      if (achievements && typeof achievements === 'object') return sum + Object.keys(achievements).length;
      return sum;
    }, 0);

    res.json({
      enrollmentTrend: Object.entries(enrollmentByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      usageTrend: Object.entries(usageByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      roleCounts,
      totals: {
        children: (children || []).length,
        users: (users || []).length,
        totalXp,
        badgeUnlockCount,
        practiceSessions: (sessions || []).length,
      },
    });
  } catch (err) {
    console.error('[admin/analytics]', err);
    res.status(500).json({ error: 'Unable to load analytics.' });
  }
});

module.exports = router;
