const SUCCESS = 'successful';
const FAILED = 'failed';

function isUuid(value) {
  return /^[0-9a-f-]{36}$/i.test(String(value || ''));
}

function canonicalPath(req) {
  return req.path.split('/').filter(Boolean).map((part) => isUuid(part) ? ':id' : part).join('/');
}

/** Canonical, privacy-safe action names for every state-changing API route. */
function auditActionForRequest(req) {
  const path = canonicalPath(req);
  const authEvent = String(req.body?.type || '').toLowerCase();
  if (path === 'api/auth/events') {
    return ({ login: 'AUTH.LOGIN_SUCCESS', logout: 'AUTH.LOGOUT', password_reset: 'AUTH.PASSWORD_RESET' })[authEvent] || 'AUTH.EVENT';
  }

  const actions = {
    'POST api/admin/users/:id/disable': 'ACCOUNT.DEACTIVATE',
    'POST api/admin/users/:id/restore': 'ACCOUNT.RESTORE',
    'POST api/admin/users/:id/archive': 'ACCOUNT.ARCHIVE',
    'DELETE api/admin/users/:id': 'ACCOUNT.DELETE',
    'POST api/admin/teachers': 'TEACHER.CREATE',
    'POST api/parent/children': 'STUDENT.CREATE',
    'POST api/parent/children/:id/reading-level': 'STUDENT.READING_LEVEL_UPDATE',
    'PATCH api/parent/children/:id/settings': 'STUDENT.SETTINGS_UPDATE',
    'POST api/parent/children/:id/reset-password': 'AUTH.PASSWORD_RESET',
    'POST api/teacher/pdf': 'MATERIAL.UPLOAD',
    'PATCH api/teacher/pdf/:id': 'MATERIAL.UPDATE',
    'POST api/teacher/pdf/:id/archive': 'MATERIAL.ARCHIVE',
    'POST api/teacher/pdf/:id/unarchive': 'MATERIAL.RESTORE',
    'POST api/teacher/pdf-drill': 'EXERCISE.CREATE',
    'PATCH api/teacher/pdf-drill/:id/items': 'EXERCISE.UPDATE',
    'POST api/teacher/pdf-drill/:id/publish': 'EXERCISE.PUBLISH',
    'POST api/notifications/:id/read': 'NOTIFICATION.READ',
    'POST api/notifications/read-all': 'NOTIFICATION.READ_ALL',
    'POST api/student/learn/content/:id/attempt': 'STUDENT.PROGRESS_RECORD',
    'POST api/student/learn/content/:id/authoritative-attempt': 'STUDENT.PROGRESS_RECORD',
    'POST api/student/learn/assessment/:id/start': 'STUDENT.ASSESSMENT_START',
    'POST api/student/learn/assessment/:id/submit': 'STUDENT.ASSESSMENT_SUBMIT',
    'POST api/student/learn/module/:id/nonsense-check/submit': 'STUDENT.PROGRESS_RECORD',
    'POST api/student/learn/module/:id/equip': 'STUDENT.MODULE_EQUIP',
    'POST api/student/learn/module/:id/unequip': 'STUDENT.MODULE_UNEQUIP',
    'POST api/student/practice/attempt': 'STUDENT.PRACTICE_RECORD',
    'POST api/student/word-of-day/attempt': 'STUDENT.PROGRESS_RECORD',
    'POST api/student/pdf-reading/attempt': 'STUDENT.PROGRESS_RECORD',
    'POST api/student/pdf-reading/:id/submit': 'STUDENT.ASSIGNMENT_SUBMIT',
    'POST api/student/pdf-drill/attempt': 'STUDENT.PROGRESS_RECORD',
  };
  const key = `${req.method.toUpperCase()} ${path}`;
  if (actions[key]) return actions[key];

  const domain = (path.split('/')[1] || 'system').replace(/[^a-z0-9]/gi, '_').toUpperCase();
  const verb = ({ POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' })[req.method.toUpperCase()] || 'EVENT';
  return `${domain}.${verb}`;
}

function recordIdFrom(req) {
  return req.path.split('/').find(isUuid) || null;
}

// The helper intentionally accepts the full final signature now. Target/diff
// fields are persisted in the next additive schema task; current columns keep
// this task backward-compatible with deployed audit_logs rows.
async function logAudit({ actor, action, target = {}, before = null, after = null, status = SUCCESS, severity, req }) {
  if (!actor?.id || !/^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]*$/.test(action)) return;
  // Load only when an audit write actually occurs. This keeps isolated route
  // tests independent from local Supabase environment variables.
  const { supabaseAdmin } = require('../config/supabase');
  const { data: profile } = await supabaseAdmin.from('users').select('name, role').eq('id', actor.id).maybeSingle();
  const actorRole = actor.role || profile?.role || null;

  // Per product requirement, user login activity is visible to admins but an
  // admin's own login is not added to the operational trail.
  if (action === 'AUTH.LOGIN_SUCCESS' && actorRole === 'admin') return;

  const metadata = {
    source: 'express',
    method: req?.method || null,
    path: req ? canonicalPath(req) : null,
    requestId: req?.requestId || null,
    ...(severity ? { severity } : {}),
  };
  // Never include raw body input here: it can contain a password, transcript,
  // audio, or full learning text. Snapshots are supplied explicitly later.
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: actor.id,
    actor_role: actorRole,
    actor_name: actor.name || profile?.name || actor.displayName || null,
    action,
    module: action.split('.')[0].toLowerCase(),
    record_id: target.id || recordIdFrom(req),
    status: status === SUCCESS ? SUCCESS : FAILED,
    previous_values: before,
    updated_values: after,
    metadata,
  });
}

module.exports = { SUCCESS, FAILED, auditActionForRequest, logAudit };
