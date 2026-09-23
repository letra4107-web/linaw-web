const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { ttsLimiter } = require('../lib/rateLimiters');
const { filipinoSsml, isMultiSyllableWord, syllableCount } = require('../lib/filipinoPhonemes');
const { logAudit } = require('../services/audit');

const MAX_TEXT_LENGTH = 500;
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// POST /api/tts  { text }  -> { audioContent: base64 mp3 }
function createTtsRouter({
  authMiddleware = requireAuth,
  limiter = ttsLimiter,
  fetchImpl = global.fetch,
  apiKey = process.env.GOOGLE_TTS_API_KEY,
} = {}) {
  const router = express.Router();
  router.use(authMiddleware);
  router.use(limiter);
  router.post('/', async (req, res) => {
  try {
    const { text } = req.body || {};
    const requestedRate = Number(req.body?.rate);
    const preferredRate = Number.isFinite(requestedRate) ? Math.min(1, Math.max(0.25, requestedRate)) : 0.95;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required.' });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `Text is too long (max ${MAX_TEXT_LENGTH} characters).` });
    }
    if ([...text].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 && ![9, 10, 13].includes(code);
    })) {
      return res.status(400).json({ error: 'Text contains unsupported characters.' });
    }
    if (!apiKey) {
      return res.status(500).json({ error: 'TTS is not configured on the server.' });
    }
    const syllables = syllableCount(text);
    // Decodable two-or-more-syllable words need extra time between Filipino
    // vowel sounds. Never speed up a user-selected slower rate.
    const speakingRate = isMultiSyllableWord(text) ? Math.min(preferredRate, 0.72) : preferredRate;

    const response = await fetchImpl(`${GOOGLE_TTS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { ssml: filipinoSsml(text) },
        voice: { languageCode: 'fil-PH', name: 'fil-ph-Neural2-A' },
        audioConfig: { audioEncoding: 'MP3', speakingRate },
      }),
    });

    if (!response.ok) {
      await response.text();
      console.error('[tts] provider request failed', { status: response.status, requestId: req.requestId });
      return res.status(502).json({ error: 'Unable to synthesize speech right now.' });
    }

    const data = await response.json();
    void logAudit({ actor: { id: req.user.id, role: req.userRole }, action: 'SPEECH.TTS_SYNTHESIZE', target: { id: null }, status: 'successful', req }).catch(() => {});
    res.json({ audioContent: data.audioContent, speakingRate, syllableCount: syllables, languageCode: 'fil-PH' });
  } catch (err) {
    console.error('[tts]', err);
    res.status(500).json({ error: 'Unable to synthesize speech right now.' });
  }
  });
  return router;
}

module.exports = createTtsRouter();
module.exports.createTtsRouter = createTtsRouter;
module.exports.MAX_TEXT_LENGTH = MAX_TEXT_LENGTH;
