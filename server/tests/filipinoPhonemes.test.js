const test = require('node:test');
const assert = require('node:assert/strict');
const { filipinoSsml, isMultiSyllableWord, syllableCount } = require('../lib/filipinoPhonemes');

test('isolated Filipino vowels use IPA instead of English letter names', () => {
  assert.equal(
    filipinoSsml('A'),
    '<speak><phoneme alphabet="ipa" ph="ʔaʔ">a</phoneme><break time="900ms"/></speak>',
  );
  assert.equal(
    filipinoSsml('U'),
    '<speak><phoneme alphabet="ipa" ph="ʔʊʔ">u</phoneme><break time="900ms"/></speak>',
  );
  assert.equal(
    filipinoSsml('I'),
    '<speak><phoneme alphabet="ipa" ph="iː">i</phoneme><break time="900ms"/></speak>',
  );
});

test('isolated consonants use Filipino letter sounds instead of English names', () => {
  assert.equal(
    filipinoSsml('B'),
    '<speak><phoneme alphabet="ipa" ph="ba">B</phoneme><break time="900ms"/></speak>',
  );
  assert.equal(
    filipinoSsml('Ng'),
    '<speak><phoneme alphabet="ipa" ph="ŋa">Ng</phoneme><break time="900ms"/></speak>',
  );
});

test('Filipino SSML spaces clauses, sentences, and paragraphs for processing time', () => {
  const ssml = filipinoSsml('Basa, anak.\n\nUlitin mo.');
  assert.match(ssml, /<break time="300ms"\/>/);
  assert.match(ssml, /<break time="900ms"\/>/);
  assert.match(ssml, /<break time="1500ms"\/>/);
  assert.match(ssml, /alphabet="ipa" ph="basa"/);
  assert.match(ssml, /alphabet="ipa" ph="anak"/);
  assert.match(ssml, /alphabet="ipa" ph="ʊlitin"/);
});

test('multi-syllable Filipino words receive the slow-reading classification', () => {
  assert.equal(syllableCount('ngipin'), 2);
  assert.equal(isMultiSyllableWord('ngipin'), true);
  assert.equal(isMultiSyllableWord('araw-araw'), false);
});
