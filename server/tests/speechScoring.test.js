const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSpeechText, scoreTranscript } = require('../lib/speechScoring');

test('speech scoring normalizes casing, punctuation, and diacritics', () => {
  assert.equal(normalizeSpeechText('  H\u00e9llo, Mundo! '), 'hello mundo');
  const score = scoreTranscript('Hello, mundo!', 'h\u00e9llo mundo');
  assert.equal(score.accuracy, 100);
  assert.equal(score.correct, true);
});

test('speech scoring is deterministic and does not award an empty transcript', () => {
  assert.deepEqual(scoreTranscript('basa', ''), {
    accuracy: 0,
    correct: false,
    expectedTokenCount: 1,
    transcriptTokenCount: 0,
  });
  assert.equal(scoreTranscript('ako ay nagbabasa', 'ako nagbabasa').accuracy, 67);
});

test('speech scoring normalizes Filipino punctuation, hyphens, apostrophes, and whitespace', () => {
  assert.equal(normalizeSpeechText("  'Ma-gîng,\tmahusay!'  "), 'ma ging mahusay');
  assert.deepEqual(scoreTranscript('Mag-ingat, bata!', ' mag ingat bata '), {
    accuracy: 100,
    correct: true,
    expectedTokenCount: 3,
    transcriptTokenCount: 3,
  });
  assert.equal(scoreTranscript('bata', '   ').correct, false);
});

test('speech scoring resists simple noise artifacts without accepting wrong Filipino phonemes', () => {
  // Simulated light background-noise artifact: the Web Speech API repeats a word.
  assert.equal(scoreTranscript('bata', 'bata bata').correct, true);
  // False-positive guard: a distinct consonant remains incorrect.
  assert.equal(scoreTranscript('pala', 'fala').correct, false);
  // False-negative guard: punctuation and spacing noise remains correct.
  assert.equal(scoreTranscript('mag-ingat', 'mag ingat').correct, true);
});
