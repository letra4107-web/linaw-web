import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { cardStyle } from '../../lib/cardStyle';

interface RosterItem { student_id: string; children: { id: string; name: string; grade_level: number } | null; }
interface ProgressItem { child_id: string; accuracy_sum: number; total_attempts: number; activities_completed: number; streak: number; }
interface RecentSession { student_id: string; word: string; accuracy_percentage: number; created_at: string; }

export default function Dashboard() {
  const { user, identity } = useAuth();
  const { data: roster } = useQuery({ queryKey: ['teacher-roster-summary', user?.id], queryFn: async () => { const { data, error } = await supabase.from('teacher_student_links').select('student_id, children(id, name, grade_level)'); if (error) throw error; return data as unknown as RosterItem[]; }, enabled: Boolean(user) });
  const studentIds = (roster ?? []).map((item) => item.student_id);
  const { data: progress } = useQuery({ queryKey: ['teacher-dashboard-progress', studentIds], queryFn: async () => { if (!studentIds.length) return []; const { data, error } = await supabase.from('child_progress').select('child_id, accuracy_sum, total_attempts, activities_completed, streak').in('child_id', studentIds); if (error) throw error; return data as ProgressItem[]; }, enabled: studentIds.length > 0 });
  const { data: recent } = useQuery({ queryKey: ['teacher-dashboard-recent', studentIds], queryFn: async () => { if (!studentIds.length) return []; const { data, error } = await supabase.from('pronunciation_practice_sessions').select('student_id, word, accuracy_percentage, created_at').in('student_id', studentIds).order('created_at', { ascending: false }).limit(6); if (error) throw error; return data as RecentSession[]; }, enabled: studentIds.length > 0 });
  const { data: pendingAssignments } = useQuery({ queryKey: ['teacher-pending-assignments', user?.id], queryFn: async () => { const { data: materials, error: matErr } = await supabase.from('pdf_materials').select('id').eq('teacher_id', user!.id); if (matErr) throw matErr; const ids = (materials ?? []).map((material) => material.id); if (!ids.length) return 0; const { count, error } = await supabase.from('pdf_assignments').select('id', { count: 'exact', head: true }).in('pdf_material_id', ids).neq('status', 'completed'); if (error) throw error; return count ?? 0; }, enabled: Boolean(user) });
  const { data: materialsCount } = useQuery({ queryKey: ['teacher-materials-count', user?.id], queryFn: async () => { const { count, error } = await supabase.from('pdf_materials').select('id', { count: 'exact', head: true }).eq('teacher_id', user!.id); if (error) throw error; return count ?? 0; }, enabled: Boolean(user) });

  const rows = (progress ?? []).map((item) => ({ ...item, name: roster?.find((entry) => entry.student_id === item.child_id)?.children?.name ?? 'Mag-aaral', accuracy: item.total_attempts > 0 ? Math.round(item.accuracy_sum / item.total_attempts) : 0 }));
  const activeRows = rows.filter((row) => row.total_attempts > 0);
  const classAverage = activeRows.length ? Math.round(activeRows.reduce((sum, row) => sum + row.accuracy, 0) / activeRows.length) : 0;
  const needsAttention = rows.filter((row) => row.total_attempts > 0 && row.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy);
  const nameFor = (studentId: string) => roster?.find((entry) => entry.student_id === studentId)?.children?.name ?? 'Mag-aaral';

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="relative overflow-hidden rounded-3xl border px-5 py-5 text-white shadow-card sm:px-7" style={{ backgroundImage: 'linear-gradient(135deg, #5c8047, #0d9488)' }}><div aria-hidden="true" className="absolute -top-16 -right-12 h-44 w-44 rounded-full bg-white/10" /><div className="relative"><p className="text-sm font-bold text-white/75">Teacher overview</p><h1 className="text-2xl font-bold sm:text-3xl">Magandang araw, {identity?.displayName ?? 'Guro'}</h1><p className="mt-1 text-sm text-white/85">Narito ang pinakamahalagang update sa iyong klase.</p></div></header>

      <section aria-label="Mahahalagang numero" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { value: roster?.length ?? 0, label: 'Assigned students', note: 'Kasalukuyang roster', color: '--color-brand-lavender' },
          { value: `${classAverage}%`, label: 'Class average', note: `${activeRows.length} may practice data`, color: '--color-brand-teal' },
          { value: needsAttention.length, label: 'Kailangang tutukan', note: 'Mas mababa sa 70%', color: '--color-brand-coral' },
          { value: pendingAssignments ?? 0, label: 'Aktibong assignment', note: `${materialsCount ?? 0} PDF material`, color: '--color-brand-sun' },
        ].map((stat) => <div key={stat.label} className="rounded-3xl border p-4 shadow-card sm:p-5" style={cardStyle(stat.color, 8, 28)}><p className="text-2xl font-bold sm:text-3xl">{stat.value}</p><p className="mt-1 text-sm font-bold">{stat.label}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{stat.note}</p></div>)}
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section aria-labelledby="attention-title" className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-coral', 7, 28)}><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-brand-coral)] uppercase">Priority</p><h2 id="attention-title" className="text-xl font-bold">Mga Mag-aaral na Kailangang Tutukan</h2></div><Link to="/teacher/progress-reports" className="text-sm font-bold text-[var(--color-primary)]">Analytics →</Link></div>
          {needsAttention.length ? <ul className="mt-4 flex flex-col gap-2">{needsAttention.slice(0, 5).map((student) => <li key={student.child_id} className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/65 p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-danger-soft)] font-bold text-[var(--color-danger)]">{student.name.charAt(0)}</span><span className="min-w-0 flex-1"><span className="block truncate font-bold">{student.name}</span><span className="block text-xs text-[var(--color-text-muted)]">{student.activities_completed} gawaing natapos</span></span><span className="rounded-full bg-[var(--color-danger-soft)] px-3 py-1 text-sm font-bold text-[var(--color-danger)]">{student.accuracy}%</span></li>)}</ul> : <div className="mt-4 rounded-2xl bg-white/60 p-5"><p className="font-bold text-[var(--color-success)]">Walang agarang intervention alert.</p><p className="text-sm text-[var(--color-text-muted)]">Patuloy na subaybayan ang class performance.</p></div>}
        </section>

        <section aria-labelledby="insight-title" className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-sage', 8, 28)}><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-brand-sage)] uppercase">Class insight</p><h2 id="insight-title" className="text-xl font-bold">Snapshot ng Pagbasa</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/65 p-4"><p className="text-2xl font-bold text-[var(--color-brand-sage)]">{rows.filter((row) => row.accuracy >= 80).length}</p><p className="text-xs font-bold text-[var(--color-text-muted)]">80%+ accuracy</p></div><div className="rounded-2xl bg-white/65 p-4"><p className="text-2xl font-bold text-[var(--color-brand-coral)]">{rows.filter((row) => row.streak >= 3).length}</p><p className="text-xs font-bold text-[var(--color-text-muted)]">3+ araw na streak</p></div></div><p className="mt-4 text-sm leading-relaxed text-[var(--color-text-muted)]">{activeRows.length ? `Ang kasalukuyang class average ay ${classAverage}%. Gamitin ang analytics para makita ang indibidwal na performance at susunod na focus.` : 'Wala pang sapat na practice data upang makagawa ng class insight.'}</p></section>
      </div>

      <section aria-labelledby="recent-title" className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-teal', 7, 26)}><div className="flex items-center justify-between"><h2 id="recent-title" className="text-xl font-bold">Kamakailang Aktibidad</h2><span className="text-xs font-bold text-[var(--color-text-muted)]">Pinakabagong practice</span></div>{recent?.length ? <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">{recent.map((session, index) => <div key={`${session.created_at}-${index}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/70 bg-white/65 p-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${session.accuracy_percentage >= 80 ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-warning-soft)] text-[var(--color-warning-text)]'}`}>{session.accuracy_percentage >= 80 ? '✓' : '!'}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{nameFor(session.student_id)} · {session.word}</p><time dateTime={session.created_at} className="text-xs text-[var(--color-text-muted)]">{new Date(session.created_at).toLocaleString('fil-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></div><span className="font-bold">{session.accuracy_percentage}%</span></div>)}</div> : <p className="mt-4 text-[var(--color-text-muted)]">Wala pang recent activity.</p>}</section>

      <nav aria-label="Mabilis na aksyon" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        { to: '/teacher/students', icon: '♟', label: 'Mga Mag-aaral', desc: 'Ayusin ang roster', color: '--color-brand-lavender' },
        { to: '/teacher/lessons?tab=lessons', icon: '▤', label: 'Mga Aralin', desc: 'Gumawa ng content', color: '--color-brand-sun' },
        { to: '/teacher/lessons?tab=pdf', icon: '▧', label: 'PDF Assignment', desc: 'Mag-upload at mag-assign', color: '--color-brand-teal' },
        { to: '/teacher/messages', icon: '✉', label: 'Mga Mensahe', desc: 'Makipag-ugnayan', color: '--color-brand-sage' },
      ].map((action) => <Link key={action.to} to={action.to} className="flex min-h-24 items-center gap-3 rounded-3xl border p-4 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised" style={cardStyle(action.color)}><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-xl">{action.icon}</span><span><span className="block font-bold">{action.label}</span><span className="block text-xs text-[var(--color-text-muted)]">{action.desc}</span></span></Link>)}</nav>
    </div>
  );
}
