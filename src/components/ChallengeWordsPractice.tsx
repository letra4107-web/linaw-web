import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce } from '../lib/speech';
import { IconLabel } from './a11y/IconLabel';
import { TTSButton } from './a11y/TTSButton';
import { cardStyle } from '../lib/cardStyle';

interface ChallengeWordsResponse {
  available: boolean;
  words: string[];
}

interface ChallengeWordsPracticeProps {
  moduleId: string;
}

// Decoding warm-up shown before a story: the story's own hardest (3+
// syllable, often affixed) words, practiced in isolation first. Purely
// formative -- no XP, no persistence, no gating of the story itself. The
// point is pre-teaching, not testing, so a student isn't hitting these words
// for the first time mid-story. Renders null entirely if the module has
// nothing to offer (not a paragraph-type module, or too short).
export function ChallengeWordsPractice({ moduleId }: ChallengeWordsPracticeProps) {
  const [attempted, setAttempted] = useState<Record<string, boolean>>({});
  const [listeningFor, setListeningFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['challenge-words', moduleId],
    queryFn: () => api<ChallengeWordsResponse>(`/student/learn/module/${moduleId}/challenge-words`, { auth: true }),
  });

  const attempt = (word: string) => {
    if (!isSpeechRecognitionSupported()) {
      setError('Hindi suportado ng browser mo ang speech recognition. Subukan sa Chrome.');
      return;
    }
    setError(null);
    setListeningFor(word);
    listenOnce(
      'fil-PH',
      (transcript) => {
        setListeningFor(null);
        // Any attempt counts as practiced -- this is a warm-up, not a pass/fail check,
        // so even a near-miss still marks the word as "tried" rather than blocking retry.
        void computeAccuracy(word, transcript);
        setAttempted((prev) => ({ ...prev, [word]: true }));
      },
      (message) => {
        setListeningFor(null);
        setError(message);
      },
    );
  };

  if (isLoading || !data?.available) return null;

  const doneCount = Object.values(attempted).filter(Boolean).length;

  return (
    <section className="rounded-2xl border p-6 sm:p-8" style={cardStyle('--color-brand-amber', 6, 25)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            <IconLabel icon="🎯" label="Mga Salitang Hahamunin" />
          </h2>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-[var(--color-text-muted)]">
            Bago basahin ang kwento, subukan mo munang bigkasin ang mga mahihirap na salita na makikita mo roon.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-white/80 px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
          {doneCount}/{data.words.length} nasubukan
        </span>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data.words.map((word) => {
          const done = attempted[word];
          return (
            <div
              key={word}
              className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition-colors ${
                done ? 'border-[var(--color-success)] bg-[var(--color-success-soft)]' : 'border-[var(--color-border)] bg-white'
              }`}
            >
              <p className="text-xl font-bold break-words">{word}</p>

              <TTSButton text={word} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm hover:border-[var(--color-primary)] focus-visible:outline-3 disabled:opacity-60" />

              <button
                type="button"
                onClick={() => attempt(word)}
                disabled={listeningFor === word}
                className="w-full rounded-full bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <IconLabel icon="🎤" label={listeningFor === word ? 'Nakikinig...' : done ? 'Ulitin' : 'Bigkasin'} />
              </button>

              <span className={`text-xs font-medium ${done ? 'text-[var(--color-success)]' : 'text-transparent'}`}>
                ✅ Nasubukan na
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
