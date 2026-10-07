const rateLimit = require('express-rate-limit');
const identityKey = (req) => req.user.id;
const safe429 = { error: 'Masyadong maraming request. Maghintay sandali at subukan muli.' };
function userLimiter({ windowMs, limit }) {
  return rateLimit({ windowMs, limit, keyGenerator: identityKey, standardHeaders: 'draft-7', legacyHeaders: false, message: safe429 });
}
module.exports = {
  userLimiter,
  ttsLimiter: userLimiter({ windowMs: 60_000, limit: 20 }),
  // Public pages have no signed-in user to key against. Keep this deliberately
  // conservative so the server-side ElevenLabs credential cannot be abused.
  publicTtsLimiter: rateLimit({
    windowMs: 60_000,
    limit: 8,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: safe429,
  }),
  uploadLimiter: userLimiter({ windowMs: 15 * 60_000, limit: 30 }),
  assessmentLimiter: userLimiter({ windowMs: 10 * 60_000, limit: 60 }),
  credentialLimiter: userLimiter({ windowMs: 60 * 60_000, limit: 10 }),
};
