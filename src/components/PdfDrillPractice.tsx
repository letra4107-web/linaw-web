import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce } from '../lib/speech';
import { CORRECT_MESSAGES, ENCOURAGE_MESSAGES, randomFrom } from '../lib/feedbackMessages';
import { TTSButton } from './a11y/TTSButton';
import { SyllableKaraokeText } from './SyllableKaraokeText';
import { PronunciationFeedback } from './PronunciationFeedback';
import { IconLabel } from './a11y/IconLabel';
import { cardStyle } from '../lib/cardStyle';

interface DrillItem {
  id: string;
  band_index: number;
  item_order: number;
  syllable_pattern: string;
  word: string;
  image_url: string | null;
  xp_value: number;
}

interface DrillResponse {
  title: string;
  items: DrillItem[];
  completedItemIds: string[];
}

interface PdfDrillPracticeProps {
  assignmentId: string;
}

export function PdfDrillPractice({ assignmentId }: PdfDrillPracticeProps) {
  const queryClient = useQueryClient();
  const [listening, setListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const [result, setResult] = useState<{ correct: boolean; message: string; xpAwarded: number } | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pdf-drill', assignmentId],
    queryFn: () => api<DrillResponse>(`/student/pdf-drill/${assignmentId}`, { auth: true }),
  });

  const items = data?.items ?? [];
  const completedIds = useMemo(() => new Set(data?.completedItemIds ?? []), [data?.completedItemIds]);
  const remaining = items.filter((item) => !completedIds.has(item.id));
  const current = remaining[0] ?? null;
  const totalDone = items.length - remaining.length;

  const attempt = async () => {
    if (!current) return;
    setSpeechError(null);
    setListening(true);
    listenOnce(
      'fil-PH',
      async (transcript) => {
        setListening(false);
        setLastHeard(transcript);
        const accuracy = computeAccuracy(current.word, transcript);
        const correct = accuracy === 100;

        try {
          const res = await api<{ xpAwarded: number; drillCompleted: boolean }>('/student/pdf-drill/attempt', {
            method: 'POST',
            auth: true,
            body: { assignmentId, drillItemId: current.id, transcript, accuracy, correct },
          });
          setResult({
            correct,
            message: correct ? randomFrom(CORRECT_MESSAGES) : randomFrom(ENCOURAGE_MESSAGES),
            xpAwarded: res.xpAwarded,
          });
          if (correct) {
            queryClient.invalidateQueries({ queryKey: ['pdf-drill', assignmentId] });
            queryClient.invalidateQueries({ queryKey: ['student-progress'] });
          }
        } catch (err) {
          setSpeechError(err instanceof Error ? err.message : 'May problema sa pag-save ng sagot.');
        }
      },
      (message) => {
        setListening(false);
        setSpeechError(message);
      },
    );
  };

  const next = () => {
    setResult(null);
    setLastHeard('');
    // The just-completed item drops out of `remaining` once the query refetches, so the
    // cursor naturally lands on the next uncompleted item without needing to advance it.
  };

  if (isLoading) return <p>Naglo-load...</p>;
  if (items.length === 0) return <p className="text-[var(--color-text-muted)]">Walang laman ang pagsasanay na ito.</p>;

  if (!current) {
    return (
      <div className="rounded-2xl border p-8 text-center shadow-card" style={cardStyle('--color-brand-sage', 10, 35)}>
        <p className="text-4xl">🎉</p>
        <p className="mt-2 text-lg font-semibold">Tapos na ang buong pagsasanay!</p>
        <p className="text-[var(--color-text-muted)]">Nabasa mo lahat ng {items.length} salita.</p>
      </div>
    );
  }

  const syllables = current.syllable_pattern.split('-').filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
        <span>
          Salita {totalDone + 1} ng {items.length}
        </span>
        <span className="rounded-full bg-white/70 px-3 py-1 font-semibold text-[var(--color-brand-sun)]">
          +{current.xp_value} XP
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${(totalDone / items.length) * 100}%`,
            backgroundImage: 'linear-gradient(90deg, var(--color-hero-from), var(--color-hero-via))',
          }}
        />
      </div>

      <div
        className="flex min-h-40 flex-col items-center justify-center gap-4 rounded-2xl px-6 py-8 text-center shadow-inner"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-brand-lavender) 10%, white)' }}
      >
        {current.image_url && (
          <img src={current.image_url} alt="" className="h-24 w-24 rounded-xl object-contain" />
        )}
        <SyllableKaraokeText syllables={syllables} activeIndex={null} colorVar="--color-brand-lavender" />
        <TTSButton text={current.word} />
      </div>

      {result ? (
        <>
          <PronunciationFeedback
            correct={result.correct}
            message={result.correct ? `${result.message} +${result.xpAwarded} XP` : result.message}
            speakText={result.message}
            word={!result.correct ? current.word : undefined}
            hint={result.correct ? undefined : `Narinig ko: "${lastHeard}"`}
          />
          <button
            type="button"
            onClick={next}
            className="self-center rounded-full bg-[var(--color-primary)] px-6 py-3 font-medium text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised active:scale-95"
          >
            Susunod
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {!isSpeechRecognitionSupported() ? (
            <p className="text-sm text-[var(--color-text-muted)]">Hindi suportado ng browser na ito ang pagkilala ng boses.</p>
          ) : (
            <button
              type="button"
              onClick={attempt}
              disabled={listening}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 ${
                listening ? 'bg-[var(--color-danger)]' : ''
              }`}
              style={!listening ? { backgroundImage: 'linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via))' } : undefined}
            >
              {listening && <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-danger)]/60" />}
              <span className="relative">🎤</span>
            </button>
          )}
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            {listening ? 'Nakikinig...' : 'Pindutin ang mic at bigkasin'}
          </p>
          {speechError && (
            <p className="w-full rounded-xl bg-[var(--color-danger-soft)] px-4 py-2.5 text-center text-sm text-[var(--color-danger)]">
              <IconLabel icon="⚠️" label={speechError} />
            </p>
          )}
        </div>
      )}
    </div>
  );
}
