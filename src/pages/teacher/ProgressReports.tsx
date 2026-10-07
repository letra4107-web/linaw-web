import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, BarChart3, CheckCircle2, ChevronRight, Crown, Lightbulb, Search, Target, Trophy, UsersRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import teacherHeroBackground from '../../assets/teacher/Teacher Home Hero Banner Background.png';
import teacherIllustration from '../../assets/teacher/Teacher Illustration.png';

interface ChildRow { id: string; name: string; grade_level: number; username: string; }
interface RosterRow { id: string; student_id: string; assigned_at: string; children: ChildRow | null; }
interface ProgressRow { child_id: string; xp: number; streak: number; level: string | null; accuracy_sum: number; total_attempts: number; activities_completed: number; }
interface RecentRow { student_id: string; created_at: string; }

const levelColors: Record<string, string> = { Advanced: '#8060e4', Intermediate: '#48a0ef', Beginner: '#ffba1d' };
const levelClass = (level: string) => level.toLowerCase();
const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Wala pa';

export default function ProgressReports() {
  const { user } = useAuth();
  const [gradeFilter, setGradeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [query, setQuery] = useState('');

  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: ['teacher-roster', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('teacher_student_links')
        .select('id, student_id, assigned_at, children(id, name, grade_level, username)')
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data as unknown as RosterRow[];
    },
    enabled: Boolean(user),
  });
  const studentIds = (roster ?? []).map((row) => row.student_id);
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['teacher-progress-reports', studentIds],
    queryFn: async () => {
      if (!studentIds.length) return [];
      const { data, error } = await supabase.from('child_progress')
        .select('child_id, xp, streak, level, accuracy_sum, total_attempts, activities_completed')
        .in('child_id', studentIds);
      if (error) throw error;
      return data as ProgressRow[];
    },
    enabled: studentIds.length > 0,
  });
  const { data: recent } = useQuery({
    queryKey: ['teacher-progress-recent', studentIds],
    queryFn: async () => {
      if (!studentIds.length) return [];
      const { data, error } = await supabase.from('pronunciation_practice_sessions')
        .select('student_id, created_at').in('student_id', studentIds).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data as RecentRow[];
    },
    enabled: studentIds.length > 0,
  });

  const studentRows = useMemo(() => (roster ?? []).map((row) => {
    const item = progress?.find((value) => value.child_id === row.student_id);
    const accuracy = item?.total_attempts ? Math.round(item.accuracy_sum / item.total_attempts) : 0;
    const level = item?.level || 'Beginner';
    const lastActivity = recent?.find((value) => value.student_id === row.student_id)?.created_at;
    return { ...row, item, accuracy, level, lastActivity, needsAttention: Boolean(item?.total_attempts && accuracy < 70) };
  }), [roster, progress, recent]);

  const activeRows = studentRows.filter((row) => row.item?.total_attempts);
  const targetRows = activeRows.filter((row) => row.accuracy >= 80);
  const attentionRows = activeRows.filter((row) => row.needsAttention);
  const gradeLevels = [...new Set(studentRows.map((row) => row.children?.grade_level).filter((value): value is number => Boolean(value)))].sort((a, b) => a - b);
  const graphRows = ['Accuracy', 'Completion', 'Practice'].map((metric) => {
    const next: Record<string, string | number> = { metric };
    gradeLevels.slice(0, 3).forEach((grade) => {
      const group = activeRows.filter((row) => row.children?.grade_level === grade);
      const maxActivities = Math.max(1, ...activeRows.map((row) => row.item?.activities_completed ?? 0));
      const maxAttempts = Math.max(1, ...activeRows.map((row) => row.item?.total_attempts ?? 0));
      next[`grade${grade}`] = group.length ? Math.round(group.reduce((sum, row) => sum + (metric === 'Accuracy' ? row.accuracy : metric === 'Completion' ? ((row.item?.activities_completed ?? 0) / maxActivities) * 100 : ((row.item?.total_attempts ?? 0) / maxAttempts) * 100), 0) / group.length) : 0;
    });
    return next;
  });
  const distribution = ['Advanced', 'Intermediate', 'Beginner'].map((level) => ({ name: level, value: studentRows.filter((row) => row.level.toLowerCase() === level.toLowerCase()).length, color: levelColors[level] }));
  const visibleRows = studentRows.filter((row) => (gradeFilter === 'all' || String(row.children?.grade_level) === gradeFilter)
    && (levelFilter === 'all' || row.level.toLowerCase() === levelFilter)
    && (!query.trim() || row.children?.name.toLowerCase().includes(query.trim().toLowerCase()) || row.children?.username.toLowerCase().includes(query.trim().toLowerCase())));
  const ranked = [...activeRows].sort((a, b) => b.accuracy - a.accuracy);

  return <div className="teacher-reports-reference flex min-w-0 flex-col gap-4 pb-6">
    <header className="teacher-reports-hero">
      <img src={teacherHeroBackground} alt="" aria-hidden="true" />
      <div className="teacher-reports-hero__wash" aria-hidden="true" />
      <div className="teacher-reports-hero__copy"><p>Ulat ng pag-unlad</p><h1>Mas Maliwanag na Pag-unlad <BarChart3 /></h1><span>Subaybayan ang progreso ng bawat mag-aaral at tukuyin ang mga lugar na kailangang pa ng suporta.</span></div>
      <img className="teacher-reports-hero__teacher" src={teacherIllustration} alt="" aria-hidden="true" />
      <aside><Lightbulb /><span>Mas maunlad na mag-aaral, mas makabuluhang kinabukasan.</span></aside>
    </header>

    {(rosterLoading || progressLoading) && <p className="teacher-reports-loading">Binubuo ang ulat ng pag-unlad...</p>}
    {!rosterLoading && !progressLoading && !studentRows.length && <section className="teacher-reports-empty"><UsersRound /><h2>Wala pang mag-aaral sa iyong roster</h2><p>Magdagdag muna ng mag-aaral upang makita ang mga ulat ng pag-unlad.</p></section>}
    {!!studentRows.length && <>
      <section className="teacher-report-stats" aria-label="Buod ng pag-unlad">
        <article><span><UsersRound /></span><div><b>{studentRows.length}</b><p>Kabuuang Mag-aaral</p><small>{activeRows.length} may aktibidad</small></div></article>
        <article><span><BarChart3 /></span><div><b>{activeRows.length}</b><p>Aktibong Mag-aaral</p><small>{studentRows.length ? `${Math.round((activeRows.length / studentRows.length) * 100)}% ng kabuuan` : '0% ng kabuuan'}</small></div></article>
        <article><span><Trophy /></span><div><b>{targetRows.length}</b><p>Naaabot ang Target</p><small>80% pataas ang marka</small></div></article>
        <article><span><Target /></span><div><b>{attentionRows.length}</b><p>Kailangan ng Suporta</p><small>Mas mababa sa 70%</small></div></article>
      </section>

      <section className="teacher-reports-charts">
        <article className="teacher-reports-chart-card"><header><span><BarChart3 /></span><div><h2>Pangkalahatang Pag-unlad</h2><p>Average na marka batay sa aktuwal na records ng klase</p></div><div className="teacher-reports-legend">{gradeLevels.slice(0, 3).map((grade, index) => <small key={grade} className={`grade-${index + 1}`}>Grade {grade}</small>)}</div></header><div className="teacher-reports-bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={graphRows} margin={{ top: 10, right: 8, left: -20, bottom: 0 }} barGap={5}><CartesianGrid vertical={false} stroke="#e9e4f7" /><XAxis dataKey="metric" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#615b87' }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#7a7597' }} /><Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e5dff4', fontSize: 12 }} formatter={(value) => `${value ?? 0}%`} />{gradeLevels.slice(0, 3).map((grade, index) => <Bar key={grade} dataKey={`grade${grade}`} name={`Grade ${grade}`} fill={['#8060e4', '#ffbd27', '#46ba92'][index]} radius={[6, 6, 0, 0]} />)}</BarChart></ResponsiveContainer></div></article>
        <article className="teacher-reports-level-card"><header><span><Crown /></span><div><h2>Antas ng Pagbasa</h2><p>Bilang ng mga mag-aaral sa bawat antas</p></div></header><div className="teacher-reports-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius="57%" outerRadius="83%" paddingAngle={1}>{distribution.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><strong>{studentRows.length}<small>Mag-aaral</small></strong></div><ul>{distribution.map((item) => <li key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><b>{item.value} ({studentRows.length ? Math.round((item.value / studentRows.length) * 100) : 0}%)</b></li>)}</ul></article>
      </section>

      <section className="teacher-reports-highlights">
        <article><header><span><Crown /></span><div><h2>Nangungunang Mag-aaral</h2><p>Pinakamataas na kabuuang marka</p></div><ChevronRight /></header><div className="teacher-report-student-strip">{ranked.slice(0, 3).map((row, index) => <div key={row.id}><em>{index + 1}</em><span>{row.children?.name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span><p><b>{row.children?.name ?? 'Mag-aaral'}</b><small>Grade {row.children?.grade_level ?? '—'} · {row.accuracy}%</small><i><u style={{ width: `${row.accuracy}%` }} /></i></p></div>)}{!ranked.length && <p className="teacher-report-empty-copy">Wala pang sapat na activity record.</p>}</div></article>
        <article className="attention"><header><span><AlertTriangle /></span><div><h2>Kailangang Tutukan</h2><p>Mga mag-aaral na mababa ang marka</p></div><ChevronRight /></header><div className="teacher-report-student-strip">{attentionRows.slice(0, 3).map((row) => <div key={row.id}><span>{row.children?.name.split(' ').map((word) => word[0]).join('').slice(0, 2)}</span><p><b>{row.children?.name ?? 'Mag-aaral'}</b><small>Grade {row.children?.grade_level ?? '—'} · {row.accuracy}%</small><i><u style={{ width: `${row.accuracy}%` }} /></i></p></div>)}{!attentionRows.length && <p className="teacher-report-empty-copy">Walang mag-aaral na nangangailangan ng agarang suporta.</p>}</div></article>
      </section>

      <section className="teacher-reports-table-card"><header><span><CheckCircle2 /></span><div><h2>Detalye ng Pag-unlad ng Mag-aaral</h2><p>Tingnan ang indibidwal na progreso ng bawat mag-aaral.</p></div><div className="teacher-reports-table-filters"><select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}><option value="all">Lahat ng Baitang</option>{gradeLevels.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}</select><select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}><option value="all">Lahat ng Antas</option><option value="advanced">Advanced</option><option value="intermediate">Intermediate</option><option value="beginner">Beginner</option></select><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hanapin ang mag-aaral..." /></label></div></header><div className="teacher-reports-table-scroll"><table><thead><tr><th>Mag-aaral</th><th>Baitang</th><th>Antas ng Pagbasa</th><th>Kabuuang Marka</th><th>Huling Aktibidad</th><th>Katayuan</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}><td><span className="teacher-report-avatar">{row.children?.name.split(' ').map((word) => word[0]).join('').slice(0, 2) || '?'}</span><div><b>{row.children?.name ?? 'Mag-aaral'}</b><small>{row.children?.username ?? 'Walang username'}</small></div></td><td>Grade {row.children?.grade_level ?? '—'}</td><td><em className={`teacher-report-level ${levelClass(row.level)}`}>{row.level}</em></td><td><div className="teacher-report-score"><i><u style={{ width: `${row.accuracy}%` }} /></i><b>{row.item?.total_attempts ? `${row.accuracy}%` : '—'}</b></div></td><td><b>{dateLabel(row.lastActivity)}</b><small>{row.item?.activities_completed ?? 0} natapos na gawain</small></td><td><em className={row.needsAttention ? 'teacher-report-status attention' : 'teacher-report-status'}>{row.needsAttention ? 'Kailangan ng Atensyon' : 'Aktibo'}</em></td></tr>)}{!visibleRows.length && <tr><td className="teacher-reports-no-results" colSpan={6}>Walang mag-aaral na tugma sa mga filter.</td></tr>}</tbody></table></div></section>
    </>}
  </div>;
}
