import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce } from '../lib/speech';
import { IconLabel } from './a11y/IconLabel';
import { BadgeUnlockToast } from './BadgeUnlockToast';
import { cardStyle } from '../lib/cardStyle';

interface NonsenseCheckResponse {
  available: boolean;
  alreadyCompleted: boolean;
  score?: number;
  words: string[];
}

interface SubmitResponse {
  success: boolean;
  alreadyCompleted: boolean;
  score: number;
  xpAwarded: number;
  newlyUnlockedBadges?: string[];
}

interface NonsenseWordCheckProps {
  moduleId: string;
}

// Phonological-dyslexia-focused decoding check: the student reads aloud a
// handful of made-up words built from that module's own taught syllables --
// unlike the real assessment, this can't be passed by memorized sight-reading,
// only by actually decoding the sound pattern. Hidden entirely (renders null)
// for modules where the backend has nothing to offer (phrase/paragraph
// modules, or not enough taught units to safely recombine).
export function NonsenseWordCheck({ moduleId }: NonsenseWordCheckProps) {
  const queryClient = useQueryClient();
  const [attempts, setAttempts] = useState<Record<string, { transcript: string; correct: boolean }>>({});
  const [listeningFor, setListeningFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['nonsense-check', moduleId],
    queryFn: () => api<NonsenseCheckResponse>(`/student/learn/module/${moduleId}/nonsense-check`, { auth: true }),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      api<SubmitResponse>(`/student/learn/module/${moduleId}/nonsense-check/submit`, {
        method: 'POST',
        auth: true,
        body: { results: Object.entries(attempts).map(([word, a]) => ({ word, correct: a.correct })) },
      }),
    onSuccess: (res) => {
      setResult(res);
      if (res.newlyUnlockedBadges?.length) setNewlyUnlockedBadges(res.newlyUnlockedBadges);
      queryClient.invalidateQueries({ queryKey: ['nonsense-check', moduleId] });
    },
    onError: (err: Error) => setError(err.message),
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
        const correct = computeAccuracy(word, transcript) === 100;
        setAttempts((prev) => ({ ...prev, [word]: { transcript, correct } }));
      },
      (message) => {
        setListeningFor(null);
        setError(message);
      },
    );
  };

  if (isLoading || !data?.available) return null;

  if (data.alreadyCompleted || result) {
    const score = result?.score ?? data.score ?? 0;
    return (
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-teal')}>
        <h2 className="mb-1 text-lg font-semibold">
          <IconLabel icon="🧩" label="Pagsubok sa Bagong Tunog" />
        </h2>
        <p className="text-[var(--color-text-muted)]">
          Natapos na — {score}% ang naibigay mong tamang bigkas sa mga bagong salita.
        </p>
        <BadgeUnlockToast badgeIds={newlyUnlockedBadges} onDismiss={() => setNewlyUnlockedBadges([])} />
      </div>
    );
  }

  const words = data.words;
  const allAttempted = words.every((w) => attempts[w]);

  return (
    <div className="rounded-xl border p-6" style={cardStyle('--color-brand-teal')}>
      <h2 className="mb-1 text-lg font-semibold">
        <IconLabel icon="🧩" label="Pagsubok sa Bagong Tunog" />
      </h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Hindi totoong salita ang mga ito -- gawa lang mula sa mga tunog na natutuhan mo sa modyul na ito. Subukan mong basahin
        ang bawat isa gamit ang tamang tunog.
      </p>

      {error && <p className="mb-3 text-[var(--color-danger)]">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {words.map((word) => {
          const done = attempts[word];
          return (
            <div
              key={word}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center ${
                done ? (done.correct ? 'border-[var(--color-success)] bg-[var(--color-success-soft)]' : 'border-[var(--color-danger)]') : 'bg-white/70'
              }`}
            >
              <p className="text-2xl font-bold">{word}</p>
              <button
                type="button"
                onClick={() => attempt(word)}
                disabled={listeningFor === word}
                className="rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white disabled:opacity-60"
              >
                <IconLabel icon="🎤" label={listeningFor === word ? 'Nakikinig...' : done ? 'Ulitin' : 'Bigkasin'} />
              </button>
              {done && <span className="text-xs">{done.correct ? '✅ Tama' : '❌ Ulitin natin'}</span>}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!allAttempted || submitMutation.isPending}
        onClick={() => submitMutation.mutate()}
        className="mt-4 self-start rounded-full bg-[var(--color-accent)] px-6 py-2.5 font-medium text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised active:scale-95 disabled:translate-y-0 disabled:opacity-60"
      >
        {submitMutation.isPending ? 'Isinusumite...' : 'Isumite'}
      </button>
    </div>
  );
}
