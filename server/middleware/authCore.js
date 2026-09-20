function bearerTokenFrom(authorization = '') {
  const match = String(authorization).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function createAuthMiddleware(client) {
  async function requireAuth(req, res, next) {
    const token = bearerTokenFrom(req.headers.authorization);
    if (!token) return res.status(401).json({ error: 'Missing Authorization bearer token.' });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) {
      // Surface only a safe, local-development diagnostic. It identifies a
      // configuration/session mismatch without ever returning the bearer token.
      const detail = process.env.NODE_ENV === 'production' ? undefined : (error?.message || 'No authenticated user returned.');
      if (detail) console.warn('[auth validation]', detail);
      return res.status(401).json({ error: 'Invalid or expired session.', ...(detail ? { detail } : {}) });
    }
    req.user = data.user;
    return next();
  }
  function requireRole(...roles) {
    return async (req, res, next) => {
      const { data: profile, error } = await client.from('users').select('role').eq('id', req.user.id).maybeSingle();
      const role = String(profile?.role || '').toLowerCase();
      if (error || !roles.includes(role)) return res.status(403).json({ error: 'Forbidden for this account role.' });
      req.userRole = role;
      return next();
    };
  }
  return { requireAuth, requireRole };
}

module.exports = { bearerTokenFrom, createAuthMiddleware };
