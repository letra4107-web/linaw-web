const express = require('express');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { sendMail } = require('../config/mailer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateUuidParam, isGrade, isBoundedString } = require('../lib/validation');
const { summarizeCredentialSecurity } = require('../services/credentialSecurity');
const { storageReadiness } = require('../services/storageMigration');
const { platformFor } = require('../services/audit');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// Read-only operational visibility for parent/teacher work.  This is separate
// from the audit trail: it shows the current business records, not merely the
// request that created or changed them.
router.get('/operations', async (_req, res) => {
  try {
    const [schedules, messages, materials, assignments, links, progress, children, users, readingLevels, studentSettings] = await Promise.all([
      supabaseAdmin.from('scheduled_activities').select('id, child_id, created_by, created_by_auth_uid, activity_type, title, scheduled_date, status').order('scheduled_date', { ascending: false }).limit(100),
      supabaseAdmin.from('teacher_messages').select('id, teacher_id, parent_id, child_id, message, read, created_at').order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('pdf_materials').select('id, teacher_id, title, grade_level, level, created_at').order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('pdf_assignments').select('id, pdf_material_id, student_id, assigned_by, status, assigned_at, due_date').order('assigned_at', { ascending: false }).limit(100),
      supabaseAdmin.from('teacher_student_links').select('id, teacher_id, student_id, assigned_at').order('assigned_at', { ascending: false }).limit(100),
      supabaseAdmin.from('child_progress').select('child_id, xp, streak, activities_completed, updated_at').order('updated_at', { ascending: false }).limit(100),
      supabaseAdmin.from('children').select('id, name, parent_id'),
      supabaseAdmin.from('users').select('id, name, role'),
      supabaseAdmin.from('student_reading_level_overrides').select('id, student_id, override_level, reason, created_by_auth_uid, created_at, revoked_at').is('revoked_at', null).order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('student_settings').select('auth_uid, dyslexia_font, font_size, high_contrast, reading_guide, tts_enabled'),
    ]);
    for (const result of [schedules, messages, materials, assignments, links, progress, children, users, readingLevels, studentSettings]) if (result.error) throw result.error;
    const names = Object.fromEntries((users.data || []).map((user) => [user.id, user.name || user.id]));
    const childRows = Object.fromEntries((children.data || []).map((child) => [child.id, { name: child.name || child.id, parent: child.parent_id ? names[child.parent_id] || child.parent_id : null }]));
    res.json({ schedules: schedules.data || [], messages: messages.data || [], materials: materials.data || [], assignments: assignments.data || [], rosterLinks: links.data || [], progress: progress.data || [], readingLevels: readingLevels.data || [], studentSettings: studentSettings.data || [], names, children: childRows });
  } catch (err) {
    console.error('[admin/operations]', err);
    res.status(500).json({ error: 'Unable to load operational records.' });
  }
});

// GET /admin/audit-logs?search=&role=&action=&module=&status=&from=&to=&page=
router.get('/audit-logs', async (req, res) => {
  try {
    const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
    const pageSize = Math.max(10, Math.min(100, Number(req.query.pageSize) || 25));
    const ascending = req.query.order === 'asc';
    let query = supabaseAdmin.from('audit_logs').select('id, actor_id, actor_role, actor_name, action, module, record_id, status, metadata, created_at', { count: 'exact' }).order('created_at', { ascending });
    // `role` is the public filter name; retain actor_role for older callers.
    const role = String(req.query.role || req.query.actor_role || '').trim().toLowerCase();
    if (['admin', 'parent', 'teacher', 'student', 'system'].includes(role)) query = query.eq('actor_role', role);
    for (const field of ['action', 'module', 'status']) if (req.query[field]) query = query.eq(field, String(req.query[field]).slice(0, 160));
    if (req.query.from) query = query.gte('created_at', String(req.query.from));
    if (req.query.to) query = query.lte('created_at', `${String(req.query.to)}T23:59:59.999Z`);
    if (req.query.search) query = query.or(`actor_name.ilike.%${String(req.query.search).replace(/[%_,()]/g, '')}%,action.ilike.%${String(req.query.search).replace(/[%_,()]/g, '')}%`);
    const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    res.json({ logs: data || [], total: count || 0, page, pageSize });
  } catch (err) {
    console.error('[admin/audit-logs]', err);
    res.status(500).json({ error: 'Unable to load audit logs.' });
  }
});

// Admin-only, role-specific monitoring based on real account and audit data.
// This deliberately excludes credentials, tokens, transcripts, and raw content.
router.get('/monitoring/users', async (req, res) => {
  try {
    const role = String(req.query.role || '').toLowerCase();
    if (!['student', 'parent', 'teacher'].includes(role)) return res.status(400).json({ error: 'Invalid monitoring role.' });
    const [{ data: users, error: usersError }, { data: children, error: childrenError }, { data: teacherProfiles, error: teacherProfilesError }] = await Promise.all([
      supabaseAdmin.from('users').select('id, name, email, role, account_status, created_at, lastLoginAt').eq('role', role).neq('account_status', 'archived').order('name'),
      supabaseAdmin.from('children').select('id, auth_uid, parent_id, name, grade_level'),
      role === 'teacher' ? supabaseAdmin.from('teacher_profiles').select('user_id, grade_levels') : Promise.resolve({ data: [], error: null }),
    ]);
    if (usersError || childrenError || teacherProfilesError) throw usersError || childrenError || teacherProfilesError;
    const ids = (users || []).map((user) => user.id);
    const { data: activities, error: activitiesError } = ids.length
      ? await supabaseAdmin.from('audit_logs').select('id, actor_id, action, module, record_id, status, metadata, created_at').in('actor_id', ids).order('created_at', { ascending: false }).limit(500)
      : { data: [], error: null };
    if (activitiesError) throw activitiesError;
    const childrenByParent = new Map(); const childByAuth = new Map(); const teacherProfileByUser = new Map((teacherProfiles || []).map((profile) => [profile.user_id, profile]));
    for (const child of children || []) {
      childByAuth.set(child.auth_uid, child);
      if (child.parent_id) childrenByParent.set(child.parent_id, [...(childrenByParent.get(child.parent_id) || []), child]);
    }
    res.json({ users: (users || []).map((user) => {
      const child = childByAuth.get(user.id); const ownedChildren = childrenByParent.get(user.id) || [];
      return {
        ...user,
        profile: role === 'student' ? { childId: child?.id || null, gradeLevel: child?.grade_level || null } : role === 'parent' ? { children: ownedChildren.map((item) => ({ id: item.id, name: item.name, gradeLevel: item.grade_level })) } : { gradeLevels: teacherProfileByUser.get(user.id)?.grade_levels || [] },
        activities: (activities || []).filter((item) => item.actor_id === user.id).slice(0, 30),
      };
    }) });
  } catch (err) {
    console.error('[admin/monitoring/users]', err);
    res.status(500).json({ error: 'Unable to load role monitoring.' });
  }
});

// Admin-only read model for an individual account. This deliberately reuses the
// live progress, relationship, and activity records used by each role's own UI.
router.get('/monitoring/users/:id', validateUuidParam('id'), async (req, res) => {
  try {
    const { data: user, error: userError } = await supabaseAdmin.from('users').select('id, name, email, role, account_status, lastLoginAt, created_at').eq('id', req.params.id).maybeSingle();
    if (userError) throw userError;
    if (!user || !['student', 'parent', 'teacher'].includes(user.role)) return res.status(404).json({ error: 'Monitored account not found.' });
    const { data: activity, error: activityError } = await supabaseAdmin.from('audit_logs').select('id, action, module, status, metadata, created_at').eq('actor_id', user.id).order('created_at', { ascending: false }).limit(50);
    if (activityError) throw activityError;
    if (user.role === 'student') {
      const [{ data: child, error: childError }, { data: progress, error: progressError }] = await Promise.all([supabaseAdmin.from('children').select('id, name, grade_level, parent_id').eq('auth_uid', user.id).maybeSingle(), supabaseAdmin.from('children').select('id').eq('auth_uid', user.id).maybeSingle()]);
      if (childError || progressError) throw childError || progressError;
      const [{ data: summary, error: summaryError }, { data: sessions, error: sessionsError }, modulesResult] = await Promise.all([child ? supabaseAdmin.from('child_progress').select('level, xp, streak, accuracy_sum, total_attempts, activities_completed, updated_at').eq('child_id', child.id).maybeSingle() : Promise.resolve({ data: null, error: null }), child ? supabaseAdmin.from('pronunciation_practice_sessions').select('word, accuracy_percentage, is_correct, created_at').eq('student_id', child.id).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }), child ? supabaseAdmin.rpc('get_student_module_path', { p_student_id: child.id }) : Promise.resolve({ data: null, error: null })]);
      if (summaryError || sessionsError || modulesResult.error) throw summaryError || sessionsError || modulesResult.error;
      return res.json({ user, child, progress: summary, modules: modulesResult.data?.modules || [], sessions: sessions || [], activity: activity || [] });
    }
    if (user.role === 'parent') {
      const { data: children, error } = await supabaseAdmin.from('children').select('id, name, grade_level').eq('parent_id', user.id); if (error) throw error;
      const ids = (children || []).map((child) => child.id); const { data: progress, error: progressError2 } = ids.length ? await supabaseAdmin.from('child_progress').select('child_id, level, xp, activities_completed, updated_at').in('child_id', ids) : { data: [], error: null }; if (progressError2) throw progressError2;
      return res.json({ user, children: children || [], progress: progress || [], activity: activity || [] });
    }
    const [{ data: links, error: linksError }, { data: materials, error: materialsError }, { data: assignments, error: assignmentsError }, { data: sections, error: sectionsError }] = await Promise.all([supabaseAdmin.from('teacher_student_links').select('student_id, assigned_at').eq('teacher_id', user.id), supabaseAdmin.from('pdf_materials').select('id, title, grade_level, level, created_at').eq('teacher_id', user.id).order('created_at', { ascending: false }).limit(30), supabaseAdmin.from('pdf_assignments').select('id, student_id, status, assigned_at').eq('assigned_by', user.id).order('assigned_at', { ascending: false }).limit(30), supabaseAdmin.from('class_sections').select('id, name, grade_level, is_reading_support').eq('adviser_id', user.id).order('grade_level').order('name')]);
    if (linksError || materialsError || assignmentsError || sectionsError) throw linksError || materialsError || assignmentsError || sectionsError;
    const sectionIds = (sections || []).map((section) => section.id);
    const { data: memberships, error: membershipsError } = sectionIds.length ? await supabaseAdmin.from('section_students').select('section_id').in('section_id', sectionIds) : { data: [], error: null };
    if (membershipsError) throw membershipsError;
    const studentCounts = (memberships || []).reduce((counts, membership) => ({ ...counts, [membership.section_id]: (counts[membership.section_id] || 0) + 1 }), {});
    return res.json({ user, roster: links || [], materials: materials || [], assignments: assignments || [], sections: (sections || []).map((section) => ({ ...section, studentCount: studentCounts[section.id] || 0 })), activity: activity || [] });
  } catch (err) { console.error('[admin/monitoring/user detail]', err); res.status(500).json({ error: 'Unable to load monitoring details.' }); }
});

