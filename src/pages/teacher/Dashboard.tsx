import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, BarChart3, BookOpen, CheckCircle2, ChevronRight, ClipboardList, FileText, Flag, MessageSquare, Plus, Star, TrendingUp, Upload, UsersRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import teacherBanner from '../../assets/teacher/Teacher Home Hero Banner Background.png';
import teacherIllustration from '../../assets/teacher/Teacher Illustration.png';

interface RosterItem { student_id: string; children: { id: string; name: string; grade_level: number } | null; }
interface ProgressItem { child_id: string; accuracy_sum: number; total_attempts: number; activities_completed: number; streak: number; }
interface RecentSession { student_id: string; word: string; accuracy_percentage: number; created_at: string; }

const relativeTime = (value: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
};

const studentColor = (index: number) => ['violet', 'blue', 'green', 'gold', 'rose'][index % 5];

export default function Dashboard() {
  const { user, identity } = useAuth();
  const { data: roster } = useQuery({ queryKey: ['teacher-roster-summary', user?.id], queryFn: async () => {
    const { data, error } = await supabase.from('teacher_student_links').select('student_id, children(id, name, grade_level)');
    if (error) throw error;
    return data as unknown as RosterItem[];
  }, enabled: Boolean(user) });
  const studentIds = (roster ?? []).map((item) => item.student_id);
  const { data: progress } = useQuery({ queryKey: ['teacher-dashboard-progress', studentIds], queryFn: async () => {
    if (!studentIds.length) return [];
    const { data, error } = await supabase.from('child_progress').select('child_id, accuracy_sum, total_attempts, activities_completed, streak').in('child_id', studentIds);
    if (error) throw error;
    return data as ProgressItem[];
  }, enabled: studentIds.length > 0 });
  const { data: recent } = useQuery({ queryKey: ['teacher-dashboard-recent', studentIds], queryFn: async () => {
    if (!studentIds.length) return [];
    const { data, error } = await supabase.from('pronunciation_practice_sessions').select('student_id, word, accuracy_percentage, created_at').in('student_id', studentIds).order('created_at', { ascending: false }).limit(6);
    if (error) throw error;
    return data as RecentSession[];
  }, enabled: studentIds.length > 0 });
  const { data: pendingAssignments } = useQuery({ queryKey: ['teacher-pending-assignments', user?.id], queryFn: async () => {
    const { data: materials, error: materialError } = await supabase.from('pdf_materials').select('id').eq('teacher_id', user!.id);
    if (materialError) throw materialError;
    const ids = (materials ?? []).map((material) => material.id);
    if (!ids.length) return 0;
    const { count, error } = await supabase.from('pdf_assignments').select('id', { count: 'exact', head: true }).in('pdf_material_id', ids).neq('status', 'completed');
    if (error) throw error;
    return count ?? 0;
  }, enabled: Boolean(user) });
  const { data: materialsCount } = useQuery({ queryKey: ['teacher-materials-count', user?.id], queryFn: async () => {
    const { count, error } = await supabase.from('pdf_materials').select('id', { count: 'exact', head: true }).eq('teacher_id', user!.id);
    if (error) throw error;
    return count ?? 0;
  }, enabled: Boolean(user) });

  const rows = (progress ?? []).map((item) => ({
    ...item,
    name: roster?.find((entry) => entry.student_id === item.child_id)?.children?.name ?? 'Student',
    accuracy: item.total_attempts > 0 ? Math.round(item.accuracy_sum / item.total_attempts) : 0,
  }));
  const activeRows = rows.filter((row) => row.total_attempts > 0);
  const classAverage = activeRows.length ? Math.round(activeRows.reduce((sum, row) => sum + row.accuracy, 0) / activeRows.length) : 0;
  const needsAttention = activeRows.filter((row) => row.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy);
  const chartRows = [...activeRows].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);
  const nameFor = (studentId: string) => roster?.find((entry) => entry.student_id === studentId)?.children?.name ?? 'Student';
  const teacherName = identity?.displayName?.split(' ')[0] ?? 'Teacher';

  return <div className="teacher-home-reference flex min-w-0 flex-col gap-4 pb-5">
    <header className="teacher-home-hero relative overflow-hidden rounded-[1.3rem] border px-7 py-6 shadow-card">
      <img src={teacherBanner} alt="" aria-hidden="true" /><img src={teacherIllustration} alt="" aria-hidden="true" />
      <div><p>Good morning,</p><h1>Teacher {teacherName}!</h1><span>Every small progress your students make is a meaningful step toward more confident reading.</span></div>
      <blockquote>“A clear lesson today can make a brighter reader tomorrow.”</blockquote>
    </header>

    <section aria-label="Teacher overview" className="teacher-home-stats grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article><span><UsersRound /></span><div><b>{roster?.length ?? 0}</b><p>My students</p><small>Current class roster</small></div><ChevronRight /></article>
      <article><span><BookOpen /></span><div><b>{materialsCount ?? 0}</b><p>Active lessons</p><small>Learning materials created</small></div><ChevronRight /></article>
      <article><span><TrendingUp /></span><div><b>{classAverage}%</b><p>Average accuracy</p><small>{activeRows.length} students with activity</small></div><ChevronRight /></article>
      <article><span><Star /></span><div><b>{pendingAssignments ?? 0}</b><p>Open tasks</p><small>Assignments not completed</small></div><ChevronRight /></article>
    </section>

    <section className="teacher-home-main-grid grid gap-4 xl:grid-cols-[1.22fr_.98fr]">
      <article className="teacher-progress-card rounded-[1.25rem] border p-5 shadow-card"><header><span><Flag /></span><div><h2>Overall progress</h2><p>Current reading accuracy of your active students.</p></div><Link to="/teacher/progress-reports">View reports <ChevronRight /></Link></header>
        {chartRows.length ? <div className="teacher-progress-bars" aria-label="Student accuracy chart">{chartRows.map((row, index) => <div key={row.child_id}><b>{row.accuracy}%</b><span className={studentColor(index)} style={{ height: `${Math.max(12, row.accuracy)}%` }} /><small title={row.name}>{row.name}</small></div>)}</div> : <p className="teacher-empty">Progress will appear after students complete reading activities.</p>}
      </article>
      <article className="teacher-activity-card rounded-[1.25rem] border p-5 shadow-card"><header><span><FileText /></span><h2>Recent activity</h2><Link to="/teacher/progress-reports">View all <ChevronRight /></Link></header>
        {recent?.length ? <div className="teacher-activity-list">{recent.slice(0, 5).map((session, index) => <article key={`${session.created_at}-${index}`}><span className={session.accuracy_percentage >= 80 ? 'complete' : 'practice'}>{session.accuracy_percentage >= 80 ? <CheckCircle2 /> : <BookOpen />}</span><div><b>{nameFor(session.student_id)}</b><small>{session.accuracy_percentage >= 80 ? 'Completed practice:' : 'Practiced word:'} {session.word}</small></div><time dateTime={session.created_at}>{relativeTime(session.created_at)}</time></article>)}</div> : <p className="teacher-empty">No activity has been recorded yet.</p>}
      </article>
    </section>

    <section className="teacher-home-bottom-grid grid gap-4 xl:grid-cols-[1.03fr_1fr_.9fr]">
      <article className="teacher-attention-card rounded-[1.25rem] border p-5 shadow-card"><header><span><AlertCircle /></span><h2>Students to review</h2><Link to="/teacher/progress-reports">View all <ChevronRight /></Link></header>
        {needsAttention.length ? <div className="teacher-attention-list">{needsAttention.slice(0, 4).map((student, index) => <Link key={student.child_id} to="/teacher/progress-reports"><span className={studentColor(index)}>{student.name.slice(0, 2).toUpperCase()}</span><div><b>{student.name}</b><small>{student.activities_completed} activities completed</small></div><em>{student.accuracy}%</em></Link>)}</div> : <p className="teacher-empty">No students currently need attention.</p>}
      </article>
      <article className="teacher-tasks-card rounded-[1.25rem] border p-5 shadow-card"><header><span><ClipboardList /></span><h2>Assignments</h2><Link to="/teacher/lessons?tab=pdf">View all <ChevronRight /></Link></header>
        <div className="teacher-task-summary"><span><FileText /></span><div><b>{pendingAssignments ?? 0} open assignments</b><small>Across {materialsCount ?? 0} learning materials</small></div></div><div className="teacher-task-summary"><span><BarChart3 /></span><div><b>{classAverage}% class accuracy</b><small>Based on submitted reading practice</small></div></div><Link to="/teacher/lessons?tab=pdf" className="teacher-task-link">Manage assignments <ChevronRight /></Link>
      </article>
      <nav aria-label="Quick actions" className="teacher-actions-card rounded-[1.25rem] border p-5 shadow-card"><header><span><TrendingUp /></span><h2>Quick actions</h2></header><div>
        <Link to="/teacher/students"><span><Plus /></span>Add student</Link><Link to="/teacher/lessons?tab=lessons"><span><BookOpen /></span>Create lesson</Link><Link to="/teacher/lessons?tab=pdf"><span><Upload /></span>Upload material</Link><Link to="/teacher/messages"><span><MessageSquare /></span>Send message</Link>
      </div></nav>
    </section>
  </div>;
}
