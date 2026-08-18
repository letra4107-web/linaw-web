import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { ReadingInsightsPanel, type ReadingProfile } from '../../components/ReadingInsightsPanel';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';
import { BADGE_CATALOG } from '../../lib/badges';

interface Child {
  id: string;
  name: string;
}

interface PracticeSession {
  created_at: string;
  accuracy_percentage: number;
  is_correct: boolean;
}

interface ChildAchievements {
  achievements: { id: string; unlockedAt?: string }[] | Record<string, unknown> | null;
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

  const { data: readingProfile } = useQuery({
    queryKey: ['parent-reading-profile', activeChildId],
    queryFn: () => api<{ profile: ReadingProfile }>(`/parent/children/${activeChildId}/reading-profile`, { auth: true }),
    enabled: Boolean(activeChildId),
  });

  const { data: childProgress } = useQuery({
    queryKey: ['parent-child-achievements', activeChildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_progress')
        .select('achievements')
        .eq('child_id', activeChildId!)
        .maybeSingle();
      if (error) throw error;
      return data as ChildAchievements | null;
    },
    enabled: Boolean(activeChildId),
  });

  const unlockedBadgeIds = new Map<string, string | undefined>(
    Array.isArray(childProgress?.achievements)
      ? childProgress!.achievements.map((a) => [a.id, a.unlockedAt])
      : childProgress?.achievements
        ? Object.keys(childProgress.achievements).map((id) => [id, undefined])
        : [],
  );
  const earnedBadges = BADGE_CATALOG.filter((b) => unlockedBadgeIds.has(b.id));

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
        <h1 className="text-2xl font-semibold">Ulat ng Progreso</h1>
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
            <div className="rounded-xl border p-4" style={cardStyle('--color-brand-lavender')}>
              <p className="text-2xl font-semibold text-[var(--color-primary)]">{averageAccuracy}%</p>
              <p className="text-sm text-[var(--color-text-muted)]">Karaniwang Accuracy</p>
            </div>
            <div className="rounded-xl border p-4" style={cardStyle('--color-brand-sun')}>
              <p className="text-2xl font-semibold text-[var(--color-primary)]">{correctCount}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Tamang Sagot</p>
            </div>
            <div className="rounded-xl border p-4" style={cardStyle('--color-brand-sage')}>
              <p className="text-2xl font-semibold text-[var(--color-primary)]">{sessions?.length ?? 0}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Kabuuang Attempts</p>
            </div>
          </div>

          <div className="h-72 rounded-xl border p-4" style={cardStyle('--color-brand-teal')}>
            <h2 className="mb-2 font-medium">Accuracy sa Paglipas ng Panahon</h2>
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

      {activeChildId && (
        <div className="rounded-xl border p-6" style={cardStyle('--color-brand-sun')}>
          <h2 className="mb-1 text-lg font-semibold">Mga Nakuhang Badge</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            {earnedBadges.length} sa {BADGE_CATALOG.length} badge ang nakuha na ng anak mo.
          </p>
          {earnedBadges.length === 0 ? (
            <p className="text-[var(--color-text-muted)]">Wala pang nakukuhang badge.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {earnedBadges.map((badge, i) => {
                const unlockedAt = unlockedBadgeIds.get(badge.id);
                return (
                  <div
                    key={badge.id}
                    className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center"
                    style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}
                  >
                    <img src={badge.image} alt={badge.title} className="h-16 w-16 object-contain" />
                    <p className="text-sm font-medium">{badge.title}</p>
                    {unlockedAt && (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {new Date(unlockedAt).toLocaleDateString('fil-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {readingProfile && <ReadingInsightsPanel profile={readingProfile.profile} />}
    </div>
  );
}
