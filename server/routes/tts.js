const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { ttsLimiter } = require('../lib/rateLimiters');
const { logAudit } = require('../services/audit');

const MAX_TEXT_LENGTH = 500;
const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const ELEVENLABS_MODEL_ID = 'eleven_multilingual_v2';

// POST /api/tts  { text }  -> { audioContent: base64 mp3 }
function createTtsRouter({
  authMiddleware = requireAuth,
  limiter = ttsLimiter,
  fetchImpl = global.fetch,
  apiKey = process.env.ELEVENLABS_API_KEY,
  voiceId = process.env.ELEVENLABS_VOICE_ID,
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
    if (!apiKey || !voiceId) {
      return res.status(500).json({ error: 'TTS is not configured on the server.' });
    }
    // ElevenLabs accepts a narrower speed range than the old provider. Keep
    // the learner's slow/normal preference while sending a supported value.
    const speakingRate = Math.min(1.2, Math.max(0.7, preferredRate));

    const response = await fetchImpl(`${ELEVENLABS_TTS_URL}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: { speed: speakingRate },
      }),
    });

    if (!response.ok) {
      await response.text();
      console.error('[tts] provider request failed', { status: response.status, requestId: req.requestId });
      return res.status(502).json({ error: 'Unable to synthesize speech right now.' });
    }

    const audioContent = Buffer.from(await response.arrayBuffer()).toString('base64');
    void logAudit({ actor: { id: req.user.id, role: req.userRole }, action: 'SPEECH.TTS_SYNTHESIZE', target: { id: null }, status: 'successful', req }).catch(() => {});
    res.json({ audioContent, speakingRate, languageCode: 'fil-PH' });
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
