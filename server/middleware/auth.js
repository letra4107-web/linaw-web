const { supabaseAdmin } = require('../config/supabase');

function bearerTokenFrom(authorization = '') {
  const match = String(authorization).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

/** Verifies the caller's Supabase session and attaches req.user. */
async function requireAuth(req, res, next) {
  const token = bearerTokenFrom(req.headers.authorization);
  if (!token) return res.status(401).json({ error: 'Missing Authorization bearer token.' });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired session.' });

  req.user = data.user;
  next();
}

/** Requires req.user (from requireAuth) to have one of the given roles per public.users.role. */
function requireRole(...roles) {
  return async (req, res, next) => {
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error || !profile || !roles.includes(String(profile.role || '').toLowerCase())) {
      return res.status(403).json({ error: 'Forbidden for this account role.' });
    }
    req.userRole = profile.role;
    next();
  };
}

module.exports = { requireAuth, requireRole };
