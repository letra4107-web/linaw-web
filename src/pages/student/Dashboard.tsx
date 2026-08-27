import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { IconLabel } from '../../components/a11y/IconLabel';
import { WordOfDayCard } from '../../components/WordOfDayCard';
import { cardStyle } from '../../lib/cardStyle';
import type { ReadingProfile } from '../../components/ReadingInsightsPanel';
import owlbook from '../../assets/owlbook.png';
import owlup from '../../assets/owlup.png';
import spark from '../../assets/spark.png';
import bookIcon from '../../assets/book.png';
import micIcon from '../../assets/mic.png';
import trophyIcon from '../../assets/trophy.png';
import calendarIcon from '../../assets/calendar.png';
import speechIcon from '../../assets/speech.png';
import bulbIcon from '../../assets/bulb.png';
import confetti from '../../assets/confetti.png';
import dot from '../../assets/dot.png';

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
  { to: '/student/learn', icon: bookIcon, label: 'Aralin', brandVar: '--color-brand-lavender' },
  { to: '/student/practice', icon: micIcon, label: 'Pagsasanay', brandVar: '--color-brand-coral' },
  { to: '/student/achievements', icon: trophyIcon, label: 'Parangal', brandVar: '--color-brand-sun' },
];

const PRACTICE_MODES = [
  {
    to: '/student/practice?mode=say',
    icon: micIcon,
    title: 'Sabihin ang Salita',
    subtitle: 'AI na Pagsasanay sa Bigkas',
    brandVar: '--color-brand-coral',
  },
  {
    to: '/student/practice?mode=listen',
    icon: speechIcon,
    title: 'Pakinggan at Basahin',
    subtitle: 'Suporta sa Text-to-Speech',
    brandVar: '--color-brand-lavender',
  },
];

function IconBadge({ img, brandVar }: { img: string; brandVar: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm"
      style={{ backgroundColor: `color-mix(in srgb, var(${brandVar}) 22%, white)` }}
    >
      <img src={img} alt="" className="h-7 w-7 object-contain" />
    </span>
  );
}

function getDeadlinePresentation(dueDate: string) {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

  if (daysLeft < 0) {
    return { label: 'Lampas na', detail: `${Math.abs(daysLeft)} araw na ang lumipas`, tone: '--color-danger' };
  }
  if (daysLeft === 0) return { label: 'Ngayong araw', detail: 'Tapusin ngayon', tone: '--color-danger' };
  if (daysLeft === 1) return { label: 'Bukas', detail: '1 araw na lang', tone: '--color-brand-orange' };
  if (daysLeft <= 3) return { label: 'Malapit na', detail: `${daysLeft} araw na lang`, tone: '--color-brand-orange' };
  return { label: 'Paparating', detail: `${daysLeft} araw pa`, tone: '--color-brand-sage' };
}

