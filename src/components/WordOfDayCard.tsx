import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/auth/AuthContext';
import { api } from '../lib/api';
import { getOrCreateWordOfDay, MAX_ATTEMPTS } from '../lib/wordOfDay';
import { assessSpeech, isSpeechRecognitionSupported, listenOnce } from '../lib/speech';
import { syllabifyWord } from '../lib/syllabify';
import { CORRECT_MESSAGES, ENCOURAGE_MESSAGES, randomFrom } from '../lib/feedbackMessages';
import { PronunciationFeedback } from './PronunciationFeedback';
import { BadgeUnlockToast } from './BadgeUnlockToast';
import { BookOpen, Flame, Mic, Volume2 } from 'lucide-react';
import { getTtsPlaybackRate, getTtsRate } from '../lib/ttsSettings';
import { WordMeaning } from './student/WordMeaning';

interface WordOfDayCardProps {
  streak?: number;
  onStatusChange?: (status: DailyWordStatus) => void;
}

export interface DailyWordStatus {
  available: boolean;
  listened: boolean;
  read: boolean;
  completed: boolean;
}

export function WordOfDayCard({ streak = 0, onStatusChange }: WordOfDayCardProps) {
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
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<string[]>([]);
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'loading' | 'speaking'>('idle');
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechUrlRef = useRef<string | null>(null);
  const playbackRequestRef = useRef(0);
  const stopRecognitionRef = useRef<() => void>(() => {});
  const wordBoardRef = useRef<HTMLDivElement>(null);
  const [steps, setSteps] = useState({ id: '', listened: false, read: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      playbackRequestRef.current += 1;
      speechAudioRef.current?.pause();
      if (speechUrlRef.current) URL.revokeObjectURL(speechUrlRef.current);
      stopRecognitionRef.current();
    };
  }, []);

  const { data: child, isPending: childPending, error: childError, refetch: refetchChild } = useQuery({
    queryKey: ['student-self', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase.from('children').select('id, grade_level').eq('auth_uid', user!.id).maybeSingle();
      if (err) throw err;
      return data as { id: string; grade_level: number } | null;
    },
    enabled: Boolean(user),
  });

  const { data: path, isPending: pathPending, error: pathError, refetch: refetchPath } = useQuery({
    queryKey: ['student-learn-path'],
    queryFn: () => api<{ effective_level: string }>('/student/learn/path', { auth: true }),
    enabled: Boolean(user),
  });

  const { data: wordOfDay, isLoading, error: wordError, refetch: refetchWord } = useQuery({
    queryKey: ['word-of-day', child?.id, path?.effective_level],
    queryFn: () => getOrCreateWordOfDay(child!.id, path!.effective_level || 'Beginner'),
    enabled: Boolean(child?.id) && Boolean(path?.effective_level),
  });

  const attemptsUsed = wordOfDay?.attempts ?? 0;
  const isDone = Boolean(wordOfDay?.completed_at);
  const listened = steps.id === wordOfDay?.id && steps.listened;
  const read = steps.id === wordOfDay?.id && steps.read;
  useEffect(() => {
    onStatusChange?.({ available: Boolean(wordOfDay), listened, read, completed: isDone });
  }, [onStatusChange, wordOfDay, listened, read, isDone]);
  // Stable fallback for a page load that lands on an already-completed word (no local
  // attempt just happened to pick a message) -- memoized so it doesn't re-roll on re-render.
  const fallbackDoneMessage = useMemo(
    () => (wordOfDay?.correct ? randomFrom(CORRECT_MESSAGES) : randomFrom(ENCOURAGE_MESSAGES)),
    [wordOfDay?.correct],
  );
  const canTry = wordOfDay && !isDone && attemptsUsed < MAX_ATTEMPTS && isSpeechRecognitionSupported();

  const stopSpeech = () => {
    playbackRequestRef.current += 1;
    speechAudioRef.current?.pause();
    speechAudioRef.current = null;
    if (speechUrlRef.current) URL.revokeObjectURL(speechUrlRef.current);
    speechUrlRef.current = null;
    setSpeechStatus('idle');
  };

  // Plays the whole word in one continuous TTS call -- same endpoint used everywhere else in
  // the app. The old syllable-by-syllable karaoke feature synthesized each syllable via a
  // separate marked-SSML call, which sometimes came out mispronounced (reading like English
  // instead of Tagalog); reading the full word at once avoids that.
  const playWord = async () => {
    if (!wordOfDay || speechStatus === 'loading') return;
    if (speechStatus === 'speaking') {
      stopSpeech();
      return;
    }
    setSpeechStatus('loading');
    setError(null);
    const playbackRequest = ++playbackRequestRef.current;
    try {
      const rate = getTtsRate();
      const res = await api<{ audioContent: string }>('/tts', { method: 'POST', auth: true, body: { text: wordOfDay.word, rate } });
      if (playbackRequest !== playbackRequestRef.current) return;
      const bytes = atob(res.audioContent);
      const buffer = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
      speechUrlRef.current = url;
      const audio = new Audio(url);
      audio.playbackRate = getTtsPlaybackRate(rate);
      speechAudioRef.current = audio;
      audio.onended = () => {
        setSpeechStatus('idle');
        speechAudioRef.current = null;
        URL.revokeObjectURL(url);
        speechUrlRef.current = null;
        setSteps(previous => ({ id: wordOfDay.id, listened: true, read: previous.id === wordOfDay.id && previous.read }));
      };
      audio.onerror = () => { stopSpeech(); setError('Hindi ma-play ang audio ngayon. Subukan muli.'); };
      setSpeechStatus('speaking');
      await audio.play();
    } catch {
      if (playbackRequest !== playbackRequestRef.current) return;
      stopSpeech();
      setError('Hindi ma-play ang audio ngayon.');
    }
  };

  const handleTry = () => {
    if (!wordOfDay || listening || saving) return;
    stopSpeech();
    setError(null);
    setWasWrongAttempt(false);
    setListening(true);
    stopRecognitionRef.current = listenOnce(
      'fil-PH',
      async ({ transcript, confidence }) => {
        setListening(false);
        setLastHeard(transcript);
        const assessment = assessSpeech(wordOfDay.word, transcript, confidence);
        if (assessment.outcome === 'retry') { setError(assessment.message); return; }
        const nextAttempts = attemptsUsed + 1;

        try {
          setSaving(true);
          const res = await api<{
            xpAwarded: number;
            isFinal: boolean;
            correct: boolean | null;
            newlyUnlockedBadges?: string[];
          }>('/student/word-of-day/attempt', {
            method: 'POST',
            auth: true,
            body: { logId: wordOfDay.id, attempts: nextAttempts, transcript },
          });
          if (res.isFinal && res.correct) setJustAwardedXp(res.xpAwarded);
          if (res.newlyUnlockedBadges?.length) setNewlyUnlockedBadges(res.newlyUnlockedBadges);
          setFeedbackMessage(res.isFinal && res.correct ? randomFrom(CORRECT_MESSAGES) : randomFrom(ENCOURAGE_MESSAGES));
          setJustAnswered(true);
          if (!res.isFinal) setWasWrongAttempt(true);
          queryClient.invalidateQueries({ queryKey: ['word-of-day'] });
          queryClient.invalidateQueries({ queryKey: ['student-progress'] });
          queryClient.invalidateQueries({ queryKey: ['student-profile-progress'] });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'May problema sa pag-save ng sagot.');
        } finally {
          setSaving(false);
        }
      },
      (message) => {
        setListening(false);
        setError(message);
      },
    );
  };

  const loadError = childError || pathError || wordError;
  if (isLoading || !wordOfDay) return <section className="home-word-card home-word-placeholder" id="salita-ngayon" aria-labelledby="home-word-title">
    <h2 id="home-word-title"><span aria-hidden="true">📣</span> Salita Ngayon</h2>
    <p role={loadError ? 'alert' : 'status'}>{loadError ? 'Hindi ma-load ang salita ngayon. Subukan muli.' : isLoading || childPending || pathPending ? 'Inihahanda ang iyong salita…' : !child ? 'Hindi makita ang iyong student profile. Ipaalam sa iyong guro.' : 'Wala pang salita para sa iyong antas. Balikan natin mamaya.'}</p>
    {loadError && <button type="button" className="home-purple-button" onClick={() => { void refetchChild(); void refetchPath(); if (child && path) void refetchWord(); }}>Subukan muli ang salita</button>}
  </section>;

  const syllables = syllabifyWord(wordOfDay.word);
  const startReading = () => {
    setSteps(previous => ({ id: wordOfDay.id, listened: previous.id === wordOfDay.id && previous.listened, read: true }));
    wordBoardRef.current?.focus({ preventScroll: true });
  };
  return <section id="salita-ngayon" className="home-word-card" aria-labelledby="home-word-title">
    <header className="home-word-heading"><span className="home-word-megaphone" aria-hidden="true">📣</span><div><h2 id="home-word-title">Salita Ngayon</h2><p>Makinig, basahin, at bigkasin ang salita.</p></div>{streak > 0 && <span className="home-word-streak"><Flame size={18} aria-hidden="true" /> Sunod-sunod!!</span>}</header>
    <div className="home-word-stage">
      <div className="home-word-signposts" aria-label="Mga hakbang sa salita">
        <button type="button" data-word-action="listen" onClick={playWord} disabled={speechStatus === 'loading'} aria-pressed={speechStatus === 'speaking'}><Volume2 size={24} aria-hidden="true" />{speechStatus === 'loading' ? 'Sandali…' : speechStatus === 'speaking' ? 'Ihinto' : 'Makinig'}</button>
        <button type="button" data-word-action="read" onClick={startReading} aria-pressed={read}><BookOpen size={24} aria-hidden="true" />Basahin</button>
        <button type="button" data-word-action="speak" onClick={handleTry} disabled={!canTry || listening || saving} aria-describedby="word-of-day-microphone-help"><Mic size={24} aria-hidden="true" />{listening ? 'Nakikinig…' : saving ? 'Sine-save…' : isDone ? 'Tapos na!' : 'Bigkasin'}</button>
      </div>
      <div ref={wordBoardRef} tabIndex={-1} role="group" className="home-word-board" data-reading={read} aria-label={`Salita: ${wordOfDay.word}`}>
        <p className="home-word-syllables"><span className="sr-only">{wordOfDay.word}</span>{syllables.map((syllable, index) => <span key={index} className="home-syllable-group" aria-hidden="true">{index > 0 && <span className="home-syllable-divider">-</span>}<span className={index % 2 ? 'home-syllable-pink' : 'home-syllable-blue'}>{syllable}</span></span>)}</p>
        <button type="button" className="home-word-speaker" onClick={playWord} disabled={speechStatus === 'loading'} aria-label={speechStatus === 'speaking' ? 'Ihinto ang pagbasa' : 'Pakinggan ang salita'}><Volume2 size={27} aria-hidden="true" /></button>
      </div>
      <div className="home-owl-bubble">{listening ? 'Nakikinig ako. Kaya mo ito!' : isDone ? 'Ang galing! Balik tayo bukas.' : 'Uliting bigkasin ang salita!'}</div>
    </div>
    <div className="home-word-feedback">
      {error && <p role="alert" className="home-word-error">{error}</p>}
      {isDone ? <PronunciationFeedback correct={Boolean(wordOfDay.correct)} message={wordOfDay.correct ? `${feedbackMessage || fallbackDoneMessage} +${wordOfDay.xp_awarded} XP` : feedbackMessage || fallbackDoneMessage} speakText={feedbackMessage || fallbackDoneMessage} hint="Natapos mo na ito. Bumalik bukas para sa susunod na salita." word={!wordOfDay.correct ? wordOfDay.word : undefined} autoPlay={justAnswered} /> :
        <div className="home-word-help"><p id="word-of-day-microphone-help" aria-live="polite">{!isSpeechRecognitionSupported() ? 'Hindi suportado ng browser na ito ang pagkilala ng boses. Maaari ka pa ring makinig at magbasa.' : listening ? 'Magsalita nang malinaw.' : saving ? 'Sine-save ang iyong sagot…' : read ? 'Pindutin ang Bigkasin kapag handa ka na.' : 'Makinig muna, saka basahin ang mga pantig.'}</p><span role="img" aria-label={`${attemptsUsed} sa ${MAX_ATTEMPTS} pagsubok ang nagamit`}>{Array.from({ length: MAX_ATTEMPTS }, (_, index) => <i key={index} data-used={index < attemptsUsed} />)}</span></div>}
      {lastHeard && wasWrongAttempt && !isDone && <PronunciationFeedback correct={false} message={feedbackMessage} detail={`Narinig ko: "${lastHeard}"`} hint="Ulitin natin. Pakinggan ang tamang bigkas!" word={wordOfDay.word} />}
      {lastHeard && !wasWrongAttempt && !isDone && <p>Narinig: “{lastHeard}”</p>}
    </div>
    <details className="home-word-meaning"><summary>Kahulugan at halimbawa <span aria-hidden="true">＋</span></summary><WordMeaning word={wordOfDay.word} compactControls emptyMessage="Wala pang kahulugan para sa salitang ito. Maaari mo pa rin itong pakinggan at basahin." /></details>
    {justAwardedXp !== null && <span className="sr-only">Nakakuha ng {justAwardedXp} XP</span>}
    <BadgeUnlockToast badgeIds={newlyUnlockedBadges} onDismiss={() => setNewlyUnlockedBadges([])} />
  </section>;
}
