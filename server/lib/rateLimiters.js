const rateLimit = require('express-rate-limit');
const identityKey = (req) => req.user.id;
const safe429 = { error: 'Masyadong maraming request. Maghintay sandali at subukan muli.' };
function userLimiter({ windowMs, limit }) {
  return rateLimit({ windowMs, limit, keyGenerator: identityKey, standardHeaders: 'draft-7', legacyHeaders: false, message: safe429 });
}
module.exports = {
  userLimiter,
  ttsLimiter: userLimiter({ windowMs: 60_000, limit: 20 }),
  uploadLimiter: userLimiter({ windowMs: 15 * 60_000, limit: 30 }),
  assessmentLimiter: userLimiter({ windowMs: 10 * 60_000, limit: 60 }),
  credentialLimiter: userLimiter({ windowMs: 60 * 60_000, limit: 10 }),
};
