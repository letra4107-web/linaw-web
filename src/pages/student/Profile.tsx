import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { TTSSpeedControl } from '../../components/a11y/TTSSpeedControl';
import { ReadingInsightsPanel, type ReadingProfile } from '../../components/ReadingInsightsPanel';
import { findBadge } from '../../lib/badges';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';
import profileIcon from '../../assets/profile.png';
import trophyIcon from '../../assets/trophy.png';
import spark from '../../assets/spark.png';

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
  return id.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
    ? progress.achievements.map((achievement) => achievement.id)
    : progress?.achievements
      ? Object.keys(progress.achievements)
      : [];
  const displayName = child?.name ?? 'Mag-aaral';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'M';

  const stats = [
    { icon: '📚', label: 'Antas', value: progress?.level ?? '—' },
    { icon: '⭐', label: 'Kabuuang XP', value: progress?.xp ?? 0 },
    { icon: '🔥', label: 'Kasalukuyang streak', value: progress?.streak ?? 0 },
    { icon: '🏆', label: 'Pinakamahabang streak', value: progress?.longest_streak ?? 0 },
    { icon: '🔤', label: 'Mga salitang natapos', value: progress?.word_count ?? 0 },
    { icon: '✓', label: 'Mga gawaing natapos', value: progress?.activities_completed ?? 0 },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      <header className="relative overflow-hidden rounded-3xl border p-5 text-white shadow-hero sm:p-7" style={{ backgroundImage: 'linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))' }}>
        <div aria-hidden="true" className="absolute -top-20 -right-14 h-52 w-52 rounded-full bg-white/10" />
        <img src={spark} alt="" aria-hidden="true" className="absolute top-6 right-8 h-8 w-8 opacity-60" />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] border-4 border-white/55 bg-white/20 text-5xl font-bold shadow-lg backdrop-blur">
            <img src={profileIcon} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-contain p-3 opacity-30" />
            <span className="relative">{initial}</span>
            <span className="absolute -right-2 -bottom-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand-sun)] text-base shadow-card" aria-hidden="true">★</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold tracking-[0.12em] text-white/75 uppercase">Aking profile</p>
            <h1 className="truncate text-3xl font-bold sm:text-4xl">{displayName}</h1>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">Grade {child?.grade_level ?? '—'}</span>
              <span className="max-w-full truncate rounded-full bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">@{child?.username ?? 'student'}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">{progress?.level ?? 'Baguhan'}</span>
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="progress-title">
        <div className="mb-4">
          <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-primary)] uppercase">Iyong pag-unlad</p>
          <h2 id="progress-title" className="text-2xl font-bold">Mga Numero Ko</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat, index) => (
            <div key={stat.label} className="min-w-0 rounded-3xl border p-4 shadow-card" style={cardStyle(CARD_COLORS[index % CARD_COLORS.length])}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/65 text-lg" aria-hidden="true">{stat.icon}</span>
              <p className="mt-3 break-words text-xl leading-tight font-bold text-[var(--color-primary)] sm:text-2xl">{stat.value}</p>
              <p className="mt-1 text-xs leading-snug font-semibold text-[var(--color-text-muted)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {readingProfile && <section aria-label="Kaalaman sa pagbabasa" className="min-w-0 overflow-hidden"><ReadingInsightsPanel profile={readingProfile.profile} /></section>}

      <section aria-labelledby="voice-title" className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-teal', 8, 30)}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-xl" aria-hidden="true">🔊</span>
          <div>
            <h2 id="voice-title" className="text-xl font-bold">Bilis ng Pagbasa ng Boses</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Piliin kung gaano kabilis magbasa nang malakas ang app sa lahat ng bahagi.</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto pb-1"><TTSSpeedControl /></div>
      </section>

      <section aria-labelledby="badges-title" className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-sun', 8, 30)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70"><img src={trophyIcon} alt="" aria-hidden="true" className="h-7 w-7 object-contain" /></span>
            <div>
              <h2 id="badges-title" className="text-xl font-bold">Mga Nakuhang Badge</h2>
              <p className="text-sm text-[var(--color-text-muted)]">{badges.length} badge ang nasa koleksyon mo.</p>
            </div>
          </div>
          <Link to="/student/achievements" className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-bold text-[var(--color-primary)] transition-colors hover:bg-white/70">Tingnan lahat →</Link>
        </div>
        {badges.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-white/55 p-4 text-[var(--color-text-muted)]">Wala pang nakukuhang badge. Magpatuloy sa pagbasa!</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((id, index) => {
              const badge = findBadge(id);
              return (
                <div key={id} className="flex min-w-0 items-center gap-3 rounded-2xl border p-3" style={cardStyle(CARD_COLORS[index % CARD_COLORS.length])}>
                  {badge ? <img src={badge.image} alt="" className="h-12 w-12 shrink-0 object-contain drop-shadow-sm" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/70">🏅</span>}
                  <span className="min-w-0 truncate font-bold">{badge?.title ?? badgeLabel(id)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
