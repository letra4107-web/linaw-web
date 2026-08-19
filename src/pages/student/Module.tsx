import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce } from '../../lib/speech';
import { CORRECT_MESSAGES, ENCOURAGE_MESSAGES, randomFrom } from '../../lib/feedbackMessages';
import { TTSButton } from '../../components/a11y/TTSButton';
import { PronunciationFeedback } from '../../components/PronunciationFeedback';
import { BadgeUnlockToast } from '../../components/BadgeUnlockToast';
import { NonsenseWordCheck } from '../../components/NonsenseWordCheck';
import { ChallengeWordsPractice } from '../../components/ChallengeWordsPractice';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';

interface ModuleItem {
  module_item_id: string;
  content_id: string;
  content_text: string;
  content_type: string;
  role: string;
  completed: boolean;
}

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
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['student-module', moduleId],
    queryFn: () => api<ModuleContentResponse>(`/student/learn/module/${moduleId}`, { auth: true }),
    enabled: Boolean(moduleId),
  });

  const submitAttempt = useMutation({
    mutationFn: async ({ contentId, transcript, accuracy }: { contentId: string; transcript: string; accuracy: number }) => {
      const isParagraph = data?.module.instructional_content_type === 'paragraph';
      const res = await api<{ newlyUnlockedBadges?: string[] }>(`/student/learn/content/${contentId}/attempt`, {
        method: 'POST',
        auth: true,
        body: {
          accuracy,
          transcript,
          isFullSubmission: isParagraph,
          source: 'practice',
        },
      });
      return res;
    },
    onSuccess: (res) => {
      if (res.newlyUnlockedBadges?.length) setNewlyUnlockedBadges(res.newlyUnlockedBadges);
      queryClient.invalidateQueries({ queryKey: ['student-module', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['student-learn-path'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const practice = (item: ModuleItem) => {
    if (!isSpeechRecognitionSupported()) {
      setError('Hindi suportado ng browser mo ang speech recognition. Subukan sa Chrome.');
      return;
    }
    setError(null);
    setListeningFor(item.content_id);
    listenOnce(
      'fil-PH',
      (transcript) => {
        setListeningFor(null);
        const accuracy = computeAccuracy(item.content_text, transcript);
        // Exact match only -- a near-miss must not be marked correct.
        const correct = accuracy === 100;
        const message = randomFrom(correct ? CORRECT_MESSAGES : ENCOURAGE_MESSAGES);
        setLastResult({ contentId: item.content_id, transcript, accuracy, correct, message });
        submitAttempt.mutate({ contentId: item.content_id, transcript, accuracy });
      },
      (message) => {
        setListeningFor(null);
        setError(message);
      },
    );
  };

  const allCompleted = (data?.items ?? []).length > 0 && (data?.items ?? []).every((i) => i.completed);

  const completedCount = (data?.items ?? []).filter((i) => i.completed).length;
  const totalCount = data?.items.length ?? 0;
  const modulePct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (isLoading) return <p>Naglo-load...</p>;
  if (!data) return <p className="text-[var(--color-danger)]">Hindi mahanap ang aralin.</p>;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/student/learn" className="self-start text-sm font-medium text-[var(--color-primary)] underline">
        ← Bumalik sa mga Modyul
      </Link>

      <div
        className="overflow-hidden rounded-2xl p-6 text-white shadow-hero sm:p-8"
        style={{ backgroundImage: 'linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))' }}
      >
        <h1 className="text-2xl font-bold sm:text-3xl">{data.module.title}</h1>
        {data.module.description && <p className="mt-1 text-white/85">{data.module.description}</p>}
        {totalCount > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${modulePct}%` }} />
            </div>
            <span className="shrink-0 text-sm font-semibold">
              {completedCount}/{totalCount}
            </span>
          </div>
        )}
      </div>

      {error && <p className="text-[var(--color-danger)]">{error}</p>}

      {data.module.instructional_content_type === 'paragraph' && <ChallengeWordsPractice moduleId={data.module.id} />}

      {/* Short items (single letters/syllables/words) get a compact tile grid instead of
          a full-width row each -- a full-width flex row around one short letter left most
          of the card as dead horizontal space. Longer items (phrases/paragraphs) keep the
          single-column layout since they need the width to read comfortably. */}
      {(() => {
        const isCompact = data.module.instructional_content_type === 'phonetic' || data.module.instructional_content_type === 'word';
        return (
          <div className={isCompact ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4' : 'flex flex-col gap-4'}>
            {data.items.map((item, i) => {
              // Each word unlocks only once the one before it is completed -- keeps the
              // student reading in the module's intended order instead of skipping ahead.
              const isLocked = i > 0 && !data.items[i - 1].completed;
              // Locked compact tiles get their own much smaller, dashed "coming up next"
              // treatment instead of reusing the full unlocked card layout with dots
              // swapped in -- that left a tall card mostly empty. This one is deliberately
              // low-key so the eye goes to the unlocked/completed tiles instead.
              if (isCompact && isLocked) {
                return (
                  <div
                    key={item.module_item_id}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/60 p-4 text-center"
                  >
                    <span className="text-2xl" aria-hidden="true">
                      🔒
                    </span>
                    <p className="text-xs text-[var(--color-text-muted)]">Susunod na salita</p>
                  </div>
                );
              }

              return (
                <div
                  key={item.module_item_id}
                  className={`rounded-xl border p-5 ${isCompact ? 'flex flex-col items-center gap-3 text-center' : ''} ${
                    item.completed ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : isLocked ? 'opacity-60' : ''
                  }`}
                  style={item.completed ? undefined : cardStyle(CARD_COLORS[i % CARD_COLORS.length])}
                >
                  <div className={isCompact ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between gap-4'}>
                    <p className={isCompact ? 'text-3xl font-bold' : 'text-2xl font-medium'}>{isLocked ? '••••' : item.content_text}</p>
                    {!isLocked && <TTSButton text={item.content_text} />}
                  </div>
                  <div className={`flex items-center gap-3 ${isCompact ? 'flex-col' : 'mt-4'}`}>
                    {isLocked ? (
                      <span className="text-sm text-[var(--color-text-muted)]">
                        <IconLabel icon="🔒" label="Tapusin muna ang nakaraang salita" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => practice(item)}
                        disabled={listeningFor === item.content_id}
                        className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-60"
                      >
                        <IconLabel
                          icon="🎤"
                          label={listeningFor === item.content_id ? 'Nakikinig...' : item.completed ? 'Ulitin' : 'Bigkasin'}
                        />
                      </button>
                    )}
                    {item.completed && (
                      <span className="text-sm text-[var(--color-primary)]">
                        <IconLabel icon="✅" label="Tapos na" />
                      </span>
                    )}
                  </div>
                  {!isCompact && !isLocked && lastResult?.contentId === item.content_id && (
                    <PronunciationFeedback
                      className="mt-3"
                      correct={lastResult.correct}
                      message={lastResult.message}
                      detail={`Narinig: "${lastResult.transcript}"`}
                      hint={!lastResult.correct ? 'Ulitin natin, pakinggan mo ang tamang bigkas! 🔊' : undefined}
                      word={!lastResult.correct ? item.content_text : undefined}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {lastResult && data.items.some((item) => item.content_id === lastResult.contentId) && (
        <PronunciationFeedback
          correct={lastResult.correct}
          message={lastResult.message}
          detail={`Narinig: "${lastResult.transcript}"`}
          hint={!lastResult.correct ? 'Ulitin natin, pakinggan mo ang tamang bigkas! 🔊' : undefined}
          word={!lastResult.correct ? data.items.find((item) => item.content_id === lastResult.contentId)?.content_text : undefined}
        />
      )}

      {data.module.assessment_id && (
        <div className="rounded-xl border p-6" style={cardStyle('--color-brand-violet')}>
          <h2 className="mb-2 text-lg font-semibold">Pagsusulit</h2>
          {allCompleted ? (
            <button
              type="button"
              onClick={() => navigate(`/student/learn/assessment/${data.module.assessment_id}`)}
              className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-white"
            >
              <IconLabel icon="📝" label="Simulan ang Pagsusulit" />
            </button>
          ) : (
            <p className="text-[var(--color-text-muted)]">Kompletuhin muna lahat ng aralin sa itaas.</p>
          )}
        </div>
      )}

      {allCompleted && <NonsenseWordCheck moduleId={data.module.id} />}

      <BadgeUnlockToast badgeIds={newlyUnlockedBadges} onDismiss={() => setNewlyUnlockedBadges([])} />
    </div>
  );
}
