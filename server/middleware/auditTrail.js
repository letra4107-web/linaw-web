const { supabaseAdmin } = require('../config/supabase');

const REDACTED = new Set(['password', 'plain_password', 'hashed_password', 'token', 'access_token', 'refresh_token', 'session', 'authorization', 'transcript', 'spoken_text', 'chunk_text', 'audio', 'audio_data', 'raw_audio']);
function safeMetadata(req) {
  const body = req.body && typeof req.body === 'object' ? Object.fromEntries(Object.entries(req.body)
    .filter(([key]) => !REDACTED.has(key.toLowerCase()))
    .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 200) : value])) : {};
  return { method: req.method, path: req.path, requestId: req.requestId || null, request: body };
}

function auditTrail(req, res, next) {
  const segments = req.path.split('/').filter(Boolean);
  const recordId = segments.find((part) => /^[0-9a-f-]{36}$/i.test(part)) || null;
  res.on('finish', () => {
    if (!req.user || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || req.path.startsWith('/api/tts')) return;
    const module = segments[1] || 'system';
    const authEvent = module === 'auth' && typeof req.body?.type === 'string' ? req.body.type.toUpperCase() : null;
    Promise.resolve(supabaseAdmin.from('users').select('name, role').eq('id', req.user.id).maybeSingle()).then(({ data }) =>
      supabaseAdmin.from('audit_logs').insert({
        actor_id: req.user.id,
        actor_role: req.userRole || data?.role || null,
        actor_name: data?.name || req.user.user_metadata?.full_name || null,
        action: (authEvent ? `AUTH_${authEvent}` : `${req.method} ${segments.slice(2).map((part) => /^[0-9a-f-]{36}$/i.test(part) ? ':id' : part).join('/') || module}`).slice(0, 160),
        module,
        record_id: recordId,
        status: res.statusCode >= 200 && res.statusCode < 400 ? 'successful' : 'failed',
        metadata: safeMetadata(req),
      }),
    ).catch((error) => console.error('[audit-trail]', error));
  });
  next();
}

module.exports = { auditTrail };
