import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/auth/AuthContext';
import { api } from '../lib/api';
import { getOrCreateWordOfDay, MAX_ATTEMPTS, BONUS_XP } from '../lib/wordOfDay';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce } from '../lib/speech';
import { TTSButton } from './a11y/TTSButton';
import { IconLabel } from './a11y/IconLabel';

export function WordOfDayCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [listening, setListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justAwardedXp, setJustAwardedXp] = useState<number | null>(null);

  const { data: child } = useQuery({
    queryKey: ['student-self', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase.from('children').select('id, grade_level').eq('auth_uid', user!.id).maybeSingle();
      if (err) throw err;
      return data as { id: string; grade_level: number } | null;
    },
    enabled: Boolean(user),
  });

  const { data: path } = useQuery({
    queryKey: ['student-learn-path'],
    queryFn: () => api<{ effective_level: string }>('/student/learn/path', { auth: true }),
    enabled: Boolean(user),
  });

  const { data: wordOfDay, isLoading } = useQuery({
    queryKey: ['word-of-day', child?.id, path?.effective_level],
    queryFn: () => getOrCreateWordOfDay(child!.id, path!.effective_level || 'Beginner'),
    enabled: Boolean(child?.id) && Boolean(path?.effective_level),
  });

  const attemptsUsed = wordOfDay?.attempts ?? 0;
  const isDone = Boolean(wordOfDay?.completed_at);
  const canTry = wordOfDay && !isDone && attemptsUsed < MAX_ATTEMPTS && isSpeechRecognitionSupported();

  const handleTry = () => {
    if (!wordOfDay) return;
    setError(null);
    setListening(true);
    listenOnce(
      'fil-PH',
      async (transcript) => {
        setListening(false);
        setLastHeard(transcript);
        const accuracy = computeAccuracy(wordOfDay.word, transcript);
        const correct = accuracy >= 70;
        const nextAttempts = attemptsUsed + 1;

        try {
          const res = await api<{ xpAwarded: number }>('/student/word-of-day/attempt', {
            method: 'POST',
            auth: true,
            body: { logId: wordOfDay.id, attempts: nextAttempts, correct, accuracy, bonusXp: BONUS_XP },
          });
          if (correct) setJustAwardedXp(res.xpAwarded);
          queryClient.invalidateQueries({ queryKey: ['word-of-day'] });
          queryClient.invalidateQueries({ queryKey: ['student-progress'] });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'May problema sa pag-save ng sagot.');
        }
      },
      (message) => {
        setListening(false);
        setError(message);
      },
    );
  };

  if (isLoading || !wordOfDay) return null;

  return (
    <div className="rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-6">
      <h2 className="mb-1 text-lg font-semibold">
        <IconLabel icon="🔤" label="Salita Ngayong Araw" />
      </h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">Bigkasin nang malakas ang salita sa ibaba.</p>

      <div className="mb-4 flex items-center gap-3">
        <p className="text-3xl font-semibold text-[var(--color-primary)]">{wordOfDay.word}</p>
        <TTSButton text={wordOfDay.word} />
      </div>

      {isDone ? (
        <p className="text-sm font-medium">
          {wordOfDay.correct ? (
            <IconLabel icon="🎉" label={`Tama! +${wordOfDay.xp_awarded} XP`} />
          ) : (
            <IconLabel icon="👍" label="Magandang subok! Bukas na lang ulit." />
          )}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {!isSpeechRecognitionSupported() && (
            <p className="text-sm text-[var(--color-text-muted)]">
              Hindi suportado ng browser na ito ang pagkilala ng boses.
            </p>
          )}
          {canTry && (
            <button
              type="button"
              onClick={handleTry}
              disabled={listening}
              className="self-start rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm text-white disabled:opacity-60"
            >
              <IconLabel icon="🎤" label={listening ? 'Nakikinig...' : 'Bigkasin'} />
            </button>
          )}
          {lastHeard && <p className="text-sm text-[var(--color-text-muted)]">Narinig: "{lastHeard}"</p>}
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <p className="text-xs text-[var(--color-text-muted)]">
            Pagsubok: {attemptsUsed}/{MAX_ATTEMPTS}
          </p>
        </div>
      )}
      {justAwardedXp !== null && <span className="sr-only">Nakakuha ng {justAwardedXp} XP</span>}
    </div>
  );
}
