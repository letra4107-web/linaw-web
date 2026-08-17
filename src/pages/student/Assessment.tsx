import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce } from '../../lib/speech';
import { TTSButton } from '../../components/a11y/TTSButton';
import { IconLabel } from '../../components/a11y/IconLabel';

interface AssessmentItem {
  assessment_item_id: string;
  content_id: string;
  content_text: string;
  content_type: string;
  answer_options: string[] | null;
  correct_answer_index: number | null;
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

interface SubmitResult {
  score: number;
  passed: boolean;
}

interface Answered {
  assessment_item_id: string;
  content_attempt_id: string;
}

export default function Assessment() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [started, setStarted] = useState<StartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answered>>({});
  const [listeningFor, setListeningFor] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const startMutation = useMutation({
    mutationFn: () => api<StartResponse>(`/student/learn/assessment/${assessmentId}/start`, { method: 'POST', auth: true }),
    onSuccess: (data) => setStarted(data),
    onError: (err: Error) => setError(err.message),
  });

  useEffect(() => {
    startMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const recordAnswer = useMutation({
    mutationFn: async ({
      item,
      transcript,
      accuracy,
    }: {
      item: AssessmentItem;
      transcript: string;
      accuracy: number;
    }) => {
      const isParagraph = item.content_type === 'paragraph';
      const attempt = await api<{ attempt_id: string }>(`/student/learn/content/${item.content_id}/attempt`, {
        method: 'POST',
        auth: true,
        body: { accuracy, transcript, isFullSubmission: isParagraph, source: 'assessment' },
      });
      return { item, attempt };
    },
    onSuccess: ({ item, attempt }) => {
      setAnswers((prev) => ({
        ...prev,
        [item.assessment_item_id]: { assessment_item_id: item.assessment_item_id, content_attempt_id: attempt.attempt_id },
      }));
    },
    onError: (err: Error) => setError(err.message),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      api<SubmitResult>(`/student/learn/assessment/${started!.attempt_id}/submit`, {
        method: 'POST',
        auth: true,
        body: { responses: Object.values(answers) },
      }),
    onSuccess: (data) => setResult(data),
    onError: (err: Error) => setError(err.message),
  });

  const answerMultipleChoice = (item: AssessmentItem, selectedIndex: number) => {
    const isCorrect = selectedIndex === item.correct_answer_index;
    recordAnswer.mutate({
      item,
      transcript: item.answer_options?.[selectedIndex] ?? '',
      accuracy: isCorrect ? 100 : 0,
    });
  };

  const practiceSpeech = (item: AssessmentItem) => {
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
        recordAnswer.mutate({ item, transcript, accuracy });
      },
      (message) => {
        setListeningFor(null);
        setError(message);
      },
    );
  };

  if (startMutation.isPending) return <p>Naglo-load ang pagsusulit...</p>;
  if (error && !started) return <p className="text-[var(--color-danger)]">{error}</p>;
  if (!started) return null;

  if (result) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
        <p className="text-5xl">{result.passed ? '🎉' : '💪'}</p>
        <h1 className="text-2xl font-semibold">{result.passed ? 'Magaling!' : 'Malapit ka na!'}</h1>
        <p className="text-[var(--color-text-muted)]">Marka: {result.score}%</p>
        <button
          type="button"
          onClick={() => navigate('/student/learn')}
          className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-white"
        >
          Bumalik sa Matuto
        </button>
      </div>
    );
  }

  const allAnswered = started.items.every((item) => answers[item.assessment_item_id]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Pagsusulit</h1>
      {error && <p className="text-[var(--color-danger)]">{error}</p>}

      {started.items.map((item, idx) => {
        const isAnswered = Boolean(answers[item.assessment_item_id]);
        return (
          <div
            key={item.assessment_item_id}
            className={`rounded-xl border p-6 ${
              isAnswered ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}
          >
            <p className="mb-2 text-sm text-[var(--color-text-muted)]">Tanong {idx + 1}</p>
            <div className="mb-3 flex items-center gap-3">
              <p className="text-xl font-medium">{item.content_text}</p>
              <TTSButton text={item.content_text} />
            </div>

            {item.answer_options ? (
              <div className="flex flex-col gap-2">
                {item.answer_options.map((opt, i) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => answerMultipleChoice(item, i)}
                    className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-left hover:border-[var(--color-primary)] disabled:opacity-60"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                disabled={isAnswered || listeningFor === item.content_id}
                onClick={() => practiceSpeech(item)}
                className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                <IconLabel
                  icon="🎤"
                  label={isAnswered ? 'Nasagot na' : listeningFor === item.content_id ? 'Nakikinig...' : 'Bigkasin'}
                />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        disabled={!allAnswered || submitMutation.isPending}
        onClick={() => submitMutation.mutate()}
        className="self-start rounded-full bg-[var(--color-accent)] px-6 py-3 text-white disabled:opacity-60"
      >
        {submitMutation.isPending ? 'Isinusumite...' : 'Isumite ang Pagsusulit'}
      </button>
    </div>
  );
}
