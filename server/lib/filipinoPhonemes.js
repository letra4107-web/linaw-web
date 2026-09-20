// Conservative Filipino X-SAMPA transcription for reading-practice words.
// It intentionally maps graphemes to Filipino sounds instead of allowing an
// English TTS front-end to infer English letter names or vowel values.
const FILIPINO_WORD = /^[a-zà-ÿñ]+$/i;

function normalize(word) {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fil-PH');
}

function syllableCount(text) {
  const word = normalize(String(text).trim());
  return (word.match(/[aeiou]+/g) || []).length;
}

function filipinoXsampa(word) {
  if (!FILIPINO_WORD.test(word)) return null;
  const letters = normalize(word);
  let phonemes = '';

  for (let index = 0; index < letters.length;) {
    const pair = letters.slice(index, index + 2);
    if (pair === 'ng') { phonemes += 'N'; index += 2; continue; }
    if (pair === 'ts' || pair === 'ch') { phonemes += 'tS'; index += 2; continue; }
    if (pair === 'dy') { phonemes += 'dZ'; index += 2; continue; }

    const letter = letters[index];
    const next = letters[index + 1] || '';
    const sound = {
      a: 'a', b: 'b', d: 'd', e: 'E', f: 'f', g: 'g', h: 'h', i: 'i',
      j: 'dZ', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p', r: '4',
      s: 's', t: 't', u: 'U', v: 'v', w: 'w', y: 'j', z: 'z',
    }[letter] || (letter === 'c' ? (/[eiy]/.test(next) ? 's' : 'k') : letter === 'q' ? 'k' : letter === 'x' ? 'ks' : null);
    if (!sound) return null;
    phonemes += sound;
    index += 1;
  }

  return phonemes;
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
}

function filipinoSsml(text) {
  const parts = String(text).match(/[a-zà-ÿñ]+|[^a-zà-ÿñ]+/gi) || [];
  const content = parts.map((part) => {
    const phonemes = filipinoXsampa(part);
    const visible = escapeXml(part);
    return phonemes ? `<phoneme alphabet="x-sampa" ph="${phonemes}">${visible}</phoneme>` : visible;
  }).join('');
  return `<speak>${content}</speak>`;
}

function isMultiSyllableWord(text) {
  return FILIPINO_WORD.test(String(text).trim()) && syllableCount(text) >= 2;
}

module.exports = { filipinoSsml, filipinoXsampa, isMultiSyllableWord, syllableCount };
