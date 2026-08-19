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

  return (
    <div className="rounded-xl border p-6" style={cardStyle('--color-brand-amber')}>
      <h2 className="mb-1 text-lg font-semibold">
        <IconLabel icon="🎯" label="Mga Salitang Hahamunin" />
      </h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Bago basahin ang kwento, subukan mo munang bigkasin ang mga mahihirap na salita na makikita mo roon.
      </p>

      {error && <p className="mb-3 text-[var(--color-danger)]">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {data.words.map((word) => (
          <div
            key={word}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center ${
              attempted[word] ? 'border-[var(--color-success)] bg-[var(--color-success-soft)]' : 'bg-white/70'
            }`}
          >
            <p className="text-xl font-bold">{word}</p>
            <TTSButton text={word} />
            <button
              type="button"
              onClick={() => attempt(word)}
              disabled={listeningFor === word}
              className="rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              <IconLabel icon="🎤" label={listeningFor === word ? 'Nakikinig...' : attempted[word] ? 'Ulitin' : 'Bigkasin'} />
            </button>
            {attempted[word] && <span className="text-xs text-[var(--color-success)]">✅ Nasubukan na</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