// Private admin notes for a student account. These are intentionally never
// exposed to student, parent, or teacher APIs.
router.get('/monitoring/users/:id/notes', validateUuidParam('id'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('admin_student_notes')
      .select('id, content, created_at, author_id')
      .eq('student_id', req.params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ notes: data || [] });
  } catch (err) {
    console.error('[admin/student notes list]', err);
    res.status(500).json({ error: 'Unable to load student notes.' });
  }
});

router.post('/monitoring/users/:id/notes', validateUuidParam('id'), async (req, res) => {
  try {
    const content = String(req.body?.content || '').trim();
    if (!isBoundedString(content, 1000, { allowEmpty: false })) return res.status(400).json({ error: 'Note must be between 1 and 1,000 characters.' });
    const { data: student, error: studentError } = await supabaseAdmin.from('users').select('id').eq('id', req.params.id).eq('role', 'student').maybeSingle();
    if (studentError) throw studentError;
    if (!student) return res.status(404).json({ error: 'Student account not found.' });
    const { data, error } = await supabaseAdmin.from('admin_student_notes').insert({ student_id: student.id, author_id: req.user.id, content }).select('id, content, created_at, author_id').single();
    if (error) throw error;
    res.status(201).json({ note: data });
  } catch (err) {
    console.error('[admin/student notes create]', err);
    res.status(500).json({ error: 'Unable to save student note.' });
  }
});

