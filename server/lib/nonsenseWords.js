// Generates made-up ("nonsense") words for a module's phonological decoding
// check, built only from the syllables/letters that exact module already
// taught (e.g. Module 2 "Hanay ng Ba" -> ba/be/bi/bo/bu -> "babu", "bibo").
// A student who can correctly sound these out demonstrated real grapheme-
// phoneme decoding, not memorized sight-reading -- the specific skill
// phonological dyslexia impairs. Nothing here is stored; it's regenerated
// per request from the module's own reading_content rows.

function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function combineUnits(units) {
  const combos = new Set();
  for (const a of units) {
    for (const b of units) {
      if (a === b) continue;
      combos.add(a + b);
    }
  }
  return [...combos];
}

// Returns up to `count` nonsense words for the given module, or [] if the
// module doesn't have enough taught units to safely recombine (e.g. phrase/
// paragraph modules, or a module with only 1 instructional item).
async function generateNonsenseWords(supabaseAdmin, moduleId, count = 4) {
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

  const units = [...new Set((content || []).map((c) => c.content_text.trim().toLowerCase()))].filter(Boolean);
  if (units.length < 2) return [];

  const candidates = shuffled(combineUnits(units));
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
