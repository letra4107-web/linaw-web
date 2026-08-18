// Port of the mobile app's tagalogSyllabification.ts (vowel-nucleus algorithm),
// scoped to a single word (no punctuation/whitespace tokenizing needed here).
const VOWELS = 'aeiouáéíóúâêîôûäëïöü';

export function syllabifyWord(word: string): string[] {
  const chars = Array.from(word.toLowerCase());
  const syllables: string[] = [];
  let i = 0;

  while (i < chars.length) {
    let nucleus = -1;
    for (let j = i; j < chars.length; j += 1) {
      if (VOWELS.includes(chars[j])) {
        nucleus = j;
        break;
      }
    }

    if (nucleus === -1) {
      const rem = chars.slice(i).join('');
      if (syllables.length) syllables[syllables.length - 1] += rem;
      else syllables.push(rem);
      break;
    }

    const onset = chars.slice(i, nucleus).join('');

    let nextVowel = -1;
    for (let k = nucleus + 1; k < chars.length; k += 1) {
      if (VOWELS.includes(chars[k])) {
        nextVowel = k;
        break;
      }
    }

    let syll = onset + chars[nucleus];

    if (nextVowel === -1) {
      syll += chars.slice(nucleus + 1).join('');
      syllables.push(syll);
      break;
    }

    // Mid-word, only the last consonant in a run carries over as the next
    // syllable's onset; earlier ones become this syllable's coda -- without
    // this, "nagbasa" splits as na-gba-sa instead of nag-ba-sa.
    const between = chars.slice(nucleus + 1, nextVowel);
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
