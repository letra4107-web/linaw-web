const express = require('express');

const router = express.Router();

const MAX_TEXT_LENGTH = 500;
const MAX_SYLLABLES = 12;
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
// The v1 endpoint 400s on enableTimePointing ("Unknown name") -- only
// v1beta1 returns real per-<mark> timepoints, needed for syllable karaoke.
const GOOGLE_TTS_URL_BETA = 'https://texttospeech.googleapis.com/v1beta1/text:synthesize';
const KARAOKE_RATE = 0.5;

const escapeSsmlText = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildMarkedSsml = (syllables) => {
  const body = syllables.map((syllable, index) => `<mark name="s${index}"/>${escapeSsmlText(syllable)}`).join('');
  return `<speak>${body}</speak>`;
};

// POST /api/tts  { text }  -> { audioContent: base64 mp3 }
router.post('/', async (req, res) => {
  try {
    const { text } = req.body || {};
    const requestedRate = Number(req.body?.rate);
    const speakingRate = Number.isFinite(requestedRate) ? Math.min(1, Math.max(0.25, requestedRate)) : 0.95;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required.' });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `Text is too long (max ${MAX_TEXT_LENGTH} characters).` });
    }
    if (!process.env.GOOGLE_TTS_API_KEY) {
      return res.status(500).json({ error: 'TTS is not configured on the server.' });
    }

    const response = await fetch(`${GOOGLE_TTS_URL}?key=${process.env.GOOGLE_TTS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'fil-PH', name: 'fil-PH-Wavenet-A' },
        audioConfig: { audioEncoding: 'MP3', speakingRate },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('[tts] Google TTS error', response.status, detail);
      return res.status(502).json({ error: 'Unable to synthesize speech right now.' });
    }

    const data = await response.json();
    res.json({ audioContent: data.audioContent });
  } catch (err) {
    console.error('[tts]', err);
    res.status(500).json({ error: 'Unable to synthesize speech right now.' });
  }
});

// POST /api/tts/speak-syllables  { syllables: string[] }
// -> { audioContent: base64 mp3, timepoints: { markName, timeSeconds }[] }
// One TTS call for the whole word with an SSML <mark> before each syllable;
// Google returns the real measured time (seconds) each mark was reached, so
// syllable-highlight timing on the client is driven by actual audio timing
// rather than a guessed per-syllable delay.
router.post('/speak-syllables', async (req, res) => {
  try {
    const rawSyllables = Array.isArray(req.body?.syllables) ? req.body.syllables : [];
    const syllables = rawSyllables.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
    const requestedRate = Number(req.body?.rate);
    // Clamp to Google's supported speakingRate range; same voice/text either way, just paced differently
    // -- this keeps "Basahin nang Malakas" (normal speed) and "Pakinggan at Basahin" (slow, per-syllable)
    // reading the exact same synthesized word instead of two independently-generated audios.
    const speakingRate = Number.isFinite(requestedRate) ? Math.min(1, Math.max(0.25, requestedRate)) : KARAOKE_RATE;

    if (!syllables.length) {
      return res.status(400).json({ error: 'Missing syllables to synthesize.' });
    }
    if (syllables.length > MAX_SYLLABLES) {
      return res.status(400).json({ error: `Too many syllables (max ${MAX_SYLLABLES}).` });
    }
    if (syllables.join('').length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `Text is too long (max ${MAX_TEXT_LENGTH} characters).` });
    }
    if (!process.env.GOOGLE_TTS_API_KEY) {
      return res.status(500).json({ error: 'TTS is not configured on the server.' });
    }

    const ssml = buildMarkedSsml(syllables);
    const response = await fetch(`${GOOGLE_TTS_URL_BETA}?key=${process.env.GOOGLE_TTS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { ssml },
        voice: { languageCode: 'fil-PH', name: 'fil-PH-Wavenet-A' },
        audioConfig: { audioEncoding: 'MP3', speakingRate },
        enableTimePointing: ['SSML_MARK'],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.audioContent) {
      console.error('[tts] Google karaoke synthesis error', response.status, payload?.error || payload);
      return res.status(502).json({ error: 'Unable to synthesize speech right now.' });
    }

    // Google returns timepoints unordered -- restore syllable order by the
    // numeric suffix on the mark name ("s0", "s1", ...).
    const timepoints = (Array.isArray(payload.timepoints) ? payload.timepoints : [])
      .map((tp) => ({ markName: tp.markName, timeSeconds: Number(tp.timeSeconds) || 0 }))
      .sort((a, b) => Number(String(a.markName).slice(1)) - Number(String(b.markName).slice(1)));

    res.json({ audioContent: payload.audioContent, timepoints });
  } catch (err) {
    console.error('[tts speak-syllables]', err);
    res.status(500).json({ error: 'Unable to synthesize speech right now.' });
  }
});

module.exports = router;
