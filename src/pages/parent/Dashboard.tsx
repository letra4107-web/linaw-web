import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import type { ReadingProfile } from '../../components/ReadingInsightsPanel';
import { cardStyle } from '../../lib/cardStyle';
import owlbook from '../../assets/owlbook.png';
import { AppIcon } from '../../components/a11y/AppIcon';

interface Child { id: string; name: string; grade_level: number; }
interface ChildProgress { child_id: string; level: string; word_count: number; streak: number; }
interface PracticeSession { word: string; accuracy_percentage: number; is_correct: boolean; duration_seconds: number | null; created_at: string; }
interface PdfAssignment { id: string; status: string; due_date: string | null; pdf_materials: { title: string } | null; }

function formatRelativeDate(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return 'Kamakailan lang';
  if (hours < 24) return `${hours} oras ang nakalipas`;
  return new Date(iso).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { user, identity } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: children } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('children').select('id, name, grade_level').order('name');
      if (error) throw error;
      return data as Child[];
    },
    enabled: Boolean(user),
  });
  const activeChildId = selectedChildId ?? children?.[0]?.id ?? null;
  const activeChild = children?.find((child) => child.id === activeChildId) ?? null;

  const { data: progress } = useQuery({
    queryKey: ['parent-child-progress', activeChildId],
    queryFn: async () => {
      const { data, error } = await supabase.from('child_progress').select('child_id, level, word_count, streak').eq('child_id', activeChildId!).maybeSingle();
      if (error) throw error;
      return data as ChildProgress | null;
    },
    enabled: Boolean(activeChildId),
  });
  const { data: sessions } = useQuery({
    queryKey: ['parent-child-sessions', activeChildId],
    queryFn: async () => {
      const { data, error } = await supabase.from('pronunciation_practice_sessions').select('word, accuracy_percentage, is_correct, duration_seconds, created_at').eq('student_id', activeChildId!).order('created_at', { ascending: false }).limit(50);
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
  const { data: upcoming } = useQuery({
    queryKey: ['parent-upcoming', activeChildId],
    queryFn: async () => {
      const { data, error } = await supabase.from('scheduled_activities').select('id, title, scheduled_date').eq('child_id', activeChildId!).eq('status', 'scheduled').order('scheduled_date', { ascending: true }).limit(3);
      if (error) throw error;
      return data as { id: string; title: string; scheduled_date: string }[];
    },
    enabled: Boolean(activeChildId),
  });
  const { data: assignments } = useQuery({
    queryKey: ['parent-child-pdf-assignments', activeChildId],
    queryFn: async () => {
      const { data, error } = await supabase.from('pdf_assignments').select('id, status, due_date, pdf_materials(title)').eq('student_id', activeChildId!).neq('status', 'completed').order('due_date', { ascending: true, nullsFirst: false }).limit(3);
      if (error) throw error;
      return data as unknown as PdfAssignment[];
    },
    enabled: Boolean(activeChildId),
  });

  const latest = sessions?.[0];
  const weekSessions = (sessions ?? []).filter((session) => Date.now() - new Date(session.created_at).getTime() < 7 * 86_400_000);
  const weekDays = new Set(weekSessions.map((session) => new Date(session.created_at).toDateString())).size;
  const weekWords = new Set(weekSessions.map((session) => session.word)).size;
  const profile = readingProfile?.profile;
  const parentFirstName = identity?.displayName?.split(' ')[0] ?? 'Magulang';
  const isActiveToday = latest ? Date.now() - new Date(latest.created_at).getTime() < 86_400_000 : false;

  if (children && children.length === 0) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-3xl border p-8 text-center shadow-card" style={cardStyle('--color-brand-lavender')}>
        <span className="text-5xl" aria-hidden="true">👨‍👩‍👧</span><h1 className="text-2xl font-bold">Magsimula sa pag-enroll ng anak</h1>
        <p className="max-w-md text-[var(--color-text-muted)]">Idagdag ang account ng iyong anak upang makita ang kaniyang progreso at mga gawain.</p>
        <Link to="/parent/children" className="inline-flex min-h-12 items-center rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white shadow-card">I-enroll ang Unang Anak</Link>
      </div>
    );
  }

  return (
    <div className="parent-home-dashboard flex min-w-0 flex-col gap-6 lg:gap-7">
      <header className="parent-dashboard-hero relative overflow-hidden rounded-[2rem] border border-white/25 bg-[var(--color-primary)] px-6 py-7 text-white shadow-hero ring-1 ring-black/5 lg:px-9 lg:py-8">
        <div aria-hidden="true" className="absolute -top-20 -right-12 h-48 w-48 rounded-full bg-white/10" />
        <img src={owlbook} alt="" aria-hidden="true" className="absolute right-5 bottom-0 h-28 w-28 object-contain drop-shadow-lg lg:right-9 lg:h-36 lg:w-36" />
        <div className="relative flex flex-wrap items-center justify-between gap-4 pr-20 lg:pr-28">
          <div><h1 className="text-3xl leading-tight font-bold lg:text-4xl">Magandang araw, {parentFirstName}!</h1><p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-white/80 lg:text-base">Narito kung paano ang progreso ng iyong anak ngayon.</p></div>
          {children && children.length > 1 && (
            <label className="hidden items-center gap-2 rounded-full bg-[var(--color-primary-soft)] px-3 py-2 text-sm font-bold text-[var(--color-primary)]">
              <span>Palitan ang anak</span>
              <select value={activeChildId ?? ''} onChange={(event) => setSelectedChildId(event.target.value)} className="min-h-10 max-w-40 rounded-xl border-0 bg-transparent px-1 text-[var(--color-primary)]">
                {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
              </select>
            </label>
          )}
        </div>
      </header>

      <section aria-label="Ang iyong anak" className="flex flex-col gap-4 rounded-[2rem] border p-5 shadow-card lg:p-6" style={cardStyle('--color-brand-lavender', 5, 22)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="mr-auto text-xs font-bold tracking-[0.12em] text-[var(--color-text-muted)] uppercase">Ang iyong anak</p>
          {children && children.length > 1 && <label className="flex items-center gap-2 rounded-full bg-[var(--color-primary-soft)] px-3 py-2 text-sm font-bold text-[var(--color-primary)]"><span>Palitan ang anak</span><select aria-label="Palitan ang anak" value={activeChildId ?? ''} onChange={(event) => setSelectedChildId(event.target.value)} className="min-h-9 max-w-40 border-0 bg-transparent px-1 text-[var(--color-primary)]">{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-2xl font-bold text-[var(--color-primary)]">{activeChild?.name.charAt(0).toUpperCase()}</span>
            <div><h2 className="text-xl font-bold">{activeChild?.name}</h2><p className="text-sm text-[var(--color-text-muted)]">Baitang {activeChild?.grade_level} · {progress?.level ?? 'Walang antas'}</p></div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${isActiveToday ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-white/70 text-[var(--color-text-muted)]'}`}>{isActiveToday ? '● Aktibo ngayon' : '○ Wala pang aktibidad ngayon'}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: '◎', value: profile?.averageAccuracy !== null && profile?.averageAccuracy !== undefined ? `${profile.averageAccuracy}%` : '—', label: 'Average accuracy', color: '--color-brand-teal' },
            { icon: '🔥', value: progress?.streak ?? 0, label: 'Araw na streak', color: '--color-brand-coral' },
            { icon: '✓', value: profile?.completedContentCount ?? 0, label: 'Natapos na aralin', color: '--color-brand-sage' },
            { icon: 'Aa', value: progress?.word_count ?? 0, label: 'Salitang nasanay', color: '--color-brand-sun' },
          ].map((item) => (
            <div key={item.label} className="min-w-0 rounded-2xl border bg-white/65 p-4" style={{ borderColor: `color-mix(in srgb, var(${item.color}) 24%, white)` }}><span className="text-sm font-bold" style={{ color: `var(${item.color})` }}>{item.icon}</span><p className="mt-1 text-2xl font-bold">{item.value}</p><p className="text-xs font-semibold text-[var(--color-text-muted)]">{item.label}</p></div>
          ))}
        </div>
      </section>

      <section aria-labelledby="assignments-title" className="order-4 rounded-[2rem] border p-5 shadow-card lg:p-6" style={cardStyle('--color-brand-sage', 7, 26)}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-brand-sage)] uppercase">Mga gawain</p><h2 id="assignments-title" className="text-xl font-bold">Mga PDF na Hindi Pa Tapos</h2><p className="text-sm text-[var(--color-text-muted)]">Mga materyal na naka-assign kay {activeChild?.name ?? 'iyong anak'}.</p></div><Link to="/parent/progress" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-[var(--color-primary)] hover:bg-white/65">Tingnan ang progreso →</Link></div>
        {assignments?.length ? <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{assignments.map((assignment) => <li key={assignment.id} className="rounded-2xl border border-white/70 bg-white/65 p-4"><p className="font-bold">{assignment.pdf_materials?.title ?? 'Materyal sa PDF'}</p><p className="mt-1 text-sm text-[var(--color-text-muted)]">{assignment.status === 'in_progress' ? 'Ginagawa na' : 'Naka-assign'}{assignment.due_date ? ` · Takdang araw: ${new Date(assignment.due_date).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' })}` : ''}</p></li>)}</ul> : <p className="mt-4 rounded-2xl bg-white/55 p-4 text-[var(--color-text-muted)]">Wala pang PDF na kailangang tapusin ngayon.</p>}
      </section>

      <div className="order-3 grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <section aria-labelledby="latest-title" className="rounded-[2rem] border p-5 shadow-card lg:p-6" style={cardStyle('--color-brand-sun', 9, 30)}>
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-warning-text)] uppercase">Pinakabagong resulta sa pagbasa</p><h2 id="latest-title" className="text-2xl font-bold">{latest?.word ?? 'Wala pang binasa'}</h2></div>{latest && <span className="text-xs text-[var(--color-text-muted)]">{formatRelativeDate(latest.created_at)}</span>}</div>
          {latest ? (
            <div className="mt-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-[var(--color-text-muted)]">Salitang binasa</p><p className="text-3xl font-bold">{latest.word}</p></div><div className="text-right"><p className={`text-4xl font-bold ${latest.accuracy_percentage >= 80 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning-text)]'}`}>{latest.accuracy_percentage}%</p><p className="text-xs font-bold text-[var(--color-text-muted)]">Kawastuhan</p></div></div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/70 pt-4 text-center"><div><p className="font-bold">{latest.duration_seconds ?? '—'}s</p><p className="text-xs text-[var(--color-text-muted)]">Tagal</p></div><div><p className="font-bold">{weekSessions.length}</p><p className="text-xs text-[var(--color-text-muted)]">Practice / linggo</p></div><div><p className="font-bold">{weekDays}</p><p className="text-xs text-[var(--color-text-muted)]">Aktibong araw</p></div></div>
            </div>
          ) : <p className="mt-5 rounded-2xl bg-white/55 p-5 text-[var(--color-text-muted)]">Wala pang naitalang pagsasanay sa pagbasa.</p>}
        </section>

        <section aria-labelledby="insight-title" className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[var(--color-primary)] p-6 text-white shadow-hero lg:p-7">
          <img src={owlbook} alt="" aria-hidden="true" className="absolute -right-5 -bottom-5 h-36 w-36 object-contain opacity-25" />
          <p className="text-xs font-bold tracking-[0.1em] text-white/70 uppercase">Progreso sa pagbasa</p><h2 id="insight-title" className="relative mt-2 max-w-[15rem] text-2xl leading-tight font-bold">{activeChild?.name}&apos;s Reading Progress</h2>
          {profile?.sessionCount ? <><p className="relative mt-4 leading-relaxed text-white/90">{profile.insights[0] ?? profile.recommendedHomePractice}</p><div className="relative mt-4 rounded-2xl bg-white/15 p-4"><p className="text-xs font-bold text-white/70">Iminungkahing suporta sa bahay</p><p className="mt-1 text-sm font-semibold text-white">{profile.recommendedHomePractice}</p></div><Link to="/parent/progress" className="relative mt-4 inline-flex min-h-11 items-center rounded-full bg-white/15 px-4 text-sm font-bold text-white hover:bg-white/25">Buong ulat →</Link></> : <p className="mt-4 text-white/80">Kailangan pa ng ilang practice session upang makagawa ng insight.</p>}
        </section>
      </div>

      <div className="order-5 grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        <section aria-labelledby="upcoming-title" className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-sage', 8, 28)}>
          <div className="flex items-center justify-between gap-3"><h2 id="upcoming-title" className="text-xl font-bold">Paparating na Iskedyul</h2><Link to="/parent/schedule" className="text-sm font-bold text-[var(--color-primary)]">Kalendaryo →</Link></div>
          {upcoming?.length ? <ul className="mt-4 flex flex-col gap-2">{upcoming.map((item) => <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/65 p-3"><time dateTime={item.scheduled_date} className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--color-brand-sage)] text-xs font-bold text-white"><span>{new Date(item.scheduled_date).toLocaleDateString('fil-PH', { month: 'short' })}</span><span className="text-base">{new Date(item.scheduled_date).getDate()}</span></time><span className="min-w-0 flex-1 truncate font-bold">{item.title}</span><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-[var(--color-success)]">Naka-iskedyul</span></li>)}</ul> : <p className="mt-4 rounded-2xl bg-white/55 p-4 text-[var(--color-text-muted)]">Wala pang paparating na iskedyul.</p>}
        </section>

        <section aria-labelledby="recent-title" className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-teal', 8, 28)}>
          <div className="flex items-center justify-between gap-3"><h2 id="recent-title" className="text-xl font-bold">Kamakailang Aktibidad</h2><span className="text-xs font-bold text-[var(--color-text-muted)]">{weekWords} salita ngayong linggo</span></div>
          {sessions?.length ? <ul className="mt-4 flex flex-col gap-2">{sessions.slice(0, 5).map((session, index) => <li key={`${session.created_at}-${index}`} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/65 p-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${session.is_correct ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-warning-soft)] text-[var(--color-warning-text)]'}`}>{session.is_correct ? '✓' : '↻'}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{session.word}</p><p className="text-xs text-[var(--color-text-muted)]">{formatRelativeDate(session.created_at)}</p></div><span className="font-bold">{session.accuracy_percentage}%</span></li>)}</ul> : <p className="mt-4 text-[var(--color-text-muted)]">Wala pang aktibidad.</p>}
        </section>
      </div>

      <nav aria-label="Mabilis na aksyon" className="order-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[{ to: '/parent/children', icon: '＋', label: 'Pamahalaan ang mga anak', color: '--color-brand-lavender' }, { to: '/parent/progress', icon: '▥', label: 'Tingnan ang buong ulat', color: '--color-brand-sun' }, { to: '/parent/settings', icon: '☺', label: 'Ayusin ang profile', color: '--color-brand-coral' }].map((action) => <Link key={action.to} to={action.to} className="flex min-h-20 items-center gap-3 rounded-3xl border p-4 font-bold shadow-card transition-all hover:-translate-y-1 hover:shadow-raised" style={cardStyle(action.color)}><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70" aria-hidden="true"><AppIcon name={action.icon} /></span>{action.label}</Link>)}
      </nav>
    </div>
  );
}
