import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce } from '../../lib/speech';
import { TTSButton } from '../../components/a11y/TTSButton';
import { IconLabel } from '../../components/a11y/IconLabel';

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
  const [lastResult, setLastResult] = useState<{ contentId: string; transcript: string; accuracy: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['student-module', moduleId],
    queryFn: () => api<ModuleContentResponse>(`/student/learn/module/${moduleId}`, { auth: true }),
    enabled: Boolean(moduleId),
  });

  const submitAttempt = useMutation({
    mutationFn: async ({ contentId, transcript, accuracy }: { contentId: string; transcript: string; accuracy: number }) => {
      const isParagraph = data?.module.instructional_content_type === 'paragraph';
      await api(`/student/learn/content/${contentId}/attempt`, {
        method: 'POST',
        auth: true,
        body: {
          accuracy,
          transcript,
          isFullSubmission: isParagraph,
          source: 'practice',
        },
      });
    },
    onSuccess: () => {
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
        setLastResult({ contentId: item.content_id, transcript, accuracy });
        submitAttempt.mutate({ contentId: item.content_id, transcript, accuracy });
      },
      (message) => {
        setListeningFor(null);
        setError(message);
      },
    );
  };

  const allCompleted = (data?.items ?? []).length > 0 && (data?.items ?? []).every((i) => i.completed);

  if (isLoading) return <p>Naglo-load...</p>;
  if (!data) return <p className="text-[var(--color-danger)]">Hindi mahanap ang aralin.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.module.title}</h1>
        <p className="text-[var(--color-text-muted)]">{data.module.description}</p>
      </div>

      {error && <p className="text-[var(--color-danger)]">{error}</p>}

      <div className="flex flex-col gap-4">
        {data.items.map((item) => (
          <div
            key={item.module_item_id}
            className={`rounded-xl border p-6 ${
              item.completed ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-2xl font-medium">{item.content_text}</p>
              <TTSButton text={item.content_text} />
            </div>
            <div className="mt-4 flex items-center gap-3">
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
              {item.completed && (
                <span className="text-sm text-[var(--color-primary)]">
                  <IconLabel icon="✅" label="Tapos na" />
                </span>
              )}
              {lastResult?.contentId === item.content_id && (
                <span className="text-sm text-[var(--color-text-muted)]">
                  Narinig: "{lastResult.transcript}" · {lastResult.accuracy}% tumpak
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {data.module.assessment_id && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
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
    </div>
  );
}
