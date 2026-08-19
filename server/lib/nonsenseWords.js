// Generates made-up ("nonsense") words for a module's phonological decoding
// check, built only from the syllables/letters that exact module already
// taught (e.g. Module 2 "Hanay ng Ba" -> ba/be/bi/bo/bu -> "babu", "bibo").
// A student who can correctly sound these out demonstrated real grapheme-
// phoneme decoding, not memorized sight-reading -- the specific skill
// phonological dyslexia impairs. Nothing here is stored; it's regenerated
// per request from the module's own reading_content rows.
const { syllabifyWord } = require('./syllabify');

function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Builds nonsense words from `unitCount` distinct units chosen without
// replacement per word (2 for phonetic/word/phrase content, 3 for paragraph --
// longer content deserves a harder decoding target).
function combineUnits(units, unitCount) {
  const combos = new Set();
  for (const a of units) {
    for (const b of units) {
      if (unitCount === 2) {
        if (a === b) continue;
        combos.add(a + b);
        continue;
      }
      for (const c of units) {
        if (a === b || b === c || a === c) continue;
        combos.add(a + b + c);
      }
    }
  }
  return [...combos];
}

// phonetic/word module items are already single syllables/words -- use them
// as the recombination units directly.
function extractDirectUnits(contentTexts) {
  return [...new Set(contentTexts.map((t) => t.trim().toLowerCase()))].filter(Boolean);
}

// phrase/paragraph module items are full sentences -- break every word in
// them down into syllables and use those as the recombination units instead,
// since there's no smaller pre-taught "unit" to reuse directly.
function extractSyllableUnits(contentTexts) {
  const words = contentTexts
    .join(' ')
    .toLowerCase()
    .split(/[^a-záéíóúâêîôûäëïöü]+/)
    .filter(Boolean);
  const syllables = words.flatMap((w) => syllabifyWord(w));
  // Single-letter fragments (e.g. a lone leftover consonant) don't make useful
  // decoding units on their own -- drop anything shorter than 2 characters.
  return [...new Set(syllables)].filter((s) => s.length >= 2);
}

// Returns up to `count` nonsense words for the given module, or [] if the
// module doesn't have enough taught units to safely recombine.
async function generateNonsenseWords(supabaseAdmin, moduleId, instructionalContentType, count = 4) {
  const { data: items, error: itemsErr } = await supabaseAdmin
    .from('reading_module_items')
    .select('content_id')
    .eq('module_id', moduleId)
    .eq('role', 'instruction');
  if (itemsErr) throw itemsErr;
  if (!items || items.length < 2) return [];

  const { data: content, error: contentErr } = await supabaseAdmin
    .from('reading_content')
    .select('content_text')
    .in(
      'id',
      items.map((i) => i.content_id),
    );
  if (contentErr) throw contentErr;
  const contentTexts = (content || []).map((c) => c.content_text).filter(Boolean);

  const isDirectUnit = instructionalContentType === 'phonetic' || instructionalContentType === 'word';
  const units = isDirectUnit ? extractDirectUnits(contentTexts) : extractSyllableUnits(contentTexts);
  if (units.length < 2) return [];

  // Paragraph-level (Advanced) content is harder, so its decoding check uses
  // 3-syllable nonsense words instead of 2 -- everything else stays 2.
  const unitCount = instructionalContentType === 'paragraph' ? 3 : 2;
  if (instructionalContentType === 'paragraph' && units.length < 3) return [];

  // Cap the candidate pool before the real-word lookup below -- 3-syllable
  // combos in particular can number in the hundreds, which would make an
  // .or() filter with one clause per candidate absurdly large for no benefit.
  const candidates = shuffled(combineUnits(units, unitCount)).slice(0, 30);
  if (candidates.length === 0) return [];

  // A nonsense-word check must not accidentally test memorization -- drop any
  // combo that happens to already be a real word elsewhere in the curriculum.
  const { data: realMatches, error: matchErr } = await supabaseAdmin
    .from('reading_content')
    .select('content_text')
    .or(candidates.map((c) => `content_text.ilike.${c}`).join(','));
  if (matchErr) throw matchErr;
  const realTexts = new Set((realMatches || []).map((r) => r.content_text.trim().toLowerCase()));

  return candidates.filter((c) => !realTexts.has(c)).slice(0, count);
}

module.exports = { generateNonsenseWords };
