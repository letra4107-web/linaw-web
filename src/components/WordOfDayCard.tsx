import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/auth/AuthContext';
import { api } from '../lib/api';
import { getOrCreateWordOfDay, MAX_ATTEMPTS, BONUS_XP } from '../lib/wordOfDay';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce } from '../lib/speech';
import { syllabifyWord } from '../lib/syllabify';
import { CORRECT_MESSAGES, ENCOURAGE_MESSAGES, randomFrom } from '../lib/feedbackMessages';
import { SyllableKaraokeText } from './SyllableKaraokeText';
import { PronunciationFeedback } from './PronunciationFeedback';
import { IconLabel } from './a11y/IconLabel';

interface WordOfDayCardProps {
  streak?: number;
}


export function WordOfDayCard({ streak = 0 }: WordOfDayCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [listening, setListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const [wasWrongAttempt, setWasWrongAttempt] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  // Only true once an attempt has actually been submitted in this page session -- keeps the
  // "done" banner from re-speaking/re-confetti-ing a result the student already heard, on a
  // plain page refresh that lands on an already-completed word.
  const [justAnswered, setJustAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAwardedXp, setJustAwardedXp] = useState<number | null>(null);
  const [activeSyllable, setActiveSyllable] = useState<number | null>(null);
  const [karaokeLoading, setKaraokeLoading] = useState(false);
  const karaokeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      karaokeAudioRef.current?.pause();
    };
  }, []);

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
  // Stable fallback for a page load that lands on an already-completed word (no local
  // attempt just happened to pick a message) -- memoized so it doesn't re-roll on re-render.
  const fallbackDoneMessage = useMemo(
    () => (wordOfDay?.correct ? randomFrom(CORRECT_MESSAGES) : randomFrom(ENCOURAGE_MESSAGES)),
    [wordOfDay?.id, wordOfDay?.correct],
  );
  const canTry = wordOfDay && !isDone && attemptsUsed < MAX_ATTEMPTS && isSpeechRecognitionSupported();

  const stopKaraoke = () => {
    karaokeAudioRef.current?.pause();
    karaokeAudioRef.current = null;
    setActiveSyllable(null);
  };

  const playKaraoke = async (rate: number) => {
    if (!wordOfDay) return;
    stopKaraoke();
    setKaraokeLoading(true);
    setError(null);
    try {
      const syllables = syllabifyWord(wordOfDay.word);
      const res = await api<{ audioContent: string; timepoints: { markName: string; timeSeconds: number }[] }>(
        '/tts/speak-syllables',
        { method: 'POST', body: { syllables, rate } },
      );
      const bytes = atob(res.audioContent);
      const buffer = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
      const audio = new Audio(url);
      karaokeAudioRef.current = audio;

      audio.ontimeupdate = () => {
        let idx: number | null = null;
        for (let i = 0; i < res.timepoints.length; i += 1) {
          if (res.timepoints[i].timeSeconds <= audio.currentTime) idx = i;
        }
        setActiveSyllable(idx);
      };
      audio.onended = () => {
        setActiveSyllable(null);
        karaokeAudioRef.current = null;
        URL.revokeObjectURL(url);
      };

      setKaraokeLoading(false);
      audio.play();
    } catch {
      setKaraokeLoading(false);
      setError('Hindi ma-play ang audio ngayon.');
    }
  };

  const handleTry = () => {
    if (!wordOfDay) return;
    stopKaraoke();
    setError(null);
    setWasWrongAttempt(false);
    setListening(true);
    listenOnce(
      'fil-PH',
      async (transcript) => {
        setListening(false);
        setLastHeard(transcript);
        const accuracy = computeAccuracy(wordOfDay.word, transcript);
        // Only an exact pronunciation match counts as "correct" -- a near match keeps the
        // remaining tries (of the 3 total) open instead of ending the word early.
        const correct = accuracy === 100;
        const nextAttempts = attemptsUsed + 1;

        try {
          const res = await api<{ xpAwarded: number; isFinal: boolean; correct: boolean | null }>(
            '/student/word-of-day/attempt',
            {
              method: 'POST',
              auth: true,
              body: { logId: wordOfDay.id, attempts: nextAttempts, correct, accuracy, bonusXp: BONUS_XP },
            },
          );
          if (res.isFinal && res.correct) setJustAwardedXp(res.xpAwarded);
          setFeedbackMessage(res.isFinal && res.correct ? randomFrom(CORRECT_MESSAGES) : randomFrom(ENCOURAGE_MESSAGES));
          setJustAnswered(true);
          if (!res.isFinal) setWasWrongAttempt(true);
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
    <div id="salita-ngayon" className="overflow-hidden rounded-2xl shadow-lg">
      <div
        className="p-6 text-white sm:p-8"
        style={{ backgroundImage: 'linear-gradient(135deg, #e3971a, #e06b4c)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold sm:text-xl">
            <IconLabel icon="📅" label="Salita Ngayon" />
          </h2>
          {streak > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur">
              🔥 Sunod-sunod!
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-white/85">Bigkasin nang malakas ang salita sa ibaba.</p>
      </div>

      <div
        className="p-6 sm:p-8"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-brand-sun) 10%, white)' }}
      >
        <div className="flex min-h-28 flex-col items-center justify-center gap-4 rounded-2xl bg-white/70 px-6 py-7 text-center shadow-inner">
          <SyllableKaraokeText syllables={syllabifyWord(wordOfDay.word)} activeIndex={activeSyllable} colorVar="--color-brand-sun" />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => playKaraoke(1)}
              disabled={karaokeLoading}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] disabled:opacity-60"
            >
              <IconLabel icon="🔊" label="Basahin nang Malakas" />
            </button>
            <button
              type="button"
              onClick={() => playKaraoke(0.5)}
              disabled={karaokeLoading}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] disabled:opacity-60"
            >
              <IconLabel icon="🐢" label={karaokeLoading ? 'Naglo-load...' : 'Pantig-pantig'} />
            </button>
          </div>
        </div>

        {isDone ? (
          <PronunciationFeedback
            className="mt-5"
            correct={Boolean(wordOfDay.correct)}
            message={wordOfDay.correct ? `${feedbackMessage || fallbackDoneMessage} +${wordOfDay.xp_awarded} XP` : feedbackMessage || fallbackDoneMessage}
            speakText={feedbackMessage || fallbackDoneMessage}
            hint="Magaling! Natapos mo na ito, bumalik bukas para sa susunod na salita."
            word={!wordOfDay.correct ? wordOfDay.word : undefined}
            autoPlay={justAnswered}
          />
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3">
            {!isSpeechRecognitionSupported() ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Hindi suportado ng browser na ito ang pagkilala ng boses.
              </p>
            ) : (
              canTry && (
                <>
                  <button
                    type="button"
                    onClick={handleTry}
                    disabled={listening}
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 ${
                      listening ? 'bg-[var(--color-danger)]' : ''
                    }`}
                    style={!listening ? { backgroundImage: 'linear-gradient(135deg, #e3971a, #e06b4c)' } : undefined}
                  >
                    {listening && <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-danger)]/60" />}
                    <span className="relative">🎤</span>
                  </button>
                  <p className="text-sm font-medium text-[var(--color-text-muted)]">
                    {listening ? 'Nakikinig...' : 'Pindutin ang mic at bigkasin'}
                  </p>
                </>
              )
            )}

            {lastHeard && wasWrongAttempt && (
              <PronunciationFeedback
                className="w-full"
                correct={false}
                message={feedbackMessage}
                detail={`Narinig ko: "${lastHeard}"`}
                hint="Ulitin natin, pakinggan mo ang tamang bigkas! 🔊"
                word={wordOfDay.word}
              />
            )}
            {lastHeard && !wasWrongAttempt && !isDone && (
              <p className="text-sm text-[var(--color-text-muted)]">Narinig: "{lastHeard}"</p>
            )}
            {error && (
              <p className="w-full rounded-xl bg-[var(--color-danger-soft)] px-4 py-2.5 text-center text-sm text-[var(--color-danger)]">
                {error}
              </p>
            )}

            <div className="mt-1 flex items-center gap-2" role="img" aria-label={`${attemptsUsed} sa ${MAX_ATTEMPTS} pagsubok ang nagamit`}>
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    i < attemptsUsed ? 'bg-[var(--color-brand-sun)]' : 'border border-[var(--color-border)] bg-white'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {justAwardedXp !== null && <span className="sr-only">Nakakuha ng {justAwardedXp} XP</span>}
    </div>
  );
}
