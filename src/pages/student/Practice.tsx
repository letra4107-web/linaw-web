import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce } from '../../lib/speech';
import { syllabifyWord } from '../../lib/syllabify';
import { CORRECT_MESSAGES, ENCOURAGE_MESSAGES, randomFrom } from '../../lib/feedbackMessages';
import { TTSButton } from '../../components/a11y/TTSButton';
import { SyllableKaraokeText } from '../../components/SyllableKaraokeText';
import { PronunciationFeedback } from '../../components/PronunciationFeedback';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle } from '../../lib/cardStyle';
import speechIcon from '../../assets/speech.png';

type Mode = 'say' | 'listen';

interface WordRow {
  id: string;
  word: string;
}

const MODE_THEME: Record<Mode, { brand: string; from: string; to: string }> = {
  say: { brand: '--color-brand-coral', from: '#e06b4c', to: '#e3971a' },
  listen: { brand: '--color-brand-teal', from: '#0d9488', to: '#7c6fcf' },
};

function pickRandom(words: WordRow[], excludeId?: string): WordRow | undefined {
  const pool = excludeId ? words.filter((w) => w.id !== excludeId) : words;
  const source = pool.length > 0 ? pool : words;
  if (source.length === 0) return undefined;
  return source[Math.floor(Math.random() * source.length)];
}

// Keeps the same practice word across a page reload/refresh -- only "Susunod na Salita"
// (or a completed attempt) should ever swap it out, not simply navigating back to the page.
const CURRENT_WORD_STORAGE_KEY = 'linawletra-practice-current-word';

function readSavedWord(words: WordRow[]): WordRow | undefined {
  const savedId = sessionStorage.getItem(CURRENT_WORD_STORAGE_KEY);
  return savedId ? words.find((w) => w.id === savedId) : undefined;
}

function saveCurrentWord(word: WordRow | null) {
  if (word) sessionStorage.setItem(CURRENT_WORD_STORAGE_KEY, word.id);
  else sessionStorage.removeItem(CURRENT_WORD_STORAGE_KEY);
}

