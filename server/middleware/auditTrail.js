const { auditActionForRequest, logAudit } = require('../services/audit');

function auditTrail(req, res, next) {
  res.on('finish', () => {
    if (!req.user || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || req.path.startsWith('/api/tts')) return;
    logAudit({
      actor: { id: req.user.id, role: req.userRole, displayName: req.user.user_metadata?.full_name },
      action: auditActionForRequest(req),
      status: res.statusCode >= 200 && res.statusCode < 400 ? 'successful' : 'failed',
      req,
    }).catch((error) => console.error('[audit-trail]', error));
  });
  next();
}

module.exports = { auditTrail };
