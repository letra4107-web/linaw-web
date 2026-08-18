import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { BADGE_CATALOG, BADGE_CATEGORY_LABEL, type BadgeCategory } from '../../lib/badges';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';

interface ChildProgress {
  achievements: { id: string; unlockedAt?: string }[] | Record<string, unknown>;
}

const CATEGORY_FILTERS: { value: BadgeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Lahat' },
  { value: 'reading', label: BADGE_CATEGORY_LABEL.reading },
  { value: 'practice', label: BADGE_CATEGORY_LABEL.practice },
  { value: 'progress', label: BADGE_CATEGORY_LABEL.progress },
  { value: 'consistency', label: BADGE_CATEGORY_LABEL.consistency },
];

export default function Achievements() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<BadgeCategory | 'all'>('all');

  const { data: child } = useQuery({
    queryKey: ['student-self', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('children').select('id').eq('auth_uid', user!.id).maybeSingle();
      if (error) throw error;
      return data as { id: string } | null;
    },
    enabled: Boolean(user),
  });

  const { data: progress } = useQuery({
    queryKey: ['student-progress', child?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_progress')
        .select('achievements')
        .eq('child_id', child!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ChildProgress | null;
    },
    enabled: Boolean(child?.id),
  });

  const unlocked = new Map<string, string | undefined>(
    Array.isArray(progress?.achievements)
      ? progress!.achievements.map((a) => [a.id, a.unlockedAt])
      : progress?.achievements
        ? Object.keys(progress.achievements).map((id) => [id, undefined])
        : [],
  );

  const badges = filter === 'all' ? BADGE_CATALOG : BADGE_CATALOG.filter((b) => b.category === filter);
  const unlockedCount = BADGE_CATALOG.filter((b) => unlocked.has(b.id)).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Parangal</h1>
        <p className="text-[var(--color-text-muted)]">
          {unlockedCount} sa {BADGE_CATALOG.length} badge ang nakuha mo na.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setFilter(c.value)}
            aria-pressed={filter === c.value}
            className={`rounded-full border px-4 py-2 text-sm ${
              filter === c.value
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {badges.map((badge, i) => {
          const isUnlocked = unlocked.has(badge.id);
          const unlockedAt = unlocked.get(badge.id);
          return (
            <div
              key={badge.id}
              className="flex flex-col items-center gap-2 rounded-xl border p-5 text-center"
              style={cardStyle(CARD_COLORS[i % CARD_COLORS.length], isUnlocked ? 10 : 6, isUnlocked ? 30 : 20)}
            >
              <img
                src={badge.image}
                alt={badge.title}
                className={`h-20 w-20 object-contain ${isUnlocked ? '' : 'opacity-30 grayscale'}`}
              />
              <p className={`font-medium ${isUnlocked ? '' : 'text-[var(--color-text-muted)]'}`}>{badge.title}</p>
              {isUnlocked ? (
                unlockedAt && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {new Date(unlockedAt).toLocaleDateString('fil-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )
              ) : (
                <p className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <span aria-hidden="true">🔒</span> {badge.criteria}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
