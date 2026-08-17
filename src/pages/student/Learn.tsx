import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { IconLabel } from '../../components/a11y/IconLabel';

interface ModuleSummary {
  id: string;
  module_number: number;
  title: string;
  description: string | null;
  instructional_content_type: string;
  assessment_id: string | null;
  state: 'locked' | 'unlocked' | 'completed';
  content_item_count: number;
  completed_content_item_count: number;
}

interface PathResponse {
  configured: boolean;
  effective_level: string;
  modules: ModuleSummary[];
}

const STATE_LABEL: Record<ModuleSummary['state'], { icon: string; label: string }> = {
  locked: { icon: '🔒', label: 'Naka-lock' },
  unlocked: { icon: '▶️', label: 'Handa nang Simulan' },
  completed: { icon: '✅', label: 'Tapos na' },
};

export default function Learn() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-learn-path'],
    queryFn: () => api<PathResponse>('/student/learn/path', { auth: true }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Matuto</h1>
        <p className="text-[var(--color-text-muted)]">
          {data ? `Kasalukuyang Antas: ${data.effective_level}` : 'Naglo-load...'}
        </p>
      </div>

      {isLoading && <p>Naglo-load...</p>}
      {error && <p className="text-[var(--color-danger)]">{(error as Error).message}</p>}

      {data && !data.configured && (
        <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[var(--color-text-muted)]">
          Wala pang aralin na handa para sa antas na ito. Balik-balikan mo na lang mamaya!
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(data?.modules ?? []).map((m) => {
          const state = STATE_LABEL[m.state];
          const clickable = m.state !== 'locked';
          const content = (
            <div
              className={`rounded-xl border p-6 ${
                clickable
                  ? 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-60'
              }`}
            >
              <p className="text-sm text-[var(--color-text-muted)]">Modyul {m.module_number}</p>
              <h2 className="mt-1 text-lg font-semibold">{m.title}</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{m.description}</p>
              <p className="mt-3 text-sm">
                <IconLabel icon={state.icon} label={state.label} />
              </p>
              {m.content_item_count > 0 && (
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {m.completed_content_item_count}/{m.content_item_count} tapos na
                </p>
              )}
            </div>
          );
          return clickable ? (
            <Link key={m.id} to={`/student/learn/module/${m.id}`}>
              {content}
            </Link>
          ) : (
            <div key={m.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
