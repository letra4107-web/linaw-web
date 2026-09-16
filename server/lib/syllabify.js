// Port of src/lib/syllabify.ts (itself a port of mobile's tagalogSyllabification.ts,
// vowel-nucleus algorithm) -- kept in sync manually since server/ and src/ don't
// share a build step. Used by nonsenseWords.js to break phrase/paragraph-level
// module vocabulary down into syllable units for recombination.
const VOWELS = 'aeiouáéíóúâêîôûäëïöü';

// "ng" is a single letter/digraph in Filipino orthography (like "ñ"), not two
// consonants -- e.g. "sanga" must split as sa-nga, not san-ga, and
// "katarungan" as ka-ta-ru-ngan, not ka-ta-run-gan. Tokenizing it as one unit
// before running the consonant-cluster logic keeps it intact either way.
function tokenize(word) {
  const chars = Array.from(word.toLowerCase());
  const tokens = [];
  let i = 0;
  while (i < chars.length) {
    if (chars[i] === 'n' && chars[i + 1] === 'g') {
      tokens.push('ng');
      i += 2;
    } else {
      tokens.push(chars[i]);
      i += 1;
    }
  }
  return tokens;
}

// Some entries store a compound phrase as one "word" (e.g. "istasyong-tren",
// "kulay-abo") -- the hyphen/space is a word boundary, not a letter, so each
// side must be syllabified independently rather than feeding the separator
// through the consonant-cluster logic (which garbled it, e.g. "is-tas-yong-t-ren").
function syllabifyWord(word) {
  const segments = word.split(/[\s-]+/).filter(Boolean);
  if (segments.length > 1) {
    return segments.flatMap(syllabifySegment);
  }
  return syllabifySegment(word);
}

function syllabifySegment(word) {
  const tokens = tokenize(word);
  const syllables = [];
  let i = 0;

  while (i < tokens.length) {
    let nucleus = -1;
    for (let j = i; j < tokens.length; j += 1) {
      if (VOWELS.includes(tokens[j])) {
        nucleus = j;
        break;
      }
    }

    if (nucleus === -1) {
      const rem = tokens.slice(i).join('');
      if (syllables.length) syllables[syllables.length - 1] += rem;
      else syllables.push(rem);
      break;
    }

    const onset = tokens.slice(i, nucleus).join('');

    let nextVowel = -1;
    for (let k = nucleus + 1; k < tokens.length; k += 1) {
      if (VOWELS.includes(tokens[k])) {
        nextVowel = k;
        break;
      }
    }

    let syll = onset + tokens[nucleus];

    if (nextVowel === -1) {
      syll += tokens.slice(nucleus + 1).join('');
      syllables.push(syll);
      break;
    }

    const between = tokens.slice(nucleus + 1, nextVowel);
    if (between.length > 1) {
      syll += between.slice(0, -1).join('');
      i = nextVowel - 1;
    } else {
      i = nucleus + 1;
    }
    syllables.push(syll);
  }

  return syllables.filter(Boolean);
}

module.exports = { syllabifyWord };