router.delete('/monitoring/users/:id/notes/:noteId', validateUuidParam('id'), validateUuidParam('noteId'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('admin_student_notes').delete().eq('id', req.params.noteId).eq('student_id', req.params.id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Student note not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/student notes delete]', err);
    res.status(500).json({ error: 'Unable to delete student note.' });
  }
});

const BAN_FOREVER = '876000h'; // ~100 years, matches Supabase's convention for an effectively permanent ban
const BAN_LIFT = 'none';
const USER_ROLES = new Set(['admin', 'teacher', 'parent', 'student']);
const ACCOUNT_STATUSES = new Set(['active', 'disabled', 'archived']);

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
    if (role && !USER_ROLES.has(String(role))) return res.status(400).json({ error: 'Invalid role filter.' });
    if (status && !ACCOUNT_STATUSES.has(String(status))) return res.status(400).json({ error: 'Invalid status filter.' });
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

// Aggregate only: never return credential rows, hashes, usernames, or passwords.
router.get('/credential-security', async (_req, res) => {
  try {
    const [{ count, error: childrenError }, { data: rows, error: credentialsError }] = await Promise.all([
      supabaseAdmin.from('children').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('child_credentials').select('child_id, plain_password, password_rotated_at, plaintext_retired_at'),
    ]);
    if (childrenError) throw childrenError;
    if (credentialsError) throw credentialsError;
    res.json({ credentials: summarizeCredentialSecurity(count || 0, rows || []) });
  } catch (err) {
    console.error('[admin/credential-security]', err);
    res.status(500).json({ error: 'Unable to load credential security status.' });
  }
});

