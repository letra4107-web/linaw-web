const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { ttsLimiter } = require('../lib/rateLimiters');
const { elevenLabsText, isIsolatedFilipinoVowel } = require('../lib/filipinoPhonemes');
const { logAudit } = require('../services/audit');

const MAX_TEXT_LENGTH = 500;
const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const ELEVENLABS_MODEL_ID = 'eleven_multilingual_v2';
const ELEVENLABS_PHONETIC_MODEL_ID = 'eleven_v3';

// POST /api/tts  { text }  -> { audioContent: base64 mp3 }
function createTtsRouter({
  authMiddleware = requireAuth,
  limiter = ttsLimiter,
  fetchImpl = global.fetch,
  apiKey = process.env.ELEVENLABS_API_KEY,
  voiceId = process.env.ELEVENLABS_VOICE_ID,
  // Kept for backward-compatible configuration, but dictionaries require the
  // phonetic model below. A generic model setting must never silently bypass
  // IPA vowel rules.
  modelId = process.env.ELEVENLABS_MODEL_ID,
  pronunciationDictionaryId = process.env.ELEVENLABS_PRONUNCIATION_DICTIONARY_ID,
  pronunciationDictionaryVersionId = process.env.ELEVENLABS_PRONUNCIATION_DICTIONARY_VERSION_ID,
} = {}) {
  void modelId;
  const router = express.Router();
  router.use(authMiddleware);
  router.use(limiter);
  router.post('/', async (req, res) => {
  try {
    const { text } = req.body || {};
    const requestedRate = Number(req.body?.rate);
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
    // A/E/I/O/U drills must always be heard at natural speed. They are brief
    // sounds, so applying a reading-speed preference makes them unclear.
    // ElevenLabs accepts voice speed between 0.7 and 1.2 for other content.
    const speakingRate = isIsolatedFilipinoVowel(text)
      ? 1
      : Number.isFinite(requestedRate) ? Math.min(1.2, Math.max(0.7, requestedRate)) : 0.7;
    if (!apiKey || !voiceId) {
      return res.status(500).json({ error: 'TTS is not configured on the server.' });
    }

    const providerUrl = `${ELEVENLABS_TTS_URL}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
    const usePronunciationDictionary = Boolean(pronunciationDictionaryId && pronunciationDictionaryVersionId);
    const synthesize = (payload) => fetchImpl(providerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify(payload),
    });
    const fallbackPayload = {
      text: elevenLabsText(text),
      model_id: ELEVENLABS_MODEL_ID,
      voice_settings: { speed: speakingRate },
    };
    let response = await synthesize(usePronunciationDictionary ? {
      // IPA dictionaries match the original letters.
      text,
      // ElevenLabs pronunciation dictionaries are applied by eleven_v3.
      // Existing deployments often set ELEVENLABS_MODEL_ID to
      // eleven_multilingual_v2, which rejects the dictionary and makes a
      // vowel fall back to an English-style letter name.
      model_id: ELEVENLABS_PHONETIC_MODEL_ID,
      voice_settings: { speed: speakingRate },
      pronunciation_dictionary_locators: [{
        pronunciation_dictionary_id: pronunciationDictionaryId,
        version_id: pronunciationDictionaryVersionId,
      }],
    } : fallbackPayload);

    // An unavailable model, dictionary, or account capability must never make
    // the learning control silent. Retry with the standard multilingual voice.
    if (!response.ok && usePronunciationDictionary) {
      await response.text();
      console.warn('[tts] pronunciation dictionary unavailable; using fallback', { status: response.status, requestId: req.requestId });
      response = await synthesize(fallbackPayload);
    }

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
