const express = require('express');

const router = express.Router();

const MAX_TEXT_LENGTH = 500;
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
// fil-ph-Neural2-A over the older fil-PH-Wavenet-A -- Neural2 is Google's newer, clearer
// voice tier with better phoneme articulation, which matters more here than for a typical
// app since this app's readers are decoding by ear.

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
        voice: { languageCode: 'fil-PH', name: 'fil-ph-Neural2-A' },
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

module.exports = router;
