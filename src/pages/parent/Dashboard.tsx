import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { IconLabel } from '../../components/a11y/IconLabel';
import type { ReadingProfile } from '../../components/ReadingInsightsPanel';

interface Child {
  id: string;
  name: string;
  grade_level: number;
}

interface ChildProgress {
  child_id: string;
  level: string;
  word_count: number;
}

interface PracticeSession {
  word: string;
  accuracy_percentage: number;
  is_correct: boolean;
  duration_seconds: number | null;
  created_at: string;
}

function cardStyle(brandVar: string, tintPct = 12, borderPct = 35) {
  return {
    backgroundColor: `color-mix(in srgb, var(${brandVar}) ${tintPct}%, white)`,
    borderColor: `color-mix(in srgb, var(${brandVar}) ${borderPct}%, white)`,
  };
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
  const activeChild = children?.find((c) => c.id === activeChildId) ?? null;

  const { data: progress } = useQuery({
    queryKey: ['parent-child-progress', activeChildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_progress')
        .select('child_id, level, word_count')
        .eq('child_id', activeChildId!)
        .maybeSingle();
      if (error) throw error;
      return data as ChildProgress | null;
    },
    enabled: Boolean(activeChildId),
  });

  const { data: sessions } = useQuery({
    queryKey: ['parent-child-sessions', activeChildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pronunciation_practice_sessions')
        .select('word, accuracy_percentage, is_correct, duration_seconds, created_at')
        .eq('student_id', activeChildId!)
        .order('created_at', { ascending: false })
        .limit(50);
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
      const { data, error } = await supabase
        .from('scheduled_activities')
        .select('id, title, scheduled_date')
        .eq('child_id', activeChildId!)
        .eq('status', 'scheduled')
        .order('scheduled_date', { ascending: true })
        .limit(3);
      if (error) throw error;
      return data as { id: string; title: string; scheduled_date: string }[];
    },
    enabled: Boolean(activeChildId),
  });

  const latest = sessions?.[0];
  const weekSessions = (sessions ?? []).filter(
    (s) => Date.now() - new Date(s.created_at).getTime() < 7 * 86400000,
  );
  const weekDays = new Set(weekSessions.map((s) => new Date(s.created_at).toDateString())).size;
  const weekWords = new Set(weekSessions.map((s) => s.word)).size;
  const profile = readingProfile?.profile;
  const parentFirstName = identity?.displayName?.split(' ')[0] ?? 'Magulang';

  const lastActiveHours = latest ? (Date.now() - new Date(latest.created_at).getTime()) / 3600000 : null;
  const isActiveToday = lastActiveHours !== null && lastActiveHours < 24;

  if (children && children.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border p-10 text-center" style={cardStyle('--color-brand-lavender')}>
        <p className="text-4xl">👨‍👩‍👧</p>
        <p className="text-lg font-medium">Wala pang naka-enroll na bata.</p>
        <Link
          to="/parent/children"
          className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-white hover:bg-[var(--color-primary-hover)]"
        >
          + I-enroll ang Iyong Unang Bata
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-hero sm:p-8"
        style={{ backgroundImage: 'linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))' }}
      >
        <h1 className="text-3xl font-bold sm:text-4xl">
          Magandang Araw,
          <br />
          {parentFirstName}!
        </h1>
        <p className="mt-2 text-white/85">Narito kung paano ang progreso ng iyong anak ngayon.</p>
      </div>

      {/* Child summary + switcher */}
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-lavender')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Ang Iyong Anak</p>
            <p className="text-xl font-semibold">{activeChild?.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-white/70 px-3 py-1">Baitang {activeChild?.grade_level}</span>
              <span className="rounded-full bg-white/70 px-3 py-1">{progress?.level ?? '-'}</span>
              <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                <span
                  className={`h-2 w-2 rounded-full ${isActiveToday ? 'bg-[var(--color-success)]' : 'bg-[var(--color-text-muted)]'}`}
                  aria-hidden="true"
                />
                {isActiveToday ? 'Aktibo Ngayon' : 'Walang aktibidad ngayon'}
              </span>
            </div>
          </div>
          {children && children.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedChildId(c.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    c.id === activeChildId
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                      : 'border-white bg-white/70 hover:border-[var(--color-primary)]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Latest reading result */}
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-sun')}>
        <p className="mb-2 text-sm font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
          Pinakabagong Resulta sa Pagbasa
        </p>
        {latest ? (
          <>
            <p className="mb-3 text-2xl font-semibold">{latest.word}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xl font-semibold text-[var(--color-primary)]">{latest.accuracy_percentage}%</p>
                <p className="text-xs text-[var(--color-text-muted)]">Kawastuhan</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[var(--color-primary)]">{sessions?.length ?? 0}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Beses na Sinubukan</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[var(--color-primary)]">{latest.duration_seconds ?? '-'}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Tagal (s)</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[var(--color-primary)]">{weekDays}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Sunod-sunod na Araw</p>
              </div>
            </div>
            {profile?.insights[0] && <p className="mt-3 text-sm">{profile.insights[0]}</p>}
            {profile?.recommendedHomePractice && (
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Home practice: {profile.recommendedHomePractice}
              </p>
            )}
          </>
        ) : (
          <p className="text-[var(--color-text-muted)]">Wala pang pagbasa.</p>
        )}
      </div>

      {/* Quick overview tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border p-4" style={cardStyle('--color-brand-lavender')}>
          <p className="text-xl font-semibold text-[var(--color-primary)]">{profile?.completedContentCount ?? 0}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Mga Natapos na Aralin</p>
        </div>
        <div className="rounded-xl border p-4" style={cardStyle('--color-brand-coral')}>
          <p className="text-xl font-semibold text-[var(--color-primary)]">{weekSessions.length}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Pagsasanay Ngayong Linggo</p>
        </div>
        <div className="rounded-xl border p-4" style={cardStyle('--color-brand-sage')}>
          <p className="text-xl font-semibold text-[var(--color-primary)]">{progress?.word_count ?? 0}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Mga Salitang Nasanay</p>
        </div>
        <div className="rounded-xl border p-4" style={cardStyle('--color-brand-sun')}>
          <p className="text-xl font-semibold text-[var(--color-primary)]">{profile?.averageAccuracy ?? '-'}%</p>
          <p className="text-sm text-[var(--color-text-muted)]">Kabuuang Karaniwan</p>
        </div>
      </div>

      {/* Weekly activity */}
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-teal')}>
        <h2 className="mb-1 text-lg font-semibold">Aktibidad Ngayong Linggo</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {weekDays} araw na aktibo ngayong linggo ({weekWords} magkaibang salita ang nasanay)
        </p>
      </div>

      {/* Weekly insight — reuse the same AI-backed reading profile panel used in the full report */}
      {profile && profile.sessionCount > 0 && (
        <div className="rounded-xl border p-6" style={cardStyle('--color-brand-violet')}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Pananaw Ngayong Linggo</h2>
            <Link to="/parent/progress" className="text-sm font-medium text-[var(--color-primary)] underline">
              Tingnan ang Buong Progreso →
            </Link>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Kumpiyansa: {profile.confidenceScore}% · {profile.weeklyPracticeDays} araw ngayong linggo
          </p>
        </div>
      )}

      {/* Upcoming */}
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-sage')}>
        <h2 className="mb-3 text-lg font-semibold">Mga Paparating na Iskedyul</h2>
        {upcoming && upcoming.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {upcoming.map((u) => (
              <li key={u.id} className="flex items-center justify-between rounded-lg border border-white bg-white/60 px-4 py-2.5 text-sm">
                <span className="font-medium">{u.title}</span>
                <span className="text-[var(--color-text-muted)]">
                  {new Date(u.scheduled_date).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--color-text-muted)]">Wala pang naka-iskedyul.</p>
        )}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-lavender')}>
        <h2 className="mb-3 text-lg font-semibold">Kamakailang Aktibidad</h2>
        {sessions && sessions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {sessions.slice(0, 5).map((s, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border border-white bg-white/60 px-4 py-2.5 text-sm">
                <IconLabel icon="🎙️" label={`Pagsasanay sa Bigkas — ${s.word}`} />
                <span className="text-[var(--color-text-muted)]">{s.accuracy_percentage}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--color-text-muted)]">Wala pang aktibidad.</p>
        )}
      </div>

      {/* Support banner */}
      <div className="rounded-xl border p-6 text-center" style={cardStyle('--color-brand-coral')}>
        <h2 className="mb-1 text-lg font-semibold">Mahalaga ang Iyong Suporta</h2>
        <p className="mb-3 text-[var(--color-text-muted)]">Malaki ang naitutulong ng bawat munting paghikayat.</p>
        <Link
          to="/parent/progress"
          className="inline-flex items-center rounded-full bg-[var(--color-brand-coral)] px-6 py-3 text-white transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          Tingnan ang Progreso ng Anak →
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/parent/children"
          className="flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-95"
          style={cardStyle('--color-brand-lavender')}
        >
          <span className="text-3xl" aria-hidden="true">👧</span>
          <p className="font-semibold">I-enroll ang Anak</p>
        </Link>
        <Link
          to="/parent/progress"
          className="flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-95"
          style={cardStyle('--color-brand-sun')}
        >
          <span className="text-3xl" aria-hidden="true">📊</span>
          <p className="font-semibold">Tingnan ang Ulat</p>
        </Link>
        <Link
          to="/parent/settings"
          className="flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-95"
          style={cardStyle('--color-brand-coral')}
        >
          <span className="text-3xl" aria-hidden="true">🙂</span>
          <p className="font-semibold">Pamahalaan ang Profile</p>
        </Link>
      </div>
    </div>
  );
}
