import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { cardStyle } from '../../lib/cardStyle';

interface RosterChild { id: string; student_id: string; children: { id: string; name: string } | null; }
interface ProgressRow { child_id: string; xp: number; streak: number; accuracy_sum: number; total_attempts: number; activities_completed: number; }

export default function ProgressReports() {
  const { user } = useAuth();
  const { data: roster } = useQuery({ queryKey: ['teacher-roster', user?.id], queryFn: async () => { const { data, error } = await supabase.from('teacher_student_links').select('id, student_id, children(id, name)'); if (error) throw error; return data as unknown as RosterChild[]; }, enabled: Boolean(user) });
  const studentIds = (roster ?? []).map((row) => row.student_id);
  const { data: progress, isLoading } = useQuery({ queryKey: ['teacher-progress-reports', studentIds], queryFn: async () => { if (!studentIds.length) return []; const { data, error } = await supabase.from('child_progress').select('child_id, xp, streak, accuracy_sum, total_attempts, activities_completed').in('child_id', studentIds); if (error) throw error; return data as ProgressRow[]; }, enabled: studentIds.length > 0 });
  const nameFor = (childId: string) => roster?.find((row) => row.student_id === childId)?.children?.name ?? 'Mag-aaral';
  const chartData = (progress ?? []).map((row) => ({ name: nameFor(row.child_id), xp: row.xp ?? 0, streak: row.streak ?? 0, accuracy: row.total_attempts > 0 ? Math.round(row.accuracy_sum / row.total_attempts) : 0, activities: row.activities_completed ?? 0, attempts: row.total_attempts ?? 0 }));
  const active = chartData.filter((row) => row.attempts > 0);
  const classAverage = active.length ? Math.round(active.reduce((sum, row) => sum + row.accuracy, 0) / active.length) : 0;
  const strongest = [...active].sort((a, b) => b.accuracy - a.accuracy)[0];
  const weakest = [...active].sort((a, b) => a.accuracy - b.accuracy)[0];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-violet', 8, 28)}><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-brand-violet)] uppercase">Class analytics</p><h1 className="text-2xl font-bold sm:text-3xl">Progress at Performance</h1><p className="text-sm text-[var(--color-text-muted)]">Batay sa aktuwal na datos ng bawat mag-aaral sa iyong roster.</p></header>
      {isLoading && <p className="rounded-2xl bg-white/60 p-5">Binubuo ang analytics...</p>}
      {!isLoading && !chartData.length && <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-white/45 p-8 text-center"><h2 className="text-xl font-bold">Wala pang class data</h2><p className="text-[var(--color-text-muted)]">Magdagdag muna ng mag-aaral sa roster.</p></div>}
      {chartData.length > 0 && <>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Class summary">{[
          { value: `${classAverage}%`, label: 'Class average', note: `${active.length} may attempts`, color: '--color-brand-teal' },
          { value: chartData.filter((row) => row.accuracy < 70 && row.attempts > 0).length, label: 'Intervention needs', note: 'Mas mababa sa 70%', color: '--color-brand-coral' },
          { value: strongest?.name ?? '—', label: 'Highest accuracy', note: strongest ? `${strongest.accuracy}%` : 'Walang data', color: '--color-brand-sage' },
          { value: weakest?.name ?? '—', label: 'Lowest accuracy', note: weakest ? `${weakest.accuracy}%` : 'Walang data', color: '--color-brand-sun' },
        ].map((stat) => <div key={stat.label} className="min-w-0 rounded-3xl border p-4 shadow-card sm:p-5" style={cardStyle(stat.color, 8, 28)}><p className="truncate text-xl font-bold sm:text-2xl">{stat.value}</p><p className="mt-1 text-sm font-bold">{stat.label}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{stat.note}</p></div>)}</section>

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
          {[{ title: 'Accuracy ng Bawat Mag-aaral', desc: 'Mas mataas ay mas mahusay; target ang 80% pataas.', dataKey: 'accuracy', color: 'var(--color-brand-teal)', domain: [0, 100] as [number, number] }, { title: 'Natapos na Gawain', desc: 'Dami ng completed reading activities.', dataKey: 'activities', color: 'var(--color-brand-sage)', domain: undefined }].map((chart) => <section key={chart.dataKey} className="min-w-0 rounded-3xl border p-4 shadow-card sm:p-5" style={cardStyle(chart.dataKey === 'accuracy' ? '--color-brand-teal' : '--color-brand-sage', 6, 24)}><h2 className="text-lg font-bold">{chart.title}</h2><p className="text-xs text-[var(--color-text-muted)]">{chart.desc}</p><div className="mt-3 h-72 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--color-border)" /><XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={0} tickFormatter={(value: string) => value.split(' ')[0]} /><YAxis domain={chart.domain} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ borderRadius: 16, border: '1px solid var(--color-border)' }} /><Bar dataKey={chart.dataKey} fill={chart.color} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></section>)}
        </div>

        <section aria-labelledby="student-performance-title"><div className="mb-3"><h2 id="student-performance-title" className="text-xl font-bold">Detalye ng Performance</h2><p className="text-sm text-[var(--color-text-muted)]">Compact comparison ng lahat ng mag-aaral.</p></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{chartData.sort((a, b) => a.accuracy - b.accuracy).map((row) => <article key={row.name} className="rounded-3xl border p-4 shadow-card" style={cardStyle(row.accuracy < 70 && row.attempts ? '--color-brand-coral' : '--color-brand-lavender', 6, 24)}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold">{row.name}</h3><p className="text-xs text-[var(--color-text-muted)]">{row.attempts} attempts · {row.activities} activities</p></div><span className={`rounded-full px-3 py-1 text-sm font-bold ${row.accuracy < 70 && row.attempts ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]' : 'bg-[var(--color-success-soft)] text-[var(--color-success)]'}`}>{row.attempts ? `${row.accuracy}%` : 'No data'}</span></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/75 shadow-inner"><div className="h-full rounded-full" style={{ width: `${Math.min(100, row.accuracy)}%`, backgroundColor: row.accuracy < 70 ? 'var(--color-brand-coral)' : 'var(--color-brand-sage)' }} /></div><div className="mt-3 flex justify-between text-xs text-[var(--color-text-muted)]"><span>⭐ {row.xp.toLocaleString()} XP</span><span>🔥 {row.streak} streak</span></div></article>)}</div></section>
      </>}
    </div>
  );
}
