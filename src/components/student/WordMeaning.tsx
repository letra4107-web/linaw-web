import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { TTSButton } from '../a11y/TTSButton';
import { SlowTTSButton } from '../a11y/SlowTTSButton';

interface DefinitionRow {
  display_word: string | null;
  meaning_fil: string;
  example_sentence: string | null;
}

function normalizeWordKey(word: string) {
  return word
    .toLocaleLowerCase('fil-PH')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

async function loadMeaning(word: string): Promise<DefinitionRow | null> {
  const key = normalizeWordKey(word);
  if (!key) return null;

  // word_definitions contains reviewed homographs and examples. Curriculum
  // definitions are the fallback for the wider active word bank.
  const [curated, curriculum] = await Promise.all([
    supabase
      .from('word_definitions')
      .select('display_word, meaning_fil, example_sentence')
      .eq('word_key', key)
      .maybeSingle(),
    supabase
      .from('reading_content')
      .select('definition')
      .eq('content_text', word)
      .eq('content_type', 'word')
      .eq('is_active', true)
      .not('definition', 'is', null)
      .limit(1)
      .maybeSingle(),
  ]);

  if (curated.data) return curated.data as DefinitionRow;
  if (curriculum.data?.definition) {
    return { display_word: null, meaning_fil: curriculum.data.definition as string, example_sentence: null };
  }
  return null;
}

/** A quiet Filipino-only meaning card for word-level learning activities. */
export function WordMeaning({ word, className = '', compactControls = false, hideControls = false }: { word: string; className?: string; compactControls?: boolean; hideControls?: boolean }) {
  const { data: definition } = useQuery({
    queryKey: ['word-meaning', normalizeWordKey(word)],
    queryFn: () => loadMeaning(word),
    enabled: Boolean(normalizeWordKey(word)),
    staleTime: 5 * 60_000,
  });

  if (!definition) return null;

  const meaningToSpeak = [definition.meaning_fil, definition.example_sentence].filter(Boolean).join(' ');

  return (
    <section aria-label={`Kahulugan ng ${word}`} className={`w-full rounded-2xl border border-[var(--color-border)] bg-white/75 px-4 py-3 text-left ${className}`}>
      <p className="text-sm font-bold tracking-[0.1em] text-[var(--color-primary)] uppercase">Kahulugan</p>
      {definition.display_word && <p className="mt-1 text-base font-bold">{definition.display_word}</p>}
        <div className="mt-2 flex flex-wrap items-start gap-3">
          <p className="text-base leading-relaxed font-bold text-[var(--color-text)]">{definition.meaning_fil}</p>
          {!hideControls && <div className={compactControls ? 'student-word-meaning-controls flex w-full flex-col gap-2' : 'flex w-full flex-wrap gap-2'}><TTSButton text={meaningToSpeak} rate={0.5} className={compactControls ? 'inline-flex min-h-11 w-full justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-bold text-[var(--color-text)] hover:border-[var(--color-primary)]' : 'inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-bold text-[var(--color-text)] hover:border-[var(--color-primary)]'} /><SlowTTSButton text={meaningToSpeak} /></div>}
      </div>
      {definition.example_sentence && <p className="mt-2 border-l-2 border-[var(--color-primary)] pl-3 text-sm italic text-[var(--color-text-muted)]">Halimbawa: {definition.example_sentence}</p>}
    </section>
  );
}
