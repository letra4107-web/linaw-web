import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { IconLabel } from '../../components/a11y/IconLabel';
import { WordOfDayCard } from '../../components/WordOfDayCard';
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

// Each card gets its own consistent color so kids can recognize a section by color, not just position.
function cardStyle(brandVar: string, tintPct = 12, borderPct = 35) {
  return {
    backgroundColor: `color-mix(in srgb, var(${brandVar}) ${tintPct}%, white)`,
    borderColor: `color-mix(in srgb, var(${brandVar}) ${borderPct}%, white)`,
  };
}

const QUICK_ACTIONS = [
  { to: '/student/learn', icon: '📖', label: 'Aralin', brandVar: '--color-brand-lavender' },
  { to: '/student/practice', icon: '🎙️', label: 'Pagsasanay', brandVar: '--color-brand-coral' },
  { to: '/student/achievements', icon: '🏅', label: 'Parangal', brandVar: '--color-brand-sun' },
];

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

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-hero sm:p-8"
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))',
        }}
      >
        <h1 className="text-3xl font-bold sm:text-4xl">
          Kumusta,
          <br />
          {firstName}! 👋
        </h1>
        <p className="mt-2 text-white/85">Handa ka na bang matuto ngayon?</p>
      </div>

      {/* Deadlines — sun/amber, like a calendar */}
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-sun')}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            <IconLabel icon="📅" label="Mga Paparating na Deadline" />
          </h2>
          <Link to="/student/learn" className="text-sm font-medium text-[var(--color-primary)] underline">
            Tingnan ang mga aralin
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

      {/* Encouragement / practice CTA — coral, energetic */}
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-coral')}>
        <p className="mb-3 font-medium">Bawat pagsasanay ay isang hakbang pasulong!</p>
        <Link
          to="/student/practice"
          className="inline-flex items-center rounded-full bg-[var(--color-brand-coral)] px-6 py-3 text-white transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          <IconLabel icon="🎙️" label="Ipagpatuloy ang Pagsasanay" />
        </Link>
      </div>

      {/* Continue learning — lavender, core identity */}
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-lavender')}>
        <h2 className="mb-3 text-lg font-semibold">Ipagpatuloy ang Pag-aaral</h2>
        {allCompleted ? (
          <p className="text-[var(--color-text-muted)]">Tapos na ang mga aralin sa modyul na ito! 🎉</p>
        ) : currentModule ? (
          <>
            <p className="mb-2 text-sm text-[var(--color-text-muted)]">
              Aralin {currentModuleIndex + 1} ng {modules.length} — {currentModule.title}
            </p>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/70">
              <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width]" style={{ width: `${modulePct}%` }} />
            </div>
            <p className="mb-3 text-sm text-[var(--color-text-muted)]">{modulePct}%</p>
            <Link
              to="/student/learn"
              className="inline-flex items-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-white transition-transform hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:scale-95"
            >
              Ipagpatuloy
            </Link>
          </>
        ) : (
          <>
            <p className="mb-3 text-[var(--color-text-muted)]">Wala pang binabasang aralin — simulan ang isa!</p>
            <Link
              to="/student/learn"
              className="inline-flex items-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-white transition-transform hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] active:scale-95"
            >
              Simulan
            </Link>
          </>
        )}
      </div>

      <WordOfDayCard streak={progress?.streak ?? 0} />

      {/* Recent activity — sage, calm reflection */}
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-sage')}>
        <h2 className="mb-3 text-lg font-semibold">Kamakailang Aktibidad</h2>
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

      <p className="text-center text-lg font-medium text-[var(--color-primary)]">
        Bawat salitang nababasa mo, lumalakas ka!
      </p>

      {/* Quick actions — each its own color, matching the destination it leads to */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            style={cardStyle(action.brandVar)}
            className="flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-95"
          >
            <span className="text-3xl" aria-hidden="true">
              {action.icon}
            </span>
            <p className="font-semibold">{action.label}</p>
          </Link>
        ))}
      </div>

      {/* Reward pills — sage/growth, deliberately no raw numbers here, same as the mobile app */}
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-sage')}>
        <p className="mb-4 font-medium">
          {(progress?.activities_completed ?? 0) === 0 ? 'Simulan ang unang pagsasanay ngayon! 🌱' : '✨ Ang galing! Ipagpatuloy mo!'}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <span
            className="flex items-center justify-center gap-2 rounded-full border border-white bg-white/60 px-4 py-2.5 text-sm font-medium"
          >
            ⭐ {(progress?.xp ?? 0) > 0 ? 'Kumikita ng XP!' : 'Simulan ang XP mo!'}
          </span>
          <span
            className="flex items-center justify-center gap-2 rounded-full border border-white bg-white/60 px-4 py-2.5 text-sm font-medium"
          >
            🔥 {(progress?.streak ?? 0) > 0 ? 'May-init ang streak mo!' : 'Simulan ang streak!'}
          </span>
          <span
            className="flex items-center justify-center gap-2 rounded-full border border-white bg-white/60 px-4 py-2.5 text-sm font-medium"
          >
            🏅 {achievementCount > 0 ? 'May mga parangal ka na!' : 'Kumuha ng unang parangal!'}
          </span>
        </div>
      </div>

      {/* AI-backed recommendation — lavender-dark, only shown once there's enough session data to trust it */}
      {profile && profile.sessionCount > 0 && (
        <div className="rounded-xl border p-6" style={cardStyle('--color-brand-violet')}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              <IconLabel icon="🤖" label="Inirekomendang Pagsasanay sa Pagbasa" />
            </h2>
            <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-semibold text-[var(--color-brand-violet)]">
              {profile.confidenceScore}% Kumpiyansa
            </span>
          </div>
          <p className="mb-1">{profile.recommendedHomePractice}</p>
          {recommendedFocus && <p className="text-sm text-[var(--color-text-muted)]">Pokus: {recommendedFocus}</p>}
          <Link
            to="/student/practice"
            className="mt-3 inline-flex items-center rounded-full bg-[var(--color-brand-violet)] px-5 py-2.5 text-sm text-white transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            Simulan ang Pagsasanay
          </Link>
        </div>
      )}

      {/* Practice mode entry cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/student/practice?mode=say"
          className="flex flex-col gap-1 rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-95"
          style={cardStyle('--color-brand-coral')}
        >
          <span className="text-2xl" aria-hidden="true">
            🎙️
          </span>
          <p className="font-semibold">Sabihin ang Salita</p>
          <p className="text-sm text-[var(--color-text-muted)]">AI na Pagsasanay sa Bigkas</p>
        </Link>
        <Link
          to="/student/practice?mode=listen"
          className="flex flex-col gap-1 rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-95"
          style={cardStyle('--color-brand-lavender')}
        >
          <span className="text-2xl" aria-hidden="true">
            🔊
          </span>
          <p className="font-semibold">Pakinggan at Basahin</p>
          <p className="text-sm text-[var(--color-text-muted)]">Suporta sa Text-to-Speech</p>
        </Link>
      </div>

      {/* Reading tip — teal, distinct "helpful info" color */}
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-teal')}>
        <h2 className="mb-1 font-semibold">
          <IconLabel icon="💡" label="Tip sa Pagbasa" />
        </h2>
        <p className="text-[var(--color-text-muted)]">
          Basahin ang bawat pantig nang dahan-dahan bago sabihin ang buong salita.
        </p>
      </div>
    </div>
  );
}
