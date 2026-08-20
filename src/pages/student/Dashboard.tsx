import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { IconLabel } from '../../components/a11y/IconLabel';
import { WordOfDayCard } from '../../components/WordOfDayCard';
import { cardStyle } from '../../lib/cardStyle';
import type { ReadingProfile } from '../../components/ReadingInsightsPanel';

interface ChildProgress {
  xp: number;
  streak: number;
  activities_completed: number;
  achievements: { id: string }[] | Record<string, unknown>;
}

interface ModuleSummary {
  module_number: number;
  title: string;
  state: 'locked' | 'unlocked' | 'completed';
  content_item_count: number;
  completed_content_item_count: number;
}

interface LearnPath {
  configured: boolean;
  modules: ModuleSummary[];
}

interface PdfAssignment {
  id: string;
  status: string;
  due_date: string | null;
  pdf_materials: { title: string } | null;
}

interface PracticeSession {
  created_at: string;
}

const QUICK_ACTIONS = [
  { to: '/student/learn', icon: '📖', label: 'Aralin', brandVar: '--color-brand-lavender' },
  { to: '/student/practice', icon: '🎙️', label: 'Pagsasanay', brandVar: '--color-brand-coral' },
  { to: '/student/achievements', icon: '🏅', label: 'Parangal', brandVar: '--color-brand-sun' },
];

function IconBadge({ icon, brandVar }: { icon: string; brandVar: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl shadow-sm"
      style={{ backgroundColor: `color-mix(in srgb, var(${brandVar}) 22%, white)` }}
    >
      {icon}
    </span>
  );
}

