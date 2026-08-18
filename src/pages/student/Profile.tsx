import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { IconLabel } from '../../components/a11y/IconLabel';
import { ReadingInsightsPanel, type ReadingProfile } from '../../components/ReadingInsightsPanel';
import { findBadge } from '../../lib/badges';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';

interface ChildRow {
  id: string;
  name: string;
  grade_level: number;
  username: string;
}

interface ChildProgress {
  level: string;
  xp: number;
  streak: number;
  longest_streak: number;
  word_count: number;
  activities_completed: number;
  achievements: { id: string; unlockedAt?: string }[] | Record<string, unknown>;
}

function badgeLabel(id: string): string {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Profile() {
  const { user } = useAuth();

  const { data: child } = useQuery({
    queryKey: ['student-self', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, grade_level, username')
        .eq('auth_uid', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ChildRow | null;
    },
    enabled: Boolean(user),
  });

  const { data: progress } = useQuery({
    queryKey: ['student-progress', child?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_progress')
        .select('level, xp, streak, longest_streak, word_count, activities_completed, achievements')
        .eq('child_id', child!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ChildProgress | null;
    },
    enabled: Boolean(child?.id),
  });

  const { data: readingProfile } = useQuery({
    queryKey: ['student-reading-profile', user?.id],
    queryFn: () => api<{ profile: ReadingProfile }>('/student/reading-profile', { auth: true }),
    enabled: Boolean(user),
  });

  const badges: string[] = Array.isArray(progress?.achievements)
    ? progress!.achievements.map((a) => a.id)
    : progress?.achievements
      ? Object.keys(progress.achievements)
      : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile Ko</h1>
        <p className="text-[var(--color-text-muted)]">
          {child?.name} · Grade {child?.grade_level} · {child?.username}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: '📚', label: 'Antas', value: progress?.level ?? '-' },
          { icon: '⭐', label: 'XP', value: progress?.xp ?? 0 },
          { icon: '🔥', label: 'Streak', value: progress?.streak ?? 0 },
          { icon: '🏆', label: 'Pinakamahabang Streak', value: progress?.longest_streak ?? 0 },
          { icon: '🔤', label: 'Mga Salitang Natapos', value: progress?.word_count ?? 0 },
          { icon: '✅', label: 'Mga Gawaing Natapos', value: progress?.activities_completed ?? 0 },
        ].map((stat, i) => (
          <div key={stat.label} className="rounded-xl border p-4" style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}>
            <p className="text-2xl font-semibold text-[var(--color-primary)]">{stat.value}</p>
            <p className="mt-1 text-sm">
              <IconLabel icon={stat.icon} label={stat.label} />
            </p>
          </div>
        ))}
      </div>

      {readingProfile && <ReadingInsightsPanel profile={readingProfile.profile} />}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Mga Nakuhang Badge</h2>
        {badges.length === 0 && <p className="text-[var(--color-text-muted)]">Wala pang nakukuhang badge. Magpatuloy sa pagbasa!</p>}
        <div className="flex flex-wrap gap-3">
          {badges.map((id, i) => {
            const badge = findBadge(id);
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-full border py-2 pr-4 pl-2"
                style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}
              >
                {badge ? (
                  <>
                    <img src={badge.image} alt="" className="h-7 w-7 object-contain" />
                    <span>{badge.title}</span>
                  </>
                ) : (
                  <IconLabel icon="🏅" label={badgeLabel(id)} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
