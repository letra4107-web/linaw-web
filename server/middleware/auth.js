const { bearerTokenFrom, createAuthMiddleware } = require('./authCore');

let defaultMiddleware;
function getDefaultMiddleware() {
  if (!defaultMiddleware) {
    const { supabaseAdmin } = require('../config/supabase');
    defaultMiddleware = createAuthMiddleware(supabaseAdmin);
  }
  return defaultMiddleware;
}

function requireAuth(req, res, next) {
  return getDefaultMiddleware().requireAuth(req, res, next);
}

function requireRole(...roles) {
  const allowed = roles;
  return (req, res, next) => getDefaultMiddleware().requireRole(...allowed)(req, res, next);
}

module.exports = { bearerTokenFrom, createAuthMiddleware, requireAuth, requireRole };
