import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ClipboardCheck, LockKeyhole } from 'lucide-react';
import {recordVerifiedAnswer} from '../../lib/progressEvents';
import {practiceRewardMessage} from '../../lib/progressReward';
import { api } from '../../lib/api';
import { assessSpeech, isSpeechRecognitionSupported, listenOnce } from '../../lib/speech';
import { CORRECT_MESSAGES, ENCOURAGE_MESSAGES, randomFrom } from '../../lib/feedbackMessages';
import { TTSButton } from '../../components/a11y/TTSButton';
import { SlowTTSButton } from '../../components/a11y/SlowTTSButton';
import { PronunciationFeedback } from '../../components/PronunciationFeedback';
import { BadgeUnlockToast } from '../../components/BadgeUnlockToast';
import { NonsenseWordCheck } from '../../components/NonsenseWordCheck';
import { ChallengeWordsPractice } from '../../components/ChallengeWordsPractice';
import { IconLabel } from '../../components/a11y/IconLabel';
import { ModuleLessonHeader } from '../../components/student/ModuleLessonHeader';
import { ModuleReadingCards } from '../../components/student/ModuleReadingCards';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import assessmentIllustration from '../../assets/students/module-reference/assessment-clipboard.png';
import { WordMeaning } from '../../components/student/WordMeaning';
import { trackEvent } from '../../lib/analytics';
import type { ModuleReadingItem as ModuleItem } from '../../lib/modulePresentation';
import './module-reference.css';

interface ModuleContentResponse {
  module: {
    id: string;
    title: string;
    description: string | null;
    instructional_content_type: string;
    assessment_id: string | null;
  };
  items: ModuleItem[];
}

