import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, Check, CircleCheck, LoaderCircle, Mic, RotateCcw, Trophy, Volume2 } from 'lucide-react';
import { recordVerifiedAnswer } from '../../lib/progressEvents';
import { api } from '../../lib/api';
import { assessSpeech, isSpeechRecognitionSupported, listenOnce } from '../../lib/speech';
import { playTtsSequence } from '../../lib/ttsPlayer';
import { BadgeUnlockToast } from '../../components/BadgeUnlockToast';
import { WordMeaning } from '../../components/student/WordMeaning';
import { trackEvent } from '../../lib/analytics';
import assessmentGarden from '../../assets/students/assessment-reference/assessment-garden-v2.png';
import gardenFallback from '../../assets/students/module-reference/lesson-garden.png';
import owlMascot from '../../assets/students/mascot/owl-mascot.png';
import './assessment-reference.css';

interface AssessmentItem {
  assessment_item_id: string;
  content_id: string;
  content_text: string;
  content_type: string;
  answer_options: string[] | null;
  item_order: number;
}

interface StartResponse {
  attempt_id: string;
  assessment_id: string;
  module_id: string;
  pass_percentage: number;
  status: string;
  items: AssessmentItem[];
}

interface ModuleDetails {
  module: { id: string; title: string; instructional_content_type: string };
  items: { content_text: string }[];
}

interface SubmitResult { score: number; passed: boolean }
interface Answered { assessment_item_id: string; content_attempt_id: string }
interface AnswerInput { item: AssessmentItem; transcript: string; attemptId: string; selection: string | null }

function messageFor(error: Error & { status?: number }, starting = false) {
  if (error.status === 503) return starting
    ? 'Hindi pa makapagsimula ang pagsusulit. Maaari kang bumalik muna sa mga modyul o subukan muli.'
    : 'Hindi pa makumpirma ang pag-save ng sagot. Subukan muli ang parehong sagot.';
  return error.message;
}

// A new assessment route gets a fresh session. Old audio, speech callbacks and
// mutation responses cannot replace a different module's question or answer.
export default function Assessment() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  return <AssessmentSession key={assessmentId} assessmentId={assessmentId} />;
}