router.get('/storage-readiness', async (_req, res) => {
  try {
    const [materials, lessons, uploads] = await Promise.all([
      supabaseAdmin.from('pdf_materials').select('id, storage_path, file_url'),
      supabaseAdmin.from('lessons').select('id, storage_path, pdf_url'),
      supabaseAdmin.from('teacher_uploads').select('id, storage_path, path'),
    ]);
    for (const result of [materials, lessons, uploads]) if (result.error) throw result.error;
    res.json({
      readingMaterials: storageReadiness(materials.data || []),
      lessons: storageReadiness(lessons.data || []),
      teacherUploads: storageReadiness(uploads.data || []),
      signedUrlsEnabled: process.env.STORAGE_SIGNED_URLS_ENABLED === 'true',
      privateBucketReady: false,
      note: 'Private buckets remain blocked until mobile access-endpoint migration and a zero/approved public dependency count are verified.',
    });
  } catch (err) {
    console.error('[admin/storage-readiness]', err);
    res.status(500).json({ error: 'Unable to load storage readiness.' });
  }
});

// POST /admin/users/:id/disable  { reason? }
router.post('/users/:id/disable', validateUuidParam('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    if (reason != null && !isBoundedString(reason, 500)) return res.status(400).json({ error: 'Reason is too long.' });

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
router.post('/users/:id/restore', validateUuidParam('id'), async (req, res) => {
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
router.post('/users/:id/archive', validateUuidParam('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    if (reason != null && !isBoundedString(reason, 500)) return res.status(400).json({ error: 'Reason is too long.' });

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
router.delete('/users/:id', validateUuidParam('id'), async (req, res) => {
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
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(name || '').trim();
    const cleanGradeLevels = Array.isArray(gradeLevels) ? [...new Set(gradeLevels.map(Number))] : [];
    if (!isBoundedString(cleanName, 100, { allowEmpty: false }) || !/^\S+@\S+\.\S+$/.test(cleanEmail) || cleanEmail.length > 254) {
      return res.status(400).json({ error: 'A valid email and name are required.' });
    }
    if (!cleanGradeLevels.length || cleanGradeLevels.some((grade) => !isGrade(grade))) {
      return res.status(400).json({ error: 'Choose at least one valid grade from 1 to 6.' });
    }

    const password = Array.from({ length: 12 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[crypto.randomInt(57)],
    ).join('');

    // `createUser` deliberately does not send a confirmation message. Generate
    // a signup OTP instead so a new teacher must prove control of their email
    // before the account can be used.
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: cleanEmail,
      password,
      options: { data: { role: 'teacher', full_name: cleanName } },
    });
    if (createErr) throw createErr;

    const teacherId = created.user.id;
    const verificationCode = created.properties?.email_otp;
    if (!verificationCode) throw new Error('Unable to generate the teacher email verification code.');

    const { error: profileErr } = await supabaseAdmin.from('users').upsert({
      id: teacherId,
      email: cleanEmail,
      name: cleanName,
      role: 'teacher',
      email_verified: false,
      account_status: 'active',
      is_active: true,
    });
    if (profileErr) throw profileErr;

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
      to: cleanEmail,
      subject: 'LinawLetra — I-verify ang Inyong Teacher Account',
      text: `Magandang araw, ${cleanName}!\n\nNakagawa na ang inyong teacher account sa LinawLetra.\n\nEmail: ${cleanEmail}\nTemporary password: ${password}\nVerification code: ${verificationCode}\n\nMag-login gamit ang email at temporary password, pagkatapos ay ilagay ang verification code para ma-activate ang account. Mangyaring palitan agad ang password para sa seguridad. Itago ang detalyeng ito nang lihim.`,
    });

    res.json({ success: true, teacherId });
  } catch (err) {
    console.error('[admin/teachers create]', err);
    res.status(500).json({ error: 'Unable to create this teacher account.' });
  }
});

// GET /admin/analytics/students -- the Admin-only drill-down behind the
// Student Accounts metric. It returns account details and progress together,
// without exposing credentials or private speech transcripts.
// Sections are admin-owned. A regular section is capped at 35; a reading
// support group defaults to 12 and is capped at 15.
router.get('/sections', async (_req, res) => {
  try {
    const [{ data: sections, error: sectionsError }, { data: teachers, error: teachersError }, { data: memberships, error: membershipsError }] = await Promise.all([
      supabaseAdmin.from('class_sections').select('id, name, grade_level, adviser_id, capacity, is_reading_support, created_at').order('grade_level').order('name'),
      supabaseAdmin.from('users').select('id, name, email').eq('role', 'teacher').order('name'),
      supabaseAdmin.from('section_students').select('section_id, student_id'),
    ]);
    if (sectionsError || teachersError || membershipsError) throw sectionsError || teachersError || membershipsError;
    const counts = (memberships || []).reduce((result, row) => ({ ...result, [row.section_id]: (result[row.section_id] || 0) + 1 }), {});
    res.json({ sections: (sections || []).map((section) => ({ ...section, studentCount: counts[section.id] || 0 })), teachers: teachers || [] });
  } catch (err) { console.error('[admin/sections]', err); res.status(500).json({ error: 'Unable to load sections.' }); }
});

router.post('/sections', async (req, res) => {
  try {
    const { name, gradeLevel, adviserId, isReadingSupport = false } = req.body || {};
    const cleanName = String(name || '').trim(); const grade = Number(gradeLevel);
    if (!isBoundedString(cleanName, 80, { allowEmpty: false }) || !isGrade(grade)) return res.status(400).json({ error: 'A name, grade level, and teacher are required.' });
    if (typeof adviserId !== 'string' || !/^[0-9a-f-]{36}$/i.test(adviserId)) return res.status(400).json({ error: 'Choose a valid teacher.' });
    const support = Boolean(isReadingSupport);
    const { data, error } = await supabaseAdmin.from('class_sections').insert({ name: cleanName, grade_level: grade, adviser_id: adviserId, is_reading_support: support, capacity: support ? 12 : 30 }).select().single();
    if (error) throw error;
    res.status(201).json({ section: data });
  } catch (err) { console.error('[admin/sections create]', err); res.status(500).json({ error: 'Unable to create this section.' }); }
});

router.get('/sections/:id/students', validateUuidParam('id'), async (req, res) => {
  try {
    const { data: section, error: sectionError } = await supabaseAdmin
      .from('class_sections')
      .select('id, name, grade_level, capacity')
      .eq('id', req.params.id)
      .maybeSingle();
    if (sectionError) throw sectionError;
    if (!section) return res.status(404).json({ error: 'Section not found.' });

    const [{ data: students, error: studentsError }, { data: memberships, error: membershipsError }] = await Promise.all([
      supabaseAdmin.from('children').select('id, name, grade_level').eq('grade_level', section.grade_level).order('name'),
      supabaseAdmin.from('section_students').select('student_id').eq('section_id', section.id),
    ]);
    if (studentsError || membershipsError) throw studentsError || membershipsError;
    const assignedIds = new Set((memberships || []).map((membership) => membership.student_id));
    res.json({
      section,
      students: (students || []).map((student) => ({ ...student, assigned: assignedIds.has(student.id) })),
      assignedCount: assignedIds.size,
    });
  } catch (err) { console.error('[admin/section students]', err); res.status(500).json({ error: 'Unable to load students for this section.' }); }
});

router.post('/sections/:id/students', validateUuidParam('id'), async (req, res) => {
  try {
    const studentIds = Array.isArray(req.body?.studentIds) ? [...new Set(req.body.studentIds)].filter((id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) : [];
    if (!studentIds.length || studentIds.length > 35) return res.status(400).json({ error: 'Select one to 35 students.' });
    const { data: section, error: sectionError } = await supabaseAdmin.from('class_sections').select('id, adviser_id').eq('id', req.params.id).maybeSingle();
    if (sectionError) throw sectionError; if (!section) return res.status(404).json({ error: 'Section not found.' });
    const { error: membershipError } = await supabaseAdmin.from('section_students').upsert(studentIds.map((student_id) => ({ section_id: section.id, student_id })), { onConflict: 'section_id,student_id', ignoreDuplicates: true });
    if (membershipError) throw membershipError;
    const { error: rosterError } = await supabaseAdmin.from('teacher_student_links').upsert(studentIds.map((student_id) => ({ teacher_id: section.adviser_id, student_id, assigned_by: req.user.id })), { onConflict: 'teacher_id,student_id', ignoreDuplicates: true });
    if (rosterError) throw rosterError;
    res.json({ success: true });
  } catch (err) { console.error('[admin/sections students]', err); res.status(500).json({ error: err.message || 'Unable to add students to this section.' }); }
});

router.get('/analytics/students', async (_req, res) => {
  try {
    const [studentsResult, childrenResult, progressResult] = await Promise.all([
      supabaseAdmin.from('users').select('id, name, email, account_status, lastLoginAt, created_at').eq('role', 'student').order('name'),
      supabaseAdmin.from('children').select('id, auth_uid, name, grade_level'),
      supabaseAdmin.from('child_progress').select('child_id, level, xp, streak, accuracy_sum, total_attempts, activities_completed, updated_at'),
    ]);
    for (const result of [studentsResult, childrenResult, progressResult]) if (result.error) throw result.error;

    const childByAuthId = new Map((childrenResult.data || []).filter((child) => child.auth_uid).map((child) => [child.auth_uid, child]));
    const progressByChildId = new Map((progressResult.data || []).map((progress) => [progress.child_id, progress]));
    const students = await Promise.all((studentsResult.data || []).map(async (account) => {
      const child = childByAuthId.get(account.id);
      const progress = child ? progressByChildId.get(child.id) : null;
      const attempts = Number(progress?.total_attempts || 0);
      const moduleResult = child ? await supabaseAdmin.rpc('get_student_module_path', { p_student_id: child.id }) : { data: null };
      const completedModules = Array.isArray(moduleResult.data?.modules) ? moduleResult.data.modules.filter((module) => module.state === 'completed').map((module) => ({ id: module.id, number: module.module_number, title: module.title })) : [];
      return {
        id: account.id,
        name: child?.name || account.name || account.email || 'Mag-aaral',
        email: account.email || null,
        gradeLevel: child?.grade_level || null,
        accountStatus: account.account_status || 'active',
        lastLoginAt: account.lastLoginAt || null,
        createdAt: account.created_at,
        progress: {
          level: progress?.level || null,
          accuracy: attempts > 0 ? Math.round(Number(progress?.accuracy_sum || 0) / attempts) : null,
          attempts,
          activitiesCompleted: Number(progress?.activities_completed || 0),
          xp: Number(progress?.xp || 0),
          streak: Number(progress?.streak || 0),
          updatedAt: progress?.updated_at || null,
          completedModules,
        },
      };
    }));
    res.json({ students });
  } catch (err) {
    console.error('[admin/analytics/students]', err);
    res.status(500).json({ error: 'Unable to load student account details.' });
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
    const enrollmentByRoleMonth = { student: {}, parent: {}, teacher: {} };
    for (const c of children || []) {
      const key = String(c.created_at).slice(0, 7);
      enrollmentByMonth[key] = (enrollmentByMonth[key] || 0) + 1;
    }

    const roleCounts = {};
    for (const u of users || []) {
      roleCounts[u.role || 'unknown'] = (roleCounts[u.role || 'unknown'] || 0) + 1;
      if (enrollmentByRoleMonth[u.role]) {
        const key = String(u.created_at).slice(0, 7);
        enrollmentByRoleMonth[u.role][key] = (enrollmentByRoleMonth[u.role][key] || 0) + 1;
      }
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
      enrollmentByRole: Object.entries(enrollmentByRoleMonth).flatMap(([role, entries]) => Object.entries(entries)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, role, count }))),
      usageTrend: Object.entries(usageByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      roleCounts,
      totals: {
        children: (children || []).length,
        // A child/enrollment record is not necessarily a login account. Keep
        // this separate so the Admin UI's student-user total always agrees
        // with the Users screen's `role = student` filter.
        studentAccounts: roleCounts.student || 0,
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

const SYSTEM_SETTINGS_DEFAULTS = {
  systemName: 'LinawLetra', organizationName: '', defaultLanguage: 'fil', timezone: 'Asia/Manila',
  sequentialModules: true, passingScore: 75, completionRequirement: 80, allowActivityRetry: true, autoSaveProgress: true,
  xpPerActivity: 10, xpPerModule: 50, enableBadges: true, enableDailyStreak: true, enableAchievementRewards: true,
  studentProgressAlerts: true, newAccountNotifications: true, teacherNotifications: true, systemAnnouncements: true,
  sessionTimeout: '30', failedLoginLimit: 5, requireStrongPassword: true, lockAfterFailures: true,
  maintenanceMode: false, announcement: '', readOnlyMode: false,
};

function validatedSystemSettings(value) {
  const settings = { ...SYSTEM_SETTINGS_DEFAULTS, ...(value || {}) };
  if (typeof settings.systemName !== 'string' || !settings.systemName.trim() || settings.systemName.length > 120) throw new Error('System name is required and must be 120 characters or fewer.');
  if (typeof settings.organizationName !== 'string' || settings.organizationName.length > 160 || typeof settings.announcement !== 'string' || settings.announcement.length > 1000) throw new Error('One or more text fields are too long.');
  if (!['fil', 'en'].includes(settings.defaultLanguage) || !['15', '30', '60', '120'].includes(String(settings.sessionTimeout))) throw new Error('Invalid settings selection.');
  for (const key of ['passingScore', 'completionRequirement']) if (!Number.isFinite(settings[key]) || settings[key] < 0 || settings[key] > 100) throw new Error('Scores must be between 0 and 100.');
  for (const key of ['xpPerActivity', 'xpPerModule']) if (!Number.isFinite(settings[key]) || settings[key] < 0) throw new Error('XP values cannot be negative.');
  if (!Number.isInteger(settings.failedLoginLimit) || settings.failedLoginLimit < 1 || settings.failedLoginLimit > 100) throw new Error('Failed login limit must be a positive whole number.');
  return settings;
}

router.get('/system-settings', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('system_settings').select('settings').eq('key', 'global').maybeSingle();
    if (error) throw error;
    res.json({ settings: { ...SYSTEM_SETTINGS_DEFAULTS, ...(data?.settings || {}) } });
  } catch (err) {
    console.error('[admin/system-settings get]', err);
    res.status(500).json({ error: 'Unable to load system settings.' });
  }
});

router.patch('/system-settings', async (req, res) => {
  try {
    const settings = validatedSystemSettings(req.body);
    const { data, error } = await supabaseAdmin.from('system_settings').upsert({ key: 'global', settings, updated_by: req.user.id, updated_at: new Date().toISOString() }, { onConflict: 'key' }).select('settings').single();
    if (error) throw error;
    await supabaseAdmin.from('audit_logs').insert({ actor_id: req.user.id, actor_role: 'admin', actor_name: req.user.name || null, action: 'ADMIN.SYSTEM_SETTINGS_UPDATE', module: 'admin_settings', record_id: 'global', status: 'successful', updated_values: settings, metadata: { platform: platformFor(req) } });
    res.json({ settings: { ...SYSTEM_SETTINGS_DEFAULTS, ...(data?.settings || {}) } });
  } catch (err) {
    console.error('[admin/system-settings patch]', err);
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unable to update system settings.' });
  }
});

module.exports = router;
