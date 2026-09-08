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