function AssessmentSession({ assessmentId }: { assessmentId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const live = useRef(true);
  const stopRecognition = useRef<(() => void) | null>(null);
  const playback = useRef<AbortController | null>(null);
  const interactionLocked = useRef(false);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const [started, setStarted] = useState<StartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answered>>({});
  const [selections, setSelections] = useState<Record<string, string | null>>({});
  const [pendingRetry, setPendingRetry] = useState<AnswerInput | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [pendingAnswerId, setPendingAnswerId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [reading, setReading] = useState(false);
  const [slowReading, setSlowReading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<string[]>([]);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      playback.current?.abort();
      stopRecognition.current?.();
      stopRecognition.current = null;
    };
  }, []);

  const startMutation = useMutation({
    mutationFn: () => api<StartResponse>(`/student/learn/assessment/${assessmentId}/start`, { method: 'POST', auth: true }),
    onMutate: () => setError(null),
    onSuccess: (data) => { if (live.current) { setError(null); setStarted(data); } },
    onError: (err: Error & { status?: number }) => { if (live.current) setError(messageFor(err, true)); },
  });

  useEffect(() => {
    if (assessmentId) startMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const moduleDetails = useQuery({
    queryKey: ['student-assessment-module', started?.module_id],
    queryFn: () => api<ModuleDetails>(`/student/learn/module/${started!.module_id}`, { auth: true }),
    enabled: Boolean(started?.module_id),
    staleTime: 60_000,
  });

  useEffect(() => {
    promptRef.current?.focus({ preventScroll: true });
  }, [questionIndex]);

  const recordAnswer = useMutation({
    mutationFn: async (input: AnswerInput) => {
      const saved = await recordVerifiedAnswer({
        contentId: input.item.content_id, transcript: input.transcript, source: 'assessment',
        assessmentAttemptId: input.attemptId, assessmentItemId: input.item.assessment_item_id,
      });
      return { input, saved };
    },
    onMutate: (input) => {
      setPendingAnswerId(input.item.assessment_item_id);
      setSelections((prev) => ({ ...prev, [input.item.assessment_item_id]: input.selection }));
      setError(null);
    },
    onSuccess: ({ input, saved }) => {
      if (!live.current) return;
      setPendingRetry(null);
      setError(null);
      setAnswers((prev) => ({ ...prev, [input.item.assessment_item_id]: {
        assessment_item_id: input.item.assessment_item_id, content_attempt_id: saved.result.attempt_id,
      } }));
      setPendingAnswerId(null);
      interactionLocked.current = false;
    },
    onError: (err: Error & { status?: number; pendingTranscript?: string }, input) => {
      if (!live.current) return;
      const transcript = err.pendingTranscript ?? input.transcript;
      const selection = input.item.answer_options ? input.item.answer_options.find((option) => option === transcript) ?? null : null;
      setSelections((prev) => ({ ...prev, [input.item.assessment_item_id]: selection }));
      setPendingRetry({ ...input, transcript, selection });
      setPendingAnswerId(null);
      setError(messageFor(err));
      // Keep other answers/navigation blocked until this same attempt is confirmed.
      interactionLocked.current = true;
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => api<SubmitResult & { newlyUnlockedBadges?: string[] }>(`/student/learn/assessment/${started!.attempt_id}/submit`, {
      method: 'POST', auth: true, body: { responses: Object.values(answers) },
    }),
    onMutate: () => { interactionLocked.current = true; setError(null); },
    onSuccess: (data) => {
      for (const queryKey of [['student-learn-path'], ['student-module', started?.module_id], ['student-progress'], ['student-profile-progress'], ['student-reading-profile']]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      if (!live.current) return;
      setResult(data);
      interactionLocked.current = false;
      trackEvent('assessment_completed', { passed: data.passed, score: data.score });
      if (data.newlyUnlockedBadges?.length) setNewlyUnlockedBadges(data.newlyUnlockedBadges);
    },
    onError: (err: Error & { status?: number }) => {
      if (!live.current) return;
      interactionLocked.current = false;
      setError(err.status === 503 ? 'Hindi pa makumpirma ang pagsusumite. Pindutin muli ang Isumite ang Pagsusulit.' : err.message);
    },
  });

  const item = started?.items[questionIndex];
  const isAnswered = Boolean(item && answers[item.assessment_item_id]);
  const busy = reading || listening || recordAnswer.isPending || submitMutation.isPending || Boolean(pendingRetry);

  const readPrompt = async (slow = false) => {
    if (!item || interactionLocked.current || reading) return;
    interactionLocked.current = true;
    const controller = new AbortController();
    playback.current = controller;
    setError(null);
    setReading(true);
    setSlowReading(slow);
    try {
      // Only the stored target is spoken. Options are kept text-only, and no
      // hidden target or answer key is rendered next to an MC question.
      await playTtsSequence([{ text: item.content_text, rate: item.content_type === 'phonetic' ? 1 : slow ? 0.5 : undefined }], 'fil-PH', { signal: controller.signal, reportErrors: true });
    } catch (err) {
      if (live.current && !controller.signal.aborted) setError(err instanceof Error ? err.message : 'Hindi ma-play ang tunog. Subukan muli.');
    } finally {
      if (live.current && playback.current === controller) {
        setReading(false);
        setSlowReading(false);
        interactionLocked.current = false;
        playback.current = null;
      }
    }
  };

  const answerChoice = (selection: string) => {
    if (!started || !item || isAnswered || interactionLocked.current || busy) return;
    interactionLocked.current = true;
    recordAnswer.mutate({ item, transcript: selection, attemptId: started.attempt_id, selection });
  };

  const practiceSpeech = () => {
    if (!started || !item || isAnswered || interactionLocked.current || busy) return;
    if (!isSpeechRecognitionSupported()) { setError('Hindi suportado ng browser mo ang speech recognition. Subukan sa Chrome.'); return; }
    interactionLocked.current = true;
    setError(null);
    setListening(true);
    try {
      let consumed = false;
      stopRecognition.current = listenOnce('fil-PH', ({ transcript, confidence }) => {
        if (!live.current || consumed) return;
        consumed = true;
        stopRecognition.current = null;
        setListening(false);
        const assessment = assessSpeech(item.content_text, transcript, confidence);
        if (assessment.outcome === 'retry') { interactionLocked.current = false; setError(assessment.message); return; }
        recordAnswer.mutate({ item, transcript, attemptId: started.attempt_id, selection: null });
      }, (message) => {
        if (!live.current || consumed) return;
        consumed = true;
        stopRecognition.current = null;
        interactionLocked.current = false;
        setListening(false);
        setError(message);
      });
    } catch {
      interactionLocked.current = false;
      setListening(false);
      setError('Hindi nagsimula ang microphone. Subukan muli.');
    }
  };

  const back = <Link to="/student/learn" className="assessment-back-link"><ArrowLeft aria-hidden="true" size={22} />Bumalik sa mga Modyul</Link>;
  if (startMutation.isPending || (!started && !error && assessmentId)) return <div className="student-assessment-reference">{back}<div className="assessment-recovery" role="status"><LoaderCircle aria-hidden="true" className="assessment-spinner" /><p>Inihahanda ang pagsusulit...</p></div></div>;
  if (!started) return <div className="student-assessment-reference">{back}<section role="alert" className="assessment-recovery">
    <AlertCircle aria-hidden="true" size={42} /><h1>Hindi pa maihanda ang pagsusulit</h1>
    <p>{error || 'Hindi mahanap ang pagsusulit. Bumalik sa mga modyul at subukan muli.'}</p>
    <div>{assessmentId && <button type="button" className="assessment-primary" onClick={() => startMutation.mutate()}><RotateCcw aria-hidden="true" size={19} />Subukan muli</button>}
      <button type="button" className="assessment-secondary" onClick={() => navigate('/student/learn')}><ArrowLeft aria-hidden="true" size={19} />Bumalik sa mga Modyul</button></div>
  </section></div>;

  const total = started.items.length;
  const answeredCount = started.items.filter((question) => answers[question.assessment_item_id]).length;
  const allAnswered = total > 0 && answeredCount === total;
  const lastQuestion = questionIndex === total - 1;
  const title = moduleDetails.data?.module.title || 'Pagsusulit sa Pagbasa';
  const moduleType = moduleDetails.data?.module.instructional_content_type;
  const preview = moduleType === 'phonetic' || moduleType === 'word'
    ? moduleDetails.data?.items.slice(0, moduleType === 'phonetic' ? 7 : 4).map((question) => question.content_text).join('  ·  ') : null;
  const options = item?.answer_options?.length ? item.answer_options : null;
  const bannerSounds = moduleType === 'phonetic' ? moduleDetails.data?.items.slice(0,7).map((question) => question.content_text) : null;

  return <div className="student-assessment-reference">
    {back}
    <header className="assessment-hero">
      <img className="assessment-hero-art" src={assessmentGarden} alt="" aria-hidden="true" fetchPriority="high" loading="eager" onError={(event) => { if (event.currentTarget.getAttribute('src') !== gardenFallback) event.currentTarget.src = gardenFallback; }} />
      <div className="assessment-hero-copy"><p>Pagsusulit</p><h1>{title}</h1>{preview && <p className="assessment-hero-preview">{preview}</p>}</div>
      <div className={`assessment-hero-card-print ${bannerSounds?.some((sound) => sound.length > 1) ? 'is-syllables' : ''}`} aria-hidden="true">{bannerSounds ? bannerSounds.map((sound,index) => <span key={index} className={`tone-${index % 5}`}>{sound}</span>) : <BookOpen size={30} />}</div>
    </header>
    {moduleDetails.isError && <p className="assessment-metadata-notice">Hindi ma-load ang pamagat ng modyul. <button type="button" onClick={() => void moduleDetails.refetch()}>Subukan muli</button></p>}

    {result ? <section className={`assessment-result ${result.passed ? 'is-passed' : ''}`} aria-labelledby="assessment-result-title">
      <img src={owlMascot} alt="" aria-hidden="true" />
      <span className="assessment-result-icon"><Trophy aria-hidden="true" size={35} /></span>
      <h2 id="assessment-result-title">{result.passed ? 'Magaling!' : 'Malapit ka na!'}</h2>
      <strong className="assessment-result-score">{Math.round(result.score)}%</strong>
      <p>{result.passed ? 'Kumpleto na ang modyul at bukas na ang susunod.' : `Kailangan ng ${started.pass_percentage}% upang makapasa. Kaya mo ito!`}</p>
      <button type="button" className="assessment-primary" onClick={() => navigate(result.passed ? '/student/learn' : `/student/learn/module/${started.module_id}`)}>{result.passed ? 'Tingnan ang Susunod' : 'Bumalik sa Modyul'}<ArrowRight aria-hidden="true" size={22} /></button>
      <BadgeUnlockToast badgeIds={newlyUnlockedBadges} onDismiss={() => setNewlyUnlockedBadges([])} />
    </section> : !item ? <section className="assessment-recovery" role="status"><AlertCircle aria-hidden="true" size={38} /><h2>Wala pang tanong sa pagsusulit na ito</h2><p>Bumalik muna sa mga modyul at subukan muli.</p><button type="button" className="assessment-secondary" onClick={() => navigate('/student/learn')}>Bumalik sa mga Modyul</button></section> : <>
      <div className="assessment-progress-row">
        <div className="assessment-progress" role="progressbar" aria-label="Progreso ng mga tanong" aria-valuemin={0} aria-valuemax={total} aria-valuenow={questionIndex + 1} aria-valuetext={`Tanong ${questionIndex + 1} sa ${total}; ${answeredCount} ang nasagutan`} data-answered-count={answeredCount}><span><i style={{ width: `${(questionIndex + 1) / total * 100}%` }} /></span></div>
        <p className="assessment-question-count" aria-live="polite">Tanong {questionIndex + 1} sa {total}</p>
      </div>
      <section className="assessment-flashcard" aria-labelledby="assessment-question-title" data-question-id={item.assessment_item_id}>
        <div className="assessment-cloud assessment-cloud-left" aria-hidden="true" /><div className="assessment-cloud assessment-cloud-right" aria-hidden="true" />
        <div className="assessment-prompt">
          <h2 id="assessment-question-title" ref={promptRef} tabIndex={-1}>{options ? 'Pakinggan ang tunog.' : 'Basahin at bigkasin.'}</h2>
          <p>{options ? 'Pindutin ang “Basahin nang Malakas” at piliin ang tamang sagot.' : 'Pakinggan ang babasahin. Kapag handa ka na, pindutin ang “Bigkasin”.'}</p>
        </div>
        <div className="assessment-audio-controls">
          <button type="button" className={`assessment-speaker ${reading ? 'is-playing' : ''}`} aria-label={reading ? 'Pinatutugtog ang tunog' : 'Pakinggan ang tunog'} disabled={busy} onClick={() => void readPrompt()}>{reading ? <LoaderCircle aria-hidden="true" className="assessment-spinner" size={52} /> : <Volume2 aria-hidden="true" size={56} strokeWidth={2.7} />}</button>
          <button type="button" className="assessment-listen-label" disabled={busy} onClick={() => void readPrompt()}><span><Volume2 aria-hidden="true" size={20} /></span>{reading && !slowReading ? 'Pinatutugtog...' : 'Basahin nang Malakas'}</button>
        </div>

        {options ? <div className="assessment-choices" role="group" aria-label="Piliin ang tamang sagot" style={{ '--choice-count': Math.min(options.length, 5) } as CSSProperties}>
          {options.map((option, index) => {
            const selected = selections[item.assessment_item_id] === option;
            return <button key={`${index}-${option}`} type="button" className={`assessment-choice tone-${index % 5} ${selected ? 'is-selected' : ''}`} data-length={option.length <= 1 ? 'letter' : option.length <= 3 ? 'syllable' : option.length <= 12 && !option.includes(' ') ? 'word' : 'phrase'} aria-pressed={selected} disabled={isAnswered || busy} onClick={() => answerChoice(option)}>
              <span>{option}</span>{selected && <i aria-hidden="true"><Check size={19} strokeWidth={3} /></i>}
            </button>;
          })}
        </div> : <div className="assessment-speaking-card">
          <p className={`assessment-reading-target ${item.content_text.length > 45 ? 'is-long' : ''}`}>{item.content_text}</p>
          <div><button type="button" className="assessment-primary" disabled={isAnswered || busy} onClick={practiceSpeech}>{listening ? <LoaderCircle className="assessment-spinner" aria-hidden="true" size={22} /> : isAnswered ? <CircleCheck aria-hidden="true" size={22} /> : <Mic aria-hidden="true" size={22} />}{isAnswered ? 'Nasagot na' : listening ? 'Nakikinig...' : 'Bigkasin'}</button>
            {item.content_type !== 'phonetic' && <button type="button" className="assessment-secondary" disabled={busy} onClick={() => void readPrompt(true)}><Volume2 aria-hidden="true" size={19} />{reading && slowReading ? 'Pinatutugtog...' : 'Dahan-dahang Basahin'}</button>}</div>
          {isAnswered && item.content_type === 'word' && <WordMeaning word={item.content_text} />}
        </div>}

        <div className="assessment-answer-status" role="status" aria-live="polite">{pendingAnswerId === item.assessment_item_id ? <><LoaderCircle className="assessment-spinner" aria-hidden="true" size={17} />Sine-save ang sagot...</> : isAnswered ? <><CircleCheck aria-hidden="true" size={18} />Naitala ang sagot mo.</> : listening ? 'Nakikinig sa iyong pagbasa...' : null}</div>
        {error && <div className="assessment-error" role="alert"><AlertCircle aria-hidden="true" size={20} /><p>{error}</p>{pendingRetry && <button type="button" disabled={recordAnswer.isPending} onClick={() => recordAnswer.mutate(pendingRetry)}><RotateCcw aria-hidden="true" size={17} />I-save muli ang parehong sagot</button>}</div>}
        <nav className="assessment-question-nav" aria-label="Mga tanong sa pagsusulit">
          <button type="button" className="assessment-secondary" disabled={questionIndex === 0 || busy} onClick={() => { if (interactionLocked.current) return; setError(null); setQuestionIndex(questionIndex - 1); }}><ArrowLeft aria-hidden="true" size={24} />Nakaraan</button>
          <button type="button" className="assessment-primary" disabled={busy || !isAnswered || (lastQuestion && !allAnswered)} onClick={() => {
            if (interactionLocked.current) return;
            if (lastQuestion) { interactionLocked.current = true; submitMutation.mutate(); }
            else { setError(null); setQuestionIndex(questionIndex + 1); }
          }}>{submitMutation.isPending ? 'Isinusumite...' : lastQuestion ? 'Isumite ang Pagsusulit' : 'Susunod na Tanong'}<ArrowRight aria-hidden="true" size={24} /></button>
        </nav>
      </section>
    </>}
    <div className="assessment-garden-corners" aria-hidden="true" />
  </div>;
}