export default function Dashboard() {
  const { user, identity } = useAuth();

  const { data: child } = useQuery({
    queryKey: ['student-self', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('children').select('id, name').eq('auth_uid', user!.id).maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string } | null;
    },
    enabled: Boolean(user),
  });

  const { data: progress } = useQuery({
    queryKey: ['student-progress', child?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_progress')
        .select('xp, streak, activities_completed, achievements')
        .eq('child_id', child!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ChildProgress | null;
    },
    enabled: Boolean(child?.id),
  });

  const { data: path } = useQuery({
    queryKey: ['student-learn-path'],
    queryFn: () => api<LearnPath>('/student/learn/path', { auth: true }),
    enabled: Boolean(user),
  });

  const { data: deadlines } = useQuery({
    queryKey: ['student-pdf-deadlines', child?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdf_assignments')
        .select('id, status, due_date, pdf_materials(title)')
        .eq('student_id', child!.id)
        .neq('status', 'completed')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(3);
      if (error) throw error;
      return data as unknown as PdfAssignment[];
    },
    enabled: Boolean(child?.id),
  });

  const { data: recentSessions } = useQuery({
    queryKey: ['student-recent-sessions', child?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pronunciation_practice_sessions')
        .select('created_at')
        .eq('student_id', child!.id)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as PracticeSession[];
    },
    enabled: Boolean(child?.id),
  });

  const { data: readingProfile } = useQuery({
    queryKey: ['student-reading-profile', user?.id],
    queryFn: () => api<{ profile: ReadingProfile }>('/student/reading-profile', { auth: true }),
    enabled: Boolean(user),
  });

  const achievementCount = Array.isArray(progress?.achievements)
    ? progress!.achievements.length
    : progress?.achievements
      ? Object.keys(progress.achievements).length
      : 0;

  const profile = readingProfile?.profile;
  const recommendedFocus = profile?.weakSounds[0]?.unit?.toUpperCase() ?? profile?.weakWords[0]?.word ?? null;

  const modules = path?.modules ?? [];
  const currentModuleIndex = modules.findIndex((m) => m.state === 'unlocked');
  const currentModule = currentModuleIndex >= 0 ? modules[currentModuleIndex] : undefined;
  const allCompleted = modules.length > 0 && modules.every((m) => m.state === 'completed');
  const modulePct = currentModule
    ? Math.round((currentModule.completed_content_item_count / Math.max(1, currentModule.content_item_count)) * 100)
    : 0;

  const firstName = child?.name?.split(' ')[0] ?? identity?.displayName ?? 'kaibigan';

  const hasActivity = (progress?.activities_completed ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero — greeting + playful sticker stats, mascot, and a wave into the content below */}
      <div
        className="relative overflow-hidden rounded-[2rem] pt-7 pb-12 text-white shadow-hero sm:pt-10 sm:pb-16"
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))',
        }}
      >
        <div aria-hidden="true" className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-28 h-56 w-56 rounded-full bg-white/5" />
        <div aria-hidden="true" className="pointer-events-none absolute top-6 left-1/2 h-24 w-24 rounded-full bg-white/5 sm:left-2/3" />
        <span aria-hidden="true" className="pointer-events-none absolute top-8 right-10 text-2xl opacity-70 sm:right-16">✨</span>
        <span aria-hidden="true" className="pointer-events-none absolute top-20 right-24 text-lg opacity-50 sm:right-40">⭐</span>

        <div className="relative z-10 px-7 sm:px-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-wide text-white/75 uppercase">Kumusta ka ngayon?</p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{firstName}! 👋</h1>
              <p className="mt-2 text-white/85">Handa ka na bang matuto ngayon?</p>
            </div>
            <span
              aria-hidden="true"
              className="hidden h-16 w-16 shrink-0 rotate-6 items-center justify-center rounded-2xl bg-white/15 text-4xl shadow-lg backdrop-blur sm:flex"
            >
              🦉
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">⭐</span>
              {progress?.xp ?? 0} XP
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">🔥</span>
              {progress?.streak ?? 0} araw na streak
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">🏅</span>
              {achievementCount} parangal
            </span>
          </div>
        </div>

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 left-0 h-10 w-full text-[var(--color-bg)] sm:h-14"
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
        >
          <path d="M0 24C50 8 100 40 150 24S250 8 300 24 400 8 400 24V40H0Z" fill="currentColor" />
        </svg>
      </div>

      {/* Bento row — progress is the wide rectangle (has the most to say), each quick
          action is a square (icon + one line, nothing more) so the two shapes read as
          "this needs your attention" vs "tap to jump somewhere" at a glance. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div
          className="col-span-2 overflow-hidden rounded-2xl border shadow-card lg:col-span-2"
          style={cardStyle('--color-brand-lavender', 10, 35)}
        >
          <div className="flex h-full flex-col gap-4 p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <IconBadge icon="📖" brandVar="--color-brand-lavender" />
              <h2 className="text-lg font-semibold">Ipagpatuloy ang Pag-aaral</h2>
            </div>

            {allCompleted ? (
              <p className="text-[var(--color-text-muted)]">Tapos na ang mga aralin sa modyul na ito! 🎉</p>
            ) : currentModule ? (
              <>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Aralin {currentModuleIndex + 1} ng {modules.length} — {currentModule.title}
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/70 shadow-inner">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: `${modulePct}%`, backgroundImage: 'linear-gradient(90deg, var(--color-hero-from), var(--color-hero-via))' }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-[var(--color-primary)]">{modulePct}%</span>
                </div>
                <Link
                  to="/student/learn"
                  className="mt-auto inline-flex w-fit items-center rounded-full bg-[var(--color-primary)] px-6 py-3 font-medium text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-raised active:scale-95"
                >
                  Ipagpatuloy
                </Link>
              </>
            ) : (
              <>
                <p className="text-[var(--color-text-muted)]">Wala pang binabasang aralin — simulan ang isa!</p>
                <Link
                  to="/student/learn"
                  className="mt-auto inline-flex w-fit items-center rounded-full bg-[var(--color-primary)] px-6 py-3 font-medium text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-raised active:scale-95"
                >
                  Simulan
                </Link>
              </>
            )}
          </div>
        </div>

        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            style={cardStyle(action.brandVar, 10, 35)}
            className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center shadow-card transition-all hover:-translate-y-1 hover:rotate-1 hover:shadow-raised active:scale-95"
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-sm transition-transform group-hover:scale-110 group-hover:-rotate-6"
              style={{ backgroundColor: `color-mix(in srgb, var(${action.brandVar}) 25%, white)` }}
              aria-hidden="true"
            >
              {action.icon}
            </span>
            <p className="text-sm font-semibold">{action.label}</p>
          </Link>
        ))}
      </div>

      {/* Encouragement / practice CTA — coral, energetic, one big playful rectangle */}
      <div
        className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border p-6 shadow-card sm:p-7"
        style={cardStyle('--color-brand-coral', 12, 35)}
      >
        <span aria-hidden="true" className="pointer-events-none absolute top-3 right-6 text-xl opacity-40">✨</span>
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-4 left-1/3 text-5xl opacity-10">🎙️</span>
        <div className="relative z-10 flex items-center gap-3">
          <IconBadge icon="🎙️" brandVar="--color-brand-coral" />
          <p className="font-medium">Bawat pagsasanay ay isang hakbang pasulong!</p>
        </div>
        <Link
          to="/student/practice"
          className="relative z-10 inline-flex shrink-0 items-center rounded-full bg-[var(--color-brand-coral)] px-6 py-3 font-medium text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised active:scale-95"
        >
          <IconLabel icon="🎙️" label="Ipagpatuloy ang Pagsasanay" />
        </Link>
      </div>

      {/* Word of the day — the day's headline activity, so it gets the full-width rectangle */}
      <WordOfDayCard streak={progress?.streak ?? 0} />

      {!hasActivity && (
        <p className="rounded-full bg-[var(--color-success-soft)] px-5 py-3 text-center font-medium text-[var(--color-success)]">
          🌱 Simulan ang unang pagsasanay ngayon!
        </p>
      )}

      {/* Practice mode entry cards — two even rectangles, same shape as the CTA above them */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/student/practice?mode=say"
          className="group flex items-center gap-4 rounded-2xl border p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised active:scale-95"
          style={cardStyle('--color-brand-coral', 10, 35)}
        >
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl shadow-sm transition-transform group-hover:scale-110"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-brand-coral) 25%, white)' }}
            aria-hidden="true"
          >
            🎙️
          </span>
          <div>
            <p className="font-semibold">Sabihin ang Salita</p>
            <p className="text-sm text-[var(--color-text-muted)]">AI na Pagsasanay sa Bigkas</p>
          </div>
        </Link>
        <Link
          to="/student/practice?mode=listen"
          className="group flex items-center gap-4 rounded-2xl border p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised active:scale-95"
          style={cardStyle('--color-brand-lavender', 10, 35)}
        >
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl shadow-sm transition-transform group-hover:scale-110"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-brand-lavender) 25%, white)' }}
            aria-hidden="true"
          >
            🔊
          </span>
          <div>
            <p className="font-semibold">Pakinggan at Basahin</p>
            <p className="text-sm text-[var(--color-text-muted)]">Suporta sa Text-to-Speech</p>
          </div>
        </Link>
      </div>

      {/* AI-backed recommendation — lavender-dark, only shown once there's enough session data to trust it */}
      {profile && profile.sessionCount > 0 && (
        <div className="rounded-2xl border p-6 shadow-card" style={cardStyle('--color-brand-violet', 10, 35)}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <IconBadge icon="🤖" brandVar="--color-brand-violet" />
              <h2 className="text-lg font-semibold">Inirekomendang Pagsasanay</h2>
            </div>
            <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-semibold text-[var(--color-brand-violet)]">
              {profile.confidenceScore}% Kumpiyansa
            </span>
          </div>
          <p className="mb-1">{profile.recommendedHomePractice}</p>
          {recommendedFocus && <p className="text-sm text-[var(--color-text-muted)]">Pokus: {recommendedFocus}</p>}
          <Link
            to="/student/practice"
            className="mt-3 inline-flex items-center rounded-full bg-[var(--color-brand-violet)] px-5 py-2.5 text-sm text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised active:scale-95"
          >
            Simulan ang Pagsasanay
          </Link>
        </div>
      )}

      {/* Deadlines + recent activity — content-length varies (could be 1 line or a list), so
          these stay as a pair of rectangles rather than being forced into squares. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Deadlines — sun/amber, like a calendar */}
        <div className="rounded-2xl border p-6 shadow-card" style={cardStyle('--color-brand-sun', 10, 35)}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <IconBadge icon="📅" brandVar="--color-brand-sun" />
              <h2 className="text-lg font-semibold">Deadline</h2>
            </div>
            <Link to="/student/learn" className="text-sm font-medium text-[var(--color-primary)] underline">
              Tingnan
            </Link>
          </div>
          {deadlines && deadlines.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {deadlines.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-white bg-white/60 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium">{d.pdf_materials?.title ?? 'Aralin'}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {new Date(d.due_date!).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--color-text-muted)]">
              🌱 Malinis ang schedule mo ngayon. Magpatuloy sa pagsasanay!
            </p>
          )}
        </div>

        {/* Recent activity — sage, calm reflection */}
        <div className="rounded-2xl border p-6 shadow-card" style={cardStyle('--color-brand-sage', 10, 35)}>
          <div className="mb-3 flex items-center gap-3">
            <IconBadge icon="🎙️" brandVar="--color-brand-sage" />
            <h2 className="text-lg font-semibold">Kamakailang Aktibidad</h2>
          </div>
          {recentSessions && recentSessions.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {recentSessions.map((s, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-white bg-white/60 px-4 py-2.5 text-sm">
                  <IconLabel icon="🎙️" label="Pagsasanay sa Bigkas" />
                  <span className="text-[var(--color-text-muted)]">
                    {new Date(s.created_at).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--color-text-muted)]">Wala ka pang aktibidad. Magsimula ng pagsasanay ngayon!</p>
          )}
        </div>
      </div>

      {/* Reading tip — teal, distinct "helpful info" color */}
      <div className="flex items-start gap-3 rounded-2xl border p-6 shadow-card" style={cardStyle('--color-brand-teal', 10, 35)}>
        <IconBadge icon="💡" brandVar="--color-brand-teal" />
        <div>
          <h2 className="mb-1 font-semibold">Tip sa Pagbasa</h2>
          <p className="text-[var(--color-text-muted)]">
            Basahin ang bawat pantig nang dahan-dahan bago sabihin ang buong salita.
          </p>
        </div>
      </div>

      <p className="text-center text-lg font-medium text-[var(--color-primary)]">
        Bawat salitang nababasa mo, lumalakas ka!
      </p>
    </div>
  );
}
