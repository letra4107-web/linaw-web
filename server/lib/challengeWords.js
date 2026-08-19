// Pulls out the hardest (3+ syllable) real words from a module's own story
// text, for a short decoding warm-up shown before the story itself. Unlike
// nonsenseWords.js, these are genuine words straight from the story -- the
// point isn't to test blending in the abstract, it's to pre-teach the exact
// words most likely to trip up a phonological-dyslexia reader (typically
// Filipino's morphologically complex, affixed words: naka-, pinag-, -an...)
// before they hit them mid-story.
const { syllabifyWord } = require('./syllabify');

const MIN_SYLLABLES = 3;
const MAX_WORDS = 5;

async function extractChallengeWords(supabaseAdmin, moduleId, count = MAX_WORDS) {
  const { data: items, error: itemsErr } = await supabaseAdmin
    .from('reading_module_items')
    .select('content_id')
    .eq('module_id', moduleId)
    .eq('role', 'instruction');
  if (itemsErr) throw itemsErr;
  if (!items || items.length === 0) return [];

  const { data: content, error: contentErr } = await supabaseAdmin
    .from('reading_content')
    .select('content_text')
    .in(
      'id',
      items.map((i) => i.content_id),
    );
  if (contentErr) throw contentErr;

  const allWords = (content || [])
    .map((c) => c.content_text || '')
    .join(' ')
    .toLowerCase()
    .split(/[^a-záéíóúâêîôûäëïöü]+/)
    .filter(Boolean);

  const seen = new Set();
  const challengeWords = [];
  for (const word of allWords) {
    if (seen.has(word)) continue;
    seen.add(word);
    if (syllabifyWord(word).length >= MIN_SYLLABLES) challengeWords.push(word);
  }

  return challengeWords.slice(0, count);
}

module.exports = { extractChallengeWords };
