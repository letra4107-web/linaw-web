import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { ReadingInsightsPanel, type ReadingProfile } from '../../components/ReadingInsightsPanel';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';
import { BADGE_CATALOG } from '../../lib/badges';

interface Child { id: string; name: string; }
interface PracticeSession { created_at: string; accuracy_percentage: number; is_correct: boolean; }
interface ChildAchievements { achievements: { id: string; unlockedAt?: string }[] | Record<string, unknown> | null; }

export default function ProgressReport() {
  const { user } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const { data: children } = useQuery({ queryKey: ['parent-children', user?.id], queryFn: async () => { const { data, error } = await supabase.from('children').select('id, name').order('name'); if (error) throw error; return data as Child[]; }, enabled: Boolean(user) });
  const activeChildId = selectedChildId ?? children?.[0]?.id ?? null;
  const activeChild = children?.find((child) => child.id === activeChildId);
  const { data: sessions, isLoading } = useQuery({ queryKey: ['child-practice-sessions', activeChildId], queryFn: async () => { const { data, error } = await supabase.from('pronunciation_practice_sessions').select('created_at, accuracy_percentage, is_correct').eq('student_id', activeChildId!).order('created_at', { ascending: true }).limit(100); if (error) throw error; return data as PracticeSession[]; }, enabled: Boolean(activeChildId) });
  const { data: readingProfile } = useQuery({ queryKey: ['parent-reading-profile', activeChildId], queryFn: () => api<{ profile: ReadingProfile }>(`/parent/children/${activeChildId}/reading-profile`, { auth: true }), enabled: Boolean(activeChildId) });
  const { data: childProgress } = useQuery({ queryKey: ['parent-child-achievements', activeChildId], queryFn: async () => { const { data, error } = await supabase.from('child_progress').select('achievements').eq('child_id', activeChildId!).maybeSingle(); if (error) throw error; return data as ChildAchievements | null; }, enabled: Boolean(activeChildId) });

  const unlockedBadgeIds = new Map<string, string | undefined>(Array.isArray(childProgress?.achievements) ? childProgress.achievements.map((achievement) => [achievement.id, achievement.unlockedAt]) : childProgress?.achievements ? Object.keys(childProgress.achievements).map((id) => [id, undefined]) : []);
  const earnedBadges = BADGE_CATALOG.filter((badge) => unlockedBadgeIds.has(badge.id));
  const chartData = (sessions ?? []).map((session) => ({ date: new Date(session.created_at).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' }), accuracy: session.accuracy_percentage }));
  const averageAccuracy = chartData.length ? Math.round(chartData.reduce((sum, item) => sum + item.accuracy, 0) / chartData.length) : null;
  const correctCount = (sessions ?? []).filter((session) => session.is_correct).length;
  const successRate = sessions?.length ? Math.round((correctCount / sessions.length) * 100) : 0;
  const profile = readingProfile?.profile;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-teal', 8, 30)}>
        <div><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-brand-teal)] uppercase">Reading analytics</p><h1 className="text-2xl font-bold sm:text-3xl">Ulat ng Progreso</h1><p className="text-sm text-[var(--color-text-muted)]">Malinaw na buod ng pag-unlad sa pagbasa.</p></div>
        {children && children.length > 0 && <label className="text-sm font-bold">Anak<select value={activeChildId ?? ''} onChange={(event) => setSelectedChildId(event.target.value)} className="ml-2 min-h-11 rounded-xl border border-white/70 bg-white/80 px-3 font-normal">{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
      </header>

      {isLoading && <p className="rounded-2xl bg-white/60 p-5 text-[var(--color-text-muted)]">Binubuo ang ulat...</p>}
      {!isLoading && !chartData.length && <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-white/45 p-8 text-center"><p className="text-3xl" aria-hidden="true">▥</p><h2 className="mt-2 text-lg font-bold">Wala pang practice data</h2><p className="text-[var(--color-text-muted)]">Lalabas dito ang progreso kapag nakapagsimula na si {activeChild?.name ?? 'iyong anak'}.</p></div>}

      {chartData.length > 0 && (
        <>
          <section aria-label="Mahahalagang numero" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { value: `${averageAccuracy}%`, label: 'Karaniwang accuracy', note: averageAccuracy! >= 80 ? 'Magandang antas' : 'May puwang para umunlad', color: '--color-brand-lavender' },
              { value: `${successRate}%`, label: 'Success rate', note: `${correctCount} tamang sagot`, color: '--color-brand-sage' },
              { value: sessions?.length ?? 0, label: 'Kabuuang attempts', note: 'Lahat ng practice', color: '--color-brand-sun' },
              { value: profile?.weeklyPracticeDays ?? 0, label: 'Araw ngayong linggo', note: 'Consistency', color: '--color-brand-coral' },
            ].map((stat) => <div key={stat.label} className="rounded-3xl border p-4 shadow-card sm:p-5" style={cardStyle(stat.color, 8, 28)}><p className="text-2xl font-bold text-[var(--color-primary)] sm:text-3xl">{stat.value}</p><p className="mt-1 text-sm font-bold">{stat.label}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{stat.note}</p></div>)}
          </section>

          <section aria-labelledby="trend-title" className="min-w-0 rounded-3xl border p-4 shadow-card sm:p-6" style={cardStyle('--color-brand-teal', 6, 25)}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 id="trend-title" className="text-xl font-bold">Accuracy sa Paglipas ng Panahon</h2><p className="text-sm text-[var(--color-text-muted)]">Bawat punto ay isang practice session ni {activeChild?.name}.</p></div><span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[var(--color-brand-teal)]">Target: 80% pataas</span></div>
            <div className="h-72 min-w-0 sm:h-80">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} minTickGap={24} /><YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ borderRadius: 16, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }} formatter={(value) => [`${value}%`, 'Accuracy']} /><Line type="monotone" dataKey="accuracy" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 3, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer>
            </div>
          </section>
        </>
      )}

      {readingProfile && <section aria-label="Mga insight sa pagbabasa" className="min-w-0 overflow-hidden"><div className="mb-3"><h2 className="text-xl font-bold">Lakas, Hamon, at Susunod na Hakbang</h2><p className="text-sm text-[var(--color-text-muted)]">Mga insight mula sa aktuwal na practice data.</p></div><ReadingInsightsPanel profile={readingProfile.profile} /></section>}

      {activeChildId && (
        <section aria-labelledby="badges-title" className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-sun', 8, 28)}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="badges-title" className="text-xl font-bold">Mga Nakuhang Badge</h2><p className="text-sm text-[var(--color-text-muted)]">{earnedBadges.length} sa {BADGE_CATALOG.length} parangal ang nakuha na.</p></div><span className="rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-[var(--color-warning-text)]">{Math.round((earnedBadges.length / BADGE_CATALOG.length) * 100)}% koleksyon</span></div>
          {earnedBadges.length === 0 ? <p className="mt-4 rounded-2xl bg-white/55 p-4 text-[var(--color-text-muted)]">Wala pang nakukuhang badge.</p> : <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{earnedBadges.map((badge, index) => { const unlockedAt = unlockedBadgeIds.get(badge.id); return <article key={badge.id} className="flex min-w-0 flex-col items-center rounded-2xl border p-3 text-center" style={cardStyle(CARD_COLORS[index % CARD_COLORS.length])}><img src={badge.image} alt={badge.title} className="h-16 w-16 object-contain drop-shadow-sm" /><p className="mt-2 text-sm font-bold">{badge.title}</p>{unlockedAt && <time dateTime={unlockedAt} className="mt-1 text-[0.65rem] text-[var(--color-text-muted)]">{new Date(unlockedAt).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' })}</time>}</article>; })}</div>}
        </section>
      )}
    </div>
  );
}
