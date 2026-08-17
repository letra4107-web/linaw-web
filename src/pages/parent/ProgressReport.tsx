import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';

interface Child {
  id: string;
  name: string;
}

interface PracticeSession {
  created_at: string;
  accuracy_percentage: number;
  is_correct: boolean;
}

export default function ProgressReport() {
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: children } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('children').select('id, name').order('name');
      if (error) throw error;
      return data as Child[];
    },
    enabled: Boolean(user),
  });

  const activeChildId = selectedChildId ?? children?.[0]?.id ?? null;

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['child-practice-sessions', activeChildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pronunciation_practice_sessions')
        .select('created_at, accuracy_percentage, is_correct')
        .eq('student_id', activeChildId!)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return data as PracticeSession[];
    },
    enabled: Boolean(activeChildId),
  });

  const chartData = (sessions ?? []).map((s) => ({
    date: new Date(s.created_at).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' }),
    accuracy: s.accuracy_percentage,
  }));

  const averageAccuracy =
    chartData.length > 0 ? Math.round(chartData.reduce((sum, d) => sum + d.accuracy, 0) / chartData.length) : null;
  const correctCount = (sessions ?? []).filter((s) => s.is_correct).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Progress Report</h1>
        <p className="text-[var(--color-text-muted)]">Ang pagbabago ng galing sa pagbasa sa paglipas ng panahon.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(children ?? []).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedChildId(c.id)}
            className={`rounded-full border px-4 py-2 text-sm ${
              activeChildId === c.id
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {isLoading && <p>Naglo-load...</p>}

      {!isLoading && chartData.length === 0 && (
        <p className="text-[var(--color-text-muted)]">Wala pang practice session na naitala para sa batang ito.</p>
      )}

      {chartData.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-2xl font-semibold text-[var(--color-primary)]">{averageAccuracy}%</p>
              <p className="text-sm text-[var(--color-text-muted)]">Average Accuracy</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-2xl font-semibold text-[var(--color-primary)]">{correctCount}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Tamang Sagot</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-2xl font-semibold text-[var(--color-primary)]">{sessions?.length ?? 0}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Kabuuang Attempts</p>
            </div>
          </div>

          <div className="h-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h2 className="mb-2 font-medium">Accuracy Over Time</h2>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="accuracy" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
