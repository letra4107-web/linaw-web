import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { BADGE_CATALOG, BADGE_CATEGORY_LABEL, type BadgeCategory } from '../../lib/badges';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';
import trophyIcon from '../../assets/trophy.png';
import confetti from '../../assets/confetti.png';

interface ChildProgress {
  activities_completed: number;
  achievements: { id: string; unlockedAt?: string }[] | Record<string, unknown>;
}

const CATEGORY_FILTERS: { value: BadgeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Lahat' },
  { value: 'reading', label: BADGE_CATEGORY_LABEL.reading },
  { value: 'practice', label: BADGE_CATEGORY_LABEL.practice },
  { value: 'progress', label: BADGE_CATEGORY_LABEL.progress },
  { value: 'consistency', label: BADGE_CATEGORY_LABEL.consistency },
  { value: 'meta', label: BADGE_CATEGORY_LABEL.meta },
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
        .select('activities_completed, achievements')
        .eq('child_id', child!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ChildProgress | null;
    },
    enabled: Boolean(child?.id),
  });

  const unlocked = new Map<string, string | undefined>(
    Array.isArray(progress?.achievements)
      ? progress.achievements.map((achievement) => [achievement.id, achievement.unlockedAt])
      : progress?.achievements
        ? Object.keys(progress.achievements).map((id) => [id, undefined])
        : [],
  );
  const badges = filter === 'all' ? BADGE_CATALOG : BADGE_CATALOG.filter((badge) => badge.category === filter);
  const unlockedCount = BADGE_CATALOG.filter((badge) => unlocked.has(badge.id)).length;
  const collectionPct = Math.round((unlockedCount / BADGE_CATALOG.length) * 100);
  const activitiesCompleted = progress?.activities_completed ?? 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="relative overflow-hidden rounded-3xl border p-5 shadow-card sm:p-7" style={cardStyle('--color-brand-sun', 12, 36)}>
        <div aria-hidden="true" className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/35" />
        <img src={confetti} alt="" aria-hidden="true" className="pointer-events-none absolute right-20 bottom-2 hidden h-20 w-20 object-contain opacity-30 sm:block" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/75 shadow-sm"><img src={trophyIcon} alt="" aria-hidden="true" className="h-11 w-11 object-contain" /></span>
            <div>
              <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-warning-text)] uppercase">Iyong koleksyon</p>
              <h1 className="text-2xl font-bold sm:text-3xl">Parangal</h1>
              <p className="text-sm text-[var(--color-text-muted)] sm:text-base">Bawat badge ay tanda ng iyong pagsisikap.</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 px-5 py-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-[var(--color-primary)]">{unlockedCount}/{BADGE_CATALOG.length}</p>
            <p className="text-xs font-bold text-[var(--color-text-muted)]">Nakuha na</p>
          </div>
        </div>
        <div className="relative mt-5 flex items-center gap-3" role="progressbar" aria-label="Progreso sa koleksyon ng badge" aria-valuemin={0} aria-valuemax={100} aria-valuenow={collectionPct}>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/75 shadow-inner"><div className="h-full rounded-full bg-[var(--color-brand-sun)] transition-[width] duration-500" style={{ width: `${collectionPct}%` }} /></div>
          <span className="text-sm font-bold text-[var(--color-warning-text)]">{collectionPct}%</span>
        </div>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="toolbar" aria-label="Salain ang mga parangal">
        {CATEGORY_FILTERS.map((category) => (
          <button key={category.value} type="button" onClick={() => setFilter(category.value)} aria-pressed={filter === category.value} className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-all ${filter === category.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-card' : 'border-[var(--color-border)] bg-white/55 hover:border-[var(--color-primary)] hover:bg-white/80'}`}>
            {category.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {badges.map((badge, index) => {
          const isUnlocked = unlocked.has(badge.id);
          const unlockedAt = unlocked.get(badge.id);
          const isInProgress = !isUnlocked && badge.threshold !== undefined && activitiesCompleted > 0 && activitiesCompleted < badge.threshold;
          const badgePct = badge.threshold ? Math.min(100, Math.round((activitiesCompleted / badge.threshold) * 100)) : 0;
          const stateLabel = isUnlocked ? 'Nakuha na' : isInProgress ? 'Umuusad' : 'Naka-lock';

          return (
            <article
              key={badge.id}
              className={`relative flex min-w-0 flex-col items-center overflow-hidden rounded-3xl border p-5 text-center shadow-card transition-all ${isUnlocked ? 'hover:-translate-y-1 hover:shadow-raised' : isInProgress ? 'border-dashed' : 'border-dashed opacity-80'}`}
              style={isUnlocked ? cardStyle(CARD_COLORS[index % CARD_COLORS.length], 12, 36) : isInProgress ? cardStyle('--color-brand-lavender', 7, 28) : { backgroundColor: 'color-mix(in srgb, var(--color-surface) 88%, var(--color-border))', borderColor: 'var(--color-border)' }}
            >
              <span className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${isUnlocked ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : isInProgress ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'bg-white/70 text-[var(--color-text-muted)]'}`}>
                {isUnlocked ? '✓ ' : isInProgress ? '◔ ' : '🔒 '}{stateLabel}
              </span>
              <div className={`mt-5 flex h-28 w-28 items-center justify-center rounded-full ${isUnlocked ? 'bg-white/65 shadow-inner' : 'bg-white/50'}`}>
                <img src={badge.image} alt={badge.title} className={`h-24 w-24 object-contain transition-transform ${isUnlocked ? 'drop-shadow-md hover:scale-110' : isInProgress ? 'opacity-60 grayscale-[35%]' : 'opacity-25 grayscale'}`} />
              </div>
              <p className={`mt-3 text-lg leading-snug font-bold ${isUnlocked ? '' : 'text-[var(--color-text-muted)]'}`}>{badge.title}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">{BADGE_CATEGORY_LABEL[badge.category]} · +{badge.xp} XP</p>

              {isUnlocked ? (
                <div className="mt-auto pt-3">
                  <p className="text-sm font-bold text-[var(--color-success)]">Mahusay! Iyo na ito.</p>
                  {unlockedAt && <time dateTime={unlockedAt} className="mt-1 block text-xs text-[var(--color-text-muted)]">{new Date(unlockedAt).toLocaleDateString('fil-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</time>}
                </div>
              ) : isInProgress && badge.threshold ? (
                <div className="mt-auto w-full pt-4">
                  <div className="mb-1.5 flex justify-between gap-2 text-xs font-bold"><span>{activitiesCompleted}/{badge.threshold} gawain</span><span>{badgePct}%</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/80 shadow-inner" role="progressbar" aria-label={`Progreso para sa ${badge.title}`} aria-valuemin={0} aria-valuemax={badge.threshold} aria-valuenow={activitiesCompleted}><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${badgePct}%` }} /></div>
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">{badge.criteria}</p>
                </div>
              ) : (
                <p className="mt-auto pt-4 text-xs leading-relaxed text-[var(--color-text-muted)]">{badge.criteria}</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