export default function Module() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [listeningFor, setListeningFor] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<
    { contentId: string; transcript: string; accuracy: number; correct: boolean; message: string } | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingRetry,setPendingRetry]=useState<{item:ModuleItem;transcript:string;moduleId:string}|null>(null);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<string[]>([]);
  const activeModuleId = useRef(moduleId);
  const stopRecognition = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeModuleId.current = moduleId;
    setListeningFor(null);
    setLastResult(null);
    setError(null);
    setPendingRetry(null);
    setNewlyUnlockedBadges([]);
    return () => {
      activeModuleId.current = undefined;
      stopRecognition.current?.();
      stopRecognition.current = null;
    };
  }, [moduleId]);

  useEffect(() => {
    if (moduleId) trackEvent('lesson_started', { module_id: moduleId });
  }, [moduleId]);

  const { data, isLoading, error: moduleError, refetch } = useQuery({
    queryKey: ['student-module', moduleId],
    queryFn: () => api<ModuleContentResponse>(`/student/learn/module/${moduleId}`, { auth: true }),
    enabled: Boolean(moduleId),
  });

  const submitAttempt = useMutation({
    mutationFn: async ({ item, transcript, moduleId: attemptModuleId }: { item: ModuleItem; transcript: string; moduleId:string }) => {
      const saved=await recordVerifiedAnswer({contentId:item.content_id,transcript,source:'practice'});
      const res={...saved.result,rewardMessage:practiceRewardMessage(saved),newlyUnlockedBadges:saved.newlyPersistedAchievementIds,levelAdvancedTo:null};
      return { item, transcript, res, attemptModuleId };
    },
    onSuccess: ({ item, transcript, res, attemptModuleId }) => {
      queryClient.invalidateQueries({ queryKey: ['student-module', attemptModuleId] });
      queryClient.invalidateQueries({ queryKey: ['student-learn-path'] });
      if (activeModuleId.current !== attemptModuleId) return;
      setPendingRetry(null);setError(null);
      if (res.newlyUnlockedBadges?.length) setNewlyUnlockedBadges(res.newlyUnlockedBadges);
      setLastResult({
        contentId: item.content_id,
        transcript,
        accuracy: res.accuracy,
        correct: res.correct,
        message: randomFrom(res.correct ? CORRECT_MESSAGES : ENCOURAGE_MESSAGES)+' '+res.rewardMessage,
      });
      trackEvent('reading_attempt_completed', { surface: 'lesson' });
      if (res.levelAdvancedTo) navigate('/student/learn');
    },
    onError: (err: Error & {pendingTranscript?:string},variables) => { if(activeModuleId.current!==variables.moduleId)return;setPendingRetry({...variables,transcript:err.pendingTranscript||variables.transcript});setError(err.message); trackEvent('reading_attempt_failed', { surface: 'lesson' }); },
  });

  const practice = (item: ModuleItem) => {
    if (!moduleId || listeningFor || submitAttempt.isPending || pendingRetry) return;
    if (!isSpeechRecognitionSupported()) {
      setError('Hindi suportado ng browser mo ang speech recognition. Subukan sa Chrome.');
      return;
    }
    setError(null);
    setListeningFor(item.content_id);
    trackEvent('reading_attempt_started', { surface: 'lesson' });
    stopRecognition.current = listenOnce(
      'fil-PH',
      ({ transcript, confidence }) => {
        if (activeModuleId.current !== moduleId) return;
        stopRecognition.current = null;
        setListeningFor(null);
        const assessment = assessSpeech(item.content_text, transcript, confidence);
        if (assessment.outcome === 'retry') {
          setError(assessment.message);
          return;
        }
        submitAttempt.mutate({ item, transcript, moduleId });
      },
      (message) => {
        if (activeModuleId.current !== moduleId) return;
        stopRecognition.current = null;
        setListeningFor(null);
        setError(message);
      },
    );
  };

  const allCompleted = (data?.items ?? []).length > 0 && (data?.items ?? []).every((i) => i.completed);

  useEffect(() => {
    if (allCompleted && moduleId) trackEvent('lesson_completed', { module_id: moduleId });
  }, [allCompleted, moduleId]);

  if (isLoading) return <div role="status" aria-live="polite" className="rounded-3xl border bg-[var(--surface-muted)] p-6 text-center text-[var(--color-text-muted)] shadow-card">Inihahanda ang iyong aralin...</div>;
  if (!data && moduleError) return <div className="module-load-error"><Link to="/student/learn" className="module-back-link">← Bumalik sa mga Modyul</Link><QueryErrorNotice error={moduleError} onRetry={()=>void refetch()} message="Hindi ma-load ang aralin. Subukan muli o bumalik sa mga modyul." /></div>;
  if (!data) return <div role="alert" className="rounded-3xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-6 text-center text-[var(--color-danger)]">Hindi mahanap ang aralin. Bumalik sa listahan ng mga modyul at subukan muli.</div>;

  return (
    <div className="student-module-reference">
      <Link to="/student/learn" className="module-back-link">
        ← Bumalik sa mga Modyul
      </Link>

      <ModuleLessonHeader title={data.module.title} description={data.module.description} type={data.module.instructional_content_type} items={data.items} />

      <QueryErrorNotice error={moduleError} onRetry={()=>void refetch()} message="Hindi ma-update ang progreso ng aralin. Subukan muli." />

      {pendingRetry && <button className="rounded-xl bg-purple-100 p-3" disabled={submitAttempt.isPending} onClick={()=>submitAttempt.mutate(pendingRetry)}>I-save muli ang parehong sagot</button>}
      {error && <p role="alert" className="rounded-xl bg-[var(--color-danger-soft)] px-4 py-3 text-[var(--color-danger)]">{error}</p>}
      {data.items.length === 0 && <p className="module-empty-notice" role="status">Wala pang babasahin sa modyul na ito. Bumalik sa listahan ng mga modyul.</p>}

      {data.module.instructional_content_type === 'paragraph' && <ChallengeWordsPractice moduleId={data.module.id} />}

      {/* Story (paragraph) modules get their own storybook-page treatment -- large,
          relaxed-leading text on a parchment-toned page instead of the dense drill-card
          layout used for letters/words/phrases, since a story is meant to be read through,
          not drilled item by item. */}
      {data.module.instructional_content_type === 'paragraph' ? (
        <div className="flex flex-col gap-5">
          {data.items.map((item, i) => {
            const isLocked = i > 0 && !data.items[i - 1].completed;
            return (
              <div
                key={item.module_item_id}
                className={`relative overflow-hidden rounded-2xl border-2 p-6 shadow-card sm:p-8 ${
                  item.completed
                    ? 'border-[var(--color-success)] bg-[var(--color-success-soft)]'
                    : isLocked
                      ? 'border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/60'
                      : 'border-[var(--color-brand-amber)]/40'
                }`}
                style={!item.completed && !isLocked ? { backgroundColor: 'color-mix(in srgb, var(--color-brand-sun) 6%, white)' } : undefined}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                    <IconLabel icon="📖" label={`Pahina ${i + 1} ng ${data.items.length}`} />
                  </span>
                  {item.completed && (
                    <span className="text-sm font-medium text-[var(--color-success)]">
                      <IconLabel icon="✅" label="Nabasa na" />
                    </span>
                  )}
                </div>

                {isLocked ? (
                  <p className="text-center text-[var(--color-text-muted)]">
                    <IconLabel icon="🔒" label="Tapusin muna ang nakaraang pahina" />
                  </p>
                ) : (
                  <>
                    <p className="text-xl leading-loose font-medium sm:text-2xl">{item.content_text}</p>
                    {item.content_type === 'word' && <WordMeaning word={item.content_text} className="mt-4" />}
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <TTSButton text={item.content_text} />
                      <SlowTTSButton text={item.content_text} />
                      <button
                        type="button"
                        onClick={() => practice(item)}
                        disabled={Boolean(listeningFor)||submitAttempt.isPending||Boolean(pendingRetry)}
                        className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-60"
                      >
                        <IconLabel
                          icon="🎤"
                          label={listeningFor === item.content_id ? 'Nakikinig...' : item.completed ? 'Ulitin' : 'Nabasa ko na'}
                        />
                      </button>
                    </div>
                    {lastResult?.contentId === item.content_id && (
                      <PronunciationFeedback
                        className="mt-4"
                        correct={lastResult.correct}
                        message={lastResult.message}
                        detail={`Narinig: "${lastResult.transcript}"`}
                        hint={!lastResult.correct ? 'Ulitin natin, pakinggan mo ang tamang bigkas! 🔊' : undefined}
                        word={!lastResult.correct ? item.content_text : undefined}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <ModuleReadingCards items={data.items} compact={['phonetic','word'].includes(data.module.instructional_content_type)} busy={Boolean(listeningFor)||submitAttempt.isPending||Boolean(pendingRetry)} listeningFor={listeningFor} savingFor={submitAttempt.isPending ? submitAttempt.variables?.item.content_id ?? null : null} onPractice={practice} />
      )}

      {lastResult && data.module.instructional_content_type !== 'paragraph' && data.items.some((item) => item.content_id === lastResult.contentId) && (
        <PronunciationFeedback
          correct={lastResult.correct}
          message={lastResult.message}
          detail={`Narinig: "${lastResult.transcript}"`}
          hint={!lastResult.correct ? 'Ulitin natin, pakinggan mo ang tamang bigkas! 🔊' : undefined}
          word={!lastResult.correct ? data.items.find((item) => item.content_id === lastResult.contentId)?.content_text : undefined}
        />
      )}

      {data.module.assessment_id && (
        <section className={`module-assessment-card ${allCompleted?'is-ready':''}`} aria-label="Pagsusulit sa modyul">
          <img src={assessmentIllustration} alt="" aria-hidden="true" />
          <div><h2><ClipboardCheck size={23} aria-hidden="true" />Pagsusulit</h2><p>{allCompleted?'Handa ka na! Subukan ang iyong natutuhan.':'Kompletuhin muna lahat ng aralin sa itaas.'}</p></div>
          <button type="button" disabled={!allCompleted} onClick={()=>navigate(`/student/learn/assessment/${data.module.assessment_id}`)}>{allCompleted?<ArrowRight size={21} aria-hidden="true" />:<LockKeyhole size={21} aria-hidden="true" />}<span>Simulan ang Pagsusulit</span></button>
        </section>
      )}

      {allCompleted && <NonsenseWordCheck moduleId={data.module.id} />}

      <BadgeUnlockToast badgeIds={newlyUnlockedBadges} onDismiss={() => setNewlyUnlockedBadges([])} />
    </div>
  );
}
