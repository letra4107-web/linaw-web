function bearerTokenFrom(authorization = '') {
  const match = String(authorization).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function createAuthMiddleware(client) {
  async function requireAuth(req, res, next) {
    const token = bearerTokenFrom(req.headers.authorization);
    if (!token) return res.status(401).json({ error: 'Missing Authorization bearer token.' });
    let result;
    try {
      result = await client.auth.getUser(token);
    } catch {
      return res.status(503).json({ error: 'Authentication service is temporarily unavailable.' });
    }
    const { data, error } = result;
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
      try {
        const { data: profile, error } = await client.from('users').select('role, account_status, is_active').eq('id', req.user.id).maybeSingle();
        if (error) return res.status(503).json({ error: 'Account authorization is temporarily unavailable.' });
        const role = String(profile?.role || '').trim().toLowerCase();
        if (!roles.includes(role) || profile?.is_active === false || ['disabled', 'archived'].includes(profile?.account_status)) {
          return res.status(403).json({ error: 'Forbidden for this account role or status.' });
        }
        req.userRole = role;
        return next();
      } catch {
        return res.status(503).json({ error: 'Account authorization is temporarily unavailable.' });
      }
    };
  }
  return { requireAuth, requireRole };
}

module.exports = { bearerTokenFrom, createAuthMiddleware };