function getAssignmentStatusLabel(status: string) {
  if (status === 'in_progress') return 'Ginagawa na';
  if (status === 'assigned' || status === 'pending') return 'Hindi pa nasisimulan';
  return 'Hindi pa tapos';
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
    ? progress.achievements.length
    : progress?.achievements
      ? Object.keys(progress.achievements).length
      : 0;
  const profile = readingProfile?.profile;
  const recommendedFocus = profile?.weakSounds[0]?.unit?.toUpperCase() ?? profile?.weakWords[0]?.word ?? null;
  const modules = path?.modules ?? [];
  const currentModuleIndex = modules.findIndex((module) => module.state === 'unlocked');
  const currentModule = currentModuleIndex >= 0 ? modules[currentModuleIndex] : undefined;
  const allCompleted = modules.length > 0 && modules.every((module) => module.state === 'completed');
  const modulePct = currentModule
    ? Math.round((currentModule.completed_content_item_count / Math.max(1, currentModule.content_item_count)) * 100)
    : 0;
  const firstName = child?.name?.split(' ')[0] ?? identity?.displayName ?? 'kaibigan';
  const hasActivity = (progress?.activities_completed ?? 0) > 0;

  return (
    <div className="flex flex-col gap-8 pb-4 sm:gap-10">
      {/* 1. Header */}
      <section aria-labelledby="dashboard-title" className="flex flex-col gap-5">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-white/20 px-6 py-7 text-white shadow-hero sm:px-10 sm:py-9"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))' }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: `url(${dot})`, backgroundSize: '220px', backgroundRepeat: 'repeat' }} />
          <div aria-hidden="true" className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full bg-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-white/10" />
          <img src={spark} alt="" aria-hidden="true" className="pointer-events-none absolute top-7 right-8 h-8 w-8 opacity-80 sm:right-36" />

          <div className="relative z-10 grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <p className="text-sm font-bold tracking-[0.12em] text-white/80 uppercase">Kumusta ka ngayon?</p>
              <h1 id="dashboard-title" className="mt-1 text-3xl leading-tight font-bold sm:text-5xl">
                Masayang pag-aaral, {firstName}!
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
                Handa ka na bang magbasa, makinig, at matuto ng bagong salita?
              </p>
            </div>
            <span aria-hidden="true" className="mx-auto flex h-28 w-28 shrink-0 rotate-3 items-center justify-center rounded-[1.75rem] border border-white/20 bg-white/15 shadow-lg backdrop-blur transition-transform hover:rotate-0 sm:h-32 sm:w-32">
              <img src={owlbook} alt="" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
            </span>
            <div className="flex flex-wrap gap-2.5 sm:col-span-2">
              <span className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 p-1"><img src={spark} alt="" className="h-full w-full object-contain" /></span>
                {progress?.xp ?? 0} XP
              </span>
              <span className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20" aria-hidden="true">🔥</span>
                {progress?.streak ?? 0} araw na streak
              </span>
              <span className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 p-1"><img src={trophyIcon} alt="" className="h-full w-full object-contain" /></span>
                {achievementCount} parangal
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
          <div className="overflow-hidden rounded-3xl border shadow-card" style={cardStyle('--color-brand-lavender', 10, 35)}>
            <div className="flex h-full flex-col gap-4 p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <IconBadge img={bookIcon} brandVar="--color-brand-lavender" />
                <h2 className="text-xl font-bold">Ipagpatuloy ang Pag-aaral</h2>
              </div>
              {allCompleted ? (
                <p className="flex items-center gap-2 text-[var(--color-text-muted)]">
                  Tapos na ang mga aralin sa modyul na ito!
                  <img src={confetti} alt="" aria-hidden="true" className="h-6 w-6 object-contain" />
                </p>
              ) : currentModule ? (
                <>
                  <p className="text-sm text-[var(--color-text-muted)]">Aralin {currentModuleIndex + 1} ng {modules.length} — {currentModule.title}</p>
                  <div className="flex items-center gap-3" role="progressbar" aria-label="Progreso sa kasalukuyang aralin" aria-valuenow={modulePct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/70 shadow-inner">
                      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${modulePct}%`, backgroundImage: 'linear-gradient(90deg, var(--color-hero-from), var(--color-hero-via))' }} />
                    </div>
                    <span className="text-sm font-bold text-[var(--color-primary)]">{modulePct}%</span>
                  </div>
                  <Link to="/student/learn" className="mt-auto inline-flex min-h-12 w-fit items-center rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-raised active:scale-95">Ipagpatuloy</Link>
                </>
              ) : (
                <>
                  <p className="text-[var(--color-text-muted)]">Wala pang binabasang aralin — simulan ang isa!</p>
                  <Link to="/student/learn" className="mt-auto inline-flex min-h-12 w-fit items-center rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-raised active:scale-95">Simulan</Link>
                </>
              )}
            </div>
          </div>

          <nav aria-label="Mabilis na puntahan" className="grid grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.label} to={action.to} style={cardStyle(action.brandVar, 10, 35)} className="group flex min-h-32 flex-col items-center justify-center gap-3 rounded-3xl border p-3 text-center shadow-card transition-all hover:-translate-y-1 hover:shadow-raised active:scale-95">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110 group-hover:-rotate-3" style={{ backgroundColor: `color-mix(in srgb, var(${action.brandVar}) 25%, white)` }} aria-hidden="true">
                  <img src={action.icon} alt="" className="h-7 w-7 object-contain" />
                </span>
                <span className="text-sm font-bold sm:text-base">{action.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* 2. Deadlines */}
      <section aria-labelledby="deadlines-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-sm font-bold tracking-[0.12em] text-[var(--color-warning-text)] uppercase">Huwag kalimutan</p>
            <h2 id="deadlines-title" className="mt-1 flex items-center gap-3 text-2xl font-bold sm:text-3xl">
              <IconBadge img={calendarIcon} brandVar="--color-brand-sun" />
              Mga Deadline
            </h2>
            <p className="mt-1 text-[var(--color-text-muted)]">Narito ang mga gawaing dapat mong tapusin.</p>
          </div>
          <Link to="/student/learn" className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-bold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-soft)]">
            Tingnan lahat <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>

        {deadlines && deadlines.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deadlines.map((deadline) => {
              const presentation = getDeadlinePresentation(deadline.due_date!);
              return (
                <li key={deadline.id}>
                  <Link
                    to="/student/learn"
                    className="group flex h-full min-h-44 flex-col rounded-3xl border bg-[var(--color-surface)] p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised active:scale-[0.98]"
                    style={{ borderColor: `color-mix(in srgb, var(${presentation.tone}) 35%, var(--color-border))` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ color: `var(${presentation.tone})`, backgroundColor: `color-mix(in srgb, var(${presentation.tone}) 13%, white)` }}>
                        {presentation.label}
                      </span>
                      <span className="text-xs font-semibold text-[var(--color-text-muted)]">{getAssignmentStatusLabel(deadline.status)}</span>
                    </div>
                    <h3 className="mt-4 line-clamp-2 text-lg leading-snug font-bold">{deadline.pdf_materials?.title ?? 'Aralin'}</h3>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-text-muted)]">Takdang araw</p>
                        <time dateTime={deadline.due_date!} className="font-bold">
                          {new Date(deadline.due_date!).toLocaleDateString('fil-PH', { month: 'long', day: 'numeric' })}
                        </time>
                      </div>
                      <span className="text-right text-sm font-bold" style={{ color: `var(${presentation.tone})` }}>{presentation.detail}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex min-h-36 items-center gap-4 rounded-3xl border p-6 shadow-card" style={cardStyle('--color-brand-sun', 10, 35)}>
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/70"><img src={owlup} alt="" aria-hidden="true" className="h-12 w-12 object-contain" /></span>
            <div>
              <h3 className="text-lg font-bold">Ayos! Wala kang nalalapit na deadline.</h3>
              <p className="mt-1 text-[var(--color-text-muted)]">Malinis ang schedule mo ngayon. Magpatuloy sa pagsasanay!</p>
            </div>
          </div>
        )}
      </section>

      {/* 3. Salita Ngayon */}
      <section aria-label="Salita Ngayon">
        <WordOfDayCard streak={progress?.streak ?? 0} />
      </section>

      {/* Existing supporting tools remain available after the primary flow. */}
      <section aria-label="Iba pang gawain" className="flex flex-col gap-5">
        <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border p-6 shadow-card sm:p-7" style={cardStyle('--color-brand-coral', 12, 35)}>
          <img src={spark} alt="" aria-hidden="true" className="pointer-events-none absolute top-3 right-6 h-6 w-6 opacity-50" />
          <div className="relative z-10 flex items-center gap-3">
            <IconBadge img={micIcon} brandVar="--color-brand-coral" />
            <p className="font-bold">Bawat pagsasanay ay isang hakbang pasulong!</p>
          </div>
          <Link to="/student/practice" className="relative z-10 inline-flex min-h-12 shrink-0 items-center rounded-full bg-[var(--color-brand-coral)] px-6 py-3 font-bold text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised active:scale-95">
            <IconLabel img={micIcon} label="Ipagpatuloy ang Pagsasanay" className="inline-flex items-center gap-2 [&_img]:rounded-full [&_img]:bg-white/25 [&_img]:p-0.5" />
          </Link>
        </div>

        {!hasActivity && (
          <p className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-success-soft)] px-5 py-3 text-center font-bold text-[var(--color-success)]">
            <img src={owlup} alt="" aria-hidden="true" className="h-6 w-6 object-contain" />
            Simulan ang unang pagsasanay ngayon!
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PRACTICE_MODES.map((item) => (
            <Link key={item.to} to={item.to} className="group flex min-h-28 items-center gap-4 rounded-3xl border p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised active:scale-95" style={cardStyle(item.brandVar, 10, 35)}>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/70 shadow-sm transition-transform group-hover:scale-110" aria-hidden="true"><img src={item.icon} alt="" className="h-8 w-8 object-contain" /></span>
              <div>
                <h3 className="font-bold">{item.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">{item.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>

        {profile && profile.sessionCount > 0 && (
          <div className="rounded-3xl border p-6 shadow-card" style={cardStyle('--color-brand-violet', 10, 35)}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <IconBadge img={owlbook} brandVar="--color-brand-violet" />
                <h2 className="text-xl font-bold">Inirekomendang Pagsasanay</h2>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-[var(--color-brand-violet)]">{profile.confidenceScore}% Kumpiyansa</span>
            </div>
            <p>{profile.recommendedHomePractice}</p>
            {recommendedFocus && <p className="mt-1 text-sm text-[var(--color-text-muted)]">Pokus: {recommendedFocus}</p>}
            <Link to="/student/practice" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[var(--color-brand-violet)] px-5 py-2.5 text-sm font-bold text-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised active:scale-95">Simulan ang Pagsasanay</Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border p-6 shadow-card" style={cardStyle('--color-brand-sage', 10, 35)}>
            <div className="mb-3 flex items-center gap-3">
              <IconBadge img={speechIcon} brandVar="--color-brand-sage" />
              <h2 className="text-lg font-bold">Kamakailang Aktibidad</h2>
            </div>
            {recentSessions && recentSessions.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {recentSessions.map((session, index) => (
                  <li key={index} className="flex items-center justify-between rounded-xl border border-white bg-white/60 px-4 py-2.5 text-sm">
                    <IconLabel img={micIcon} label="Pagsasanay sa Bigkas" />
                    <time dateTime={session.created_at} className="text-[var(--color-text-muted)]">{new Date(session.created_at).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' })}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[var(--color-text-muted)]">Wala ka pang aktibidad. Magsimula ng pagsasanay ngayon!</p>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-3xl border p-6 shadow-card" style={cardStyle('--color-brand-teal', 10, 35)}>
            <IconBadge img={bulbIcon} brandVar="--color-brand-teal" />
            <div>
              <h2 className="mb-1 text-lg font-bold">Tip sa Pagbasa</h2>
              <p className="text-[var(--color-text-muted)]">Basahin ang bawat pantig nang dahan-dahan bago sabihin ang buong salita.</p>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-2 pt-2">
          <img src={confetti} alt="" aria-hidden="true" className="pointer-events-none h-10 w-10 object-contain opacity-80" />
          <p className="text-center text-lg font-bold text-[var(--color-primary)]">Bawat salitang nababasa mo, lumalakas ka!</p>
        </div>
      </section>
    </div>
  );
}
