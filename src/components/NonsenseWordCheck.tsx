import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { assessSpeech, isSpeechRecognitionSupported, listenOnce } from '../lib/speech';
import { IconLabel } from './a11y/IconLabel';
import { AppIcon } from './a11y/AppIcon';
import { BadgeUnlockToast } from './BadgeUnlockToast';
import { cardStyle } from '../lib/cardStyle';

interface NonsenseCheckResponse {
  available: boolean;
  alreadyCompleted: boolean;
  score?: number;
  words: NonsenseWord[];
}

interface NonsenseWord { id: string; word: string; }

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
  const [attempts, setAttempts] = useState<Record<string, { transcript: string }>>({});
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
        body: { results: Object.entries(attempts).map(([itemId, attempt]) => ({ itemId, transcript: attempt.transcript })) },
      }),
    onSuccess: (res) => {
      setResult(res);
      if (res.newlyUnlockedBadges?.length) setNewlyUnlockedBadges(res.newlyUnlockedBadges);
      queryClient.invalidateQueries({ queryKey: ['nonsense-check', moduleId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const attempt = (item: NonsenseWord) => {
    if (!isSpeechRecognitionSupported()) {
      setError('Hindi suportado ng browser mo ang speech recognition. Subukan sa Chrome.');
      return;
    }
    setError(null);
    setListeningFor(item.id);
    listenOnce(
      'fil-PH',
      ({ transcript, confidence }) => {
        setListeningFor(null);
        const assessment = assessSpeech(item.word, transcript, confidence);
        if (assessment.outcome === 'retry') { setError(assessment.message); return; }
        setAttempts((prev) => ({ ...prev, [item.id]: { transcript } }));
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
  const allAttempted = words.every((item) => attempts[item.id]);
  const attemptedCount = words.filter((item) => attempts[item.id]).length;
  const currentItemId = words.find((item) => !attempts[item.id])?.id;

  return (
    <div className="rounded-xl border p-6" style={cardStyle('--color-brand-teal')}>
      <h2 className="mb-1 text-lg font-semibold">
        <IconLabel icon="🧩" label="Pagsubok sa Bagong Tunog" />
      </h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Hindi totoong salita ang mga ito -- gawa lang mula sa mga tunog na natutuhan mo sa modyul na ito. Subukan mong basahin
        ang bawat isa gamit ang tamang tunog.
      </p>

      <div className="mb-5" role="progressbar" aria-label="Progreso sa pagsubok sa bagong tunog" aria-valuemin={0} aria-valuemax={words.length} aria-valuenow={attemptedCount}>
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-[var(--color-text-muted)]"><span>Basahin ang bawat salita</span><span>{attemptedCount}/{words.length}</span></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/75 shadow-inner"><div className="h-full rounded-full bg-[var(--color-brand-teal)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(attemptedCount / words.length) * 100}%` }} /></div>
      </div>

      {error && <p role="alert" className="mb-3 rounded-xl bg-[var(--color-danger-soft)] px-4 py-3 text-[var(--color-danger)]">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {words.map((item) => {
          const done = attempts[item.id];
          return (
            <div
              key={item.id}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center ${
                done ? 'border-[var(--color-success)] bg-[var(--color-success-soft)]' : currentItemId === item.id ? 'border-2 border-[var(--color-brand-teal)] bg-white shadow-card' : 'bg-white/70'
              }`}
            >
              {currentItemId === item.id && <span className="text-xs font-bold text-[var(--color-brand-teal)]">Susunod na salita</span>}
              <p className="text-2xl font-bold tracking-wide">{item.word}</p>
              <button
                type="button"
                onClick={() => attempt(item)}
                disabled={listeningFor === item.id}
                className="min-h-11 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white disabled:opacity-60"
              >
                <IconLabel icon="🎤" label={listeningFor === item.id ? 'Nakikinig...' : done ? 'Ulitin' : 'Bigkasin'} />
              </button>
              {done && <span className="inline-flex items-center gap-1 text-xs"><AppIcon name="✅" className="h-4 w-4" />Handa nang isumite</span>}
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
