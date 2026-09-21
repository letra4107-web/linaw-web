/**
 * Filipino SSML helpers for the reading activities.
 *
 * Keep the original written word inside the phoneme tag.  This lets Google
 * Cloud TTS use Filipino IPA while preserving the text shown to the learner.
 */
const WORD_PATTERN = /^[\p{L}]+$/u;
const VOWEL_IPA = Object.freeze({
  a: 'a',
  e: 'ɛ',
  i: 'i',
  o: 'o',
  // Google classifies the Filipino /u/ vowel as the near-close sound /ʊ/.
  // Sending /u/ can make the provider fall back to an English-like "you".
  u: 'ʊ',
});

// A vowel at the start or end of a Filipino word is normally bounded by a
// glottal stop. This prevents isolated letter drills from sounding clipped or
// drawn out by the voice model.
const ISOLATED_VOWEL_IPA = Object.freeze({
  a: 'ʔaʔ',
  e: 'ʔɛʔ',
  i: 'ʔiʔ',
  o: 'ʔoʔ',
  u: 'ʔʊʔ',
});

// Letter drills must use Filipino letter sounds, not the English names
// ("bee", "kay", "double-u"). The first group is the core Filipino
// alphabet; the remaining letters retain Filipino-friendly names for content
// that includes them.
const ISOLATED_LETTER_NAMES = Object.freeze({
  b: 'ba', c: 'ka', d: 'da', f: 'fa', g: 'ga', h: 'ha', j: 'dya', k: 'ka',
  l: 'la', m: 'ma', n: 'na', 'ñ': 'nya', ng: 'nga', p: 'pa', q: 'ku',
  r: 'ra', s: 'sa', t: 'ta', v: 'va', w: 'wa', x: 'eks', y: 'ya', z: 'za',
});

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fil-PH');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function syllableCount(value) {
  return (normalize(value).match(/[aeiou]/g) || []).length;
}

function isMultiSyllableWord(value) {
  const word = String(value ?? '').trim();
  return WORD_PATTERN.test(word) && syllableCount(word) >= 2;
}

/**
 * A deliberately small Filipino IPA map. It handles Filipino vowel sounds
 * explicitly and avoids applying English letter-name pronunciation rules.
 */
function filipinoIpa(value) {
  const word = normalize(value);
  if (!WORD_PATTERN.test(word)) return null;

  let ipa = '';
  for (let index = 0; index < word.length; index += 1) {
    const pair = word.slice(index, index + 2);

    if (pair === 'ng') {
      ipa += 'ŋ';
      index += 1;
      continue;
    }
    if (pair === 'ts' || pair === 'ch') {
      ipa += 'tʃ';
      index += 1;
      continue;
    }
    if (pair === 'dy') {
      ipa += 'dʒ';
      index += 1;
      continue;
    }

    const letter = word[index];
    if (VOWEL_IPA[letter]) ipa += VOWEL_IPA[letter];
    else if (letter === 'r') ipa += 'ɾ';
    else if (letter === 'y') ipa += 'j';
    else if (letter === 'c') ipa += word[index + 1] && 'eiy'.includes(word[index + 1]) ? 's' : 'k';
    else if (letter === 'q') ipa += 'k';
    else if (letter === 'x') ipa += 'ks';
    else ipa += letter;
  }
  return ipa;
}

function phonemeWord(word) {
  const ipa = filipinoIpa(word);
  if (!ipa) return escapeXml(word);
  return `<phoneme alphabet="ipa" ph="${ipa}">${escapeXml(word)}</phoneme>`;
}

function formatParagraph(paragraph) {
  const tokens = paragraph.match(/[\p{L}]+|[.!?]+|[,;:]+|\s+|[^\s]/gu) || [];
  let hasTerminalPause = false;
  let output = '';

  for (const token of tokens) {
    if (WORD_PATTERN.test(token)) {
      output += phonemeWord(token);
      hasTerminalPause = false;
    } else if (/^[.!?]+$/.test(token)) {
      output += `${escapeXml(token)}<break time="900ms"/>`;
      hasTerminalPause = true;
    } else if (/^[,;:]+$/.test(token)) {
      output += `${escapeXml(token)}<break time="300ms"/>`;
      hasTerminalPause = false;
    } else {
      output += escapeXml(token);
    }
  }

  return hasTerminalPause ? output : `${output}<break time="900ms"/>`;
}

function filipinoSsml(value) {
  const text = String(value ?? '').trim();
  if (!text) return '<speak></speak>';

  // Isolation practice: use the Filipino vowel itself, never its English name.
  const isolatedVowel = normalize(text);
  if (Object.hasOwn(VOWEL_IPA, isolatedVowel)) {
    return `<speak><phoneme alphabet="ipa" ph="${ISOLATED_VOWEL_IPA[isolatedVowel]}">${isolatedVowel}</phoneme><break time="900ms"/></speak>`;
  }

  const isolatedLetter = text.toLocaleLowerCase('fil-PH');
  const letterName = ISOLATED_LETTER_NAMES[isolatedLetter];
  if (letterName) {
    return `<speak><phoneme alphabet="ipa" ph="${filipinoIpa(letterName)}">${escapeXml(text)}</phoneme><break time="900ms"/></speak>`;
  }

  const paragraphs = text.split(/\r?\n\s*\r?\n/).filter(Boolean);
  return `<speak>${paragraphs.map(formatParagraph).join('<break time="1500ms"/>')}</speak>`;
}

// Retained as an export alias so existing imports do not break. New code uses
// IPA because it is the requested, supported phonetic notation for this flow.
module.exports = {
  filipinoIpa,
  filipinoSsml,
  filipinoXsampa: filipinoIpa,
  isMultiSyllableWord,
  syllableCount,
};