export default function Practice() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: Mode = searchParams.get('mode') === 'listen' ? 'listen' : 'say';
  const theme = MODE_THEME[mode];

  const [current, setCurrent] = useState<WordRow | null>(null);
  const [listening, setListening] = useState(false);
  const [lastResult, setLastResult] = useState<{ transcript: string; accuracy: number; correct: boolean; message: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'loading' | 'speaking'>('idle');
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);

  const { data: child } = useQuery({
    queryKey: ['student-self', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase.from('children').select('id').eq('auth_uid', user!.id).maybeSingle();
      if (err) throw err;
      return data as { id: string } | null;
    },
    enabled: Boolean(user),
  });

  const { data: path } = useQuery({
    queryKey: ['student-learn-path'],
    queryFn: () => api<{ effective_level: string }>('/student/learn/path', { auth: true }),
    enabled: Boolean(user),
  });

  const { data: words, isLoading: loadingWords } = useQuery({
    queryKey: ['practice-words', path?.effective_level],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('words')
        .select('id, word')
        .eq('level', (path!.effective_level || 'Beginner').toLowerCase())
        .limit(200);
      if (err) throw err;
      return data as WordRow[];
    },
    enabled: Boolean(path?.effective_level),
  });

  useEffect(() => {
    if (words && words.length > 0 && !current) {
      const restored = readSavedWord(words) ?? pickRandom(words) ?? null;
      setCurrent(restored);
      saveCurrentWord(restored);
    }
  }, [words, current]);

  useEffect(() => {
    return () => {
      speechAudioRef.current?.pause();
    };
  }, []);

  const stopSpeech = () => {
    speechAudioRef.current?.pause();
    speechAudioRef.current = null;
    setSpeechStatus('idle');
  };

  const nextWord = () => {
    if (!words) return;
    stopSpeech();
    const next = pickRandom(words, current?.id) ?? null;
    setCurrent(next);
    saveCurrentWord(next);
    setLastResult(null);
    setError(null);
  };

  const switchMode = (next: Mode) => {
    stopSpeech();
    setSearchParams({ mode: next });
    setLastResult(null);
    setError(null);
    setStreak(0);
  };

  // Plays the whole word in one continuous TTS call -- same endpoint used everywhere else in
  // the app. The old syllable-by-syllable karaoke feature synthesized each syllable via a
  // separate marked-SSML call, which sometimes came out mispronounced (reading like English
  // instead of Tagalog); reading the full word at once avoids that.
  const playWord = async () => {
    if (!current) return;
    if (speechStatus === 'speaking') {
      stopSpeech();
      return;
    }
    setSpeechStatus('loading');
    setError(null);
    try {
      const res = await api<{ audioContent: string }>('/tts', { method: 'POST', body: { text: current.word } });
      const bytes = atob(res.audioContent);
      const buffer = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
      const audio = new Audio(url);
      speechAudioRef.current = audio;
      audio.onended = () => {
        setSpeechStatus('idle');
        speechAudioRef.current = null;
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => setSpeechStatus('idle');
      setSpeechStatus('speaking');
      audio.play();
    } catch {
      setSpeechStatus('idle');
      setError('Hindi ma-play ang audio ngayon.');
    }
  };

  const handleTry = () => {
    if (!current || !child) return;
    setError(null);
    setListening(true);
    listenOnce(
      'fil-PH',
      async (transcript) => {
        setListening(false);
        const accuracy = computeAccuracy(current.word, transcript);
        // Exact match only -- a near-miss (e.g. "takap" heard for "takip") must not be marked correct.
        const correct = accuracy === 100;
        const message = randomFrom(correct ? CORRECT_MESSAGES : ENCOURAGE_MESSAGES);
        setLastResult({ transcript, accuracy, correct, message });
        setStreak((s) => (correct ? s + 1 : 0));

        const { error: insertErr } = await supabase.from('pronunciation_practice_sessions').insert({
          student_id: child.id,
          word: current.word,
          spoken_text: transcript,
          accuracy_percentage: accuracy,
          is_correct: correct,
          practice_source: 'practice',
        });
        if (insertErr) setError('Nai-save ang resulta pero may isyu sa pag-log.');
      },
      (message) => {
        setListening(false);
        setError(message);
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        className="overflow-hidden rounded-2xl p-8 text-white shadow-lg"
        style={{ backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {mode === 'say' ? '🎙️ Sabihin ang Salita' : '🔊 Pakinggan at Basahin'}
            </h1>
            <p className="mt-1 text-white/90">
              {mode === 'say'
                ? 'Basahin nang malakas ang salita sa ibaba.'
                : "Sundan ng mata ang bawat pantig habang binabasa ito para sa iyo."}
            </p>
          </div>
          {streak >= 2 && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur">
              🔥 Sunod-sunod!
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchMode('say')}
          aria-pressed={mode === 'say'}
          className={`flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition-all ${
            mode === 'say'
              ? 'border-transparent bg-[var(--color-brand-coral)] text-white shadow-md'
              : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-brand-coral)]'
          }`}
        >
          <IconLabel icon="🎙️" label="Sabihin ang Salita" />
        </button>
        <button
          type="button"
          onClick={() => switchMode('listen')}
          aria-pressed={mode === 'listen'}
          className={`flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition-all ${
            mode === 'listen'
              ? 'border-transparent bg-[var(--color-brand-teal)] text-white shadow-md'
              : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-brand-teal)]'
          }`}
        >
          <IconLabel icon="🔊" label="Pakinggan at Basahin" />
        </button>
      </div>

      <div className="rounded-2xl border-2 p-8 shadow-md" style={cardStyle(theme.brand, 12, 45)}>
        {loadingWords || !current ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
            <p className="text-[var(--color-text-muted)]">Naglo-load...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 text-center">
            <div
              className="flex min-h-32 w-full flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 px-6 py-8 shadow-inner"
            >
              {mode === 'listen' ? (
                <SyllableKaraokeText syllables={syllabifyWord(current.word)} activeIndex={null} colorVar={theme.brand} />
              ) : (
                <p className="text-5xl font-extrabold tracking-wide" style={{ color: `var(${theme.brand})` }}>
                  {current.word}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {mode === 'listen' ? (
                  <button
                    type="button"
                    onClick={playWord}
                    disabled={speechStatus === 'loading'}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] disabled:opacity-60"
                  >
                    <IconLabel
                      icon={speechStatus === 'loading' ? '⏳' : undefined}
                      img={speechStatus !== 'loading' ? speechIcon : undefined}
                      label={speechStatus === 'loading' ? 'Naglo-load...' : speechStatus === 'speaking' ? 'Ihinto' : 'Basahin nang Malakas'}
                    />
                  </button>
                ) : (
                  <TTSButton text={current.word} />
                )}
              </div>
            </div>

            {mode === 'listen' ? (
              <>
                <p className="text-sm font-medium text-[var(--color-text-muted)]">
                  Sundan ng mata ang bawat pantig habang binabasa ito para sa iyo.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('say')}
                  className="rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
                >
                  <IconLabel icon="🎙️" label="Subukan Bigkasin" />
                </button>
              </>
            ) : !isSpeechRecognitionSupported() ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Hindi suportado ng browser na ito ang pagkilala ng boses.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleTry}
                  disabled={listening}
                  className={`relative flex h-24 w-24 items-center justify-center rounded-full text-4xl text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 ${
                    listening ? 'bg-[var(--color-danger)]' : ''
                  }`}
                  style={!listening ? { backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})` } : undefined}
                >
                  {listening && <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-danger)]/60" />}
                  <span className="relative">🎤</span>
                </button>
                <p className="text-sm font-medium text-[var(--color-text-muted)]">
                  {listening ? 'Nakikinig...' : 'Pindutin ang mic at bigkasin'}
                </p>
              </>
            )}

            {lastResult && (
              <PronunciationFeedback
                className="w-full"
                correct={lastResult.correct}
                message={lastResult.message}
                detail={`Narinig: "${lastResult.transcript}"`}
                hint={!lastResult.correct ? 'Ulitin natin, pakinggan mo ang tamang bigkas! 🔊' : undefined}
                word={!lastResult.correct ? current?.word : undefined}
              />
            )}
            {error && (
              <p className="w-full rounded-xl bg-[var(--color-danger-soft)] px-5 py-3 text-sm text-[var(--color-danger)]">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={nextWord}
              className="rounded-full border border-[var(--color-border)] bg-white px-6 py-2.5 text-sm font-semibold hover:border-[var(--color-primary)]"
            >
              <IconLabel icon="➡️" label="Susunod na Salita" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
