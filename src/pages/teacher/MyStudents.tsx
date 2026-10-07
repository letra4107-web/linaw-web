import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, BarChart3, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, MoreHorizontal, Search, SlidersHorizontal, UserCheck, UsersRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth/AuthContext';
import rosterHero from '../../assets/teacher/Teacher Home Hero Banner Background.png';
import purpleShape from '../../assets/teacher/Hero Left Purple Decorative Shape.png';

interface ChildRow { id: string; name: string; grade_level: number; username: string; }
interface RosterRow { id: string; student_id: string; assigned_at: string; children: ChildRow | null; }
interface StudentProgress { child_id: string; level: string; accuracy_sum: number; total_attempts: number; activities_completed: number; streak: number; }
interface StudentSession { word: string; accuracy_percentage: number; is_correct: boolean; created_at: string; }
interface StudentAssignment { id: string; status: string; due_date: string | null; pdf_materials: { title: string } | null; }
interface StudentModule { id: string; module_number: number; title: string; state: 'locked' | 'unlocked' | 'completed'; content_item_count: number; completed_content_item_count: number; }

const PAGE_SIZE = 5;
const initials = (value?: string) => value?.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
const shortTime = (value?: string) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value)) : 'No activity';

export default function MyStudents() {
  const { user } = useAuth();
  const [gradeFilter, setGradeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { data: teacherProfile } = useQuery({ queryKey: ['teacher-profile', user?.id], queryFn: async () => {
    const { data, error } = await supabase.from('teacher_profiles').select('grade_levels').eq('user_id', user!.id).maybeSingle();
    if (error) throw error;
    return data as { grade_levels: number[] } | null;
  }, enabled: Boolean(user) });
  const { data: roster, isLoading } = useQuery({ queryKey: ['teacher-roster', user?.id], queryFn: async () => {
    const { data, error } = await supabase.from('teacher_student_links').select('id, student_id, assigned_at, children(id, name, grade_level, username)').order('assigned_at', { ascending: false });
    if (error) throw error;
    return data as unknown as RosterRow[];
  }, enabled: Boolean(user) });
  const rosterIds = (roster ?? []).map((row) => row.student_id);
  const { data: progress } = useQuery({ queryKey: ['teacher-students-progress', rosterIds], queryFn: async () => {
    if (!rosterIds.length) return [];
    const { data, error } = await supabase.from('child_progress').select('child_id, level, accuracy_sum, total_attempts, activities_completed, streak').in('child_id', rosterIds);
    if (error) throw error;
    return data as StudentProgress[];
  }, enabled: rosterIds.length > 0 });
  const { data: recent } = useQuery({ queryKey: ['teacher-roster-recent', rosterIds], queryFn: async () => {
    if (!rosterIds.length) return [];
    const { data, error } = await supabase.from('pronunciation_practice_sessions').select('student_id, created_at').in('student_id', rosterIds).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data as { student_id: string; created_at: string }[];
  }, enabled: rosterIds.length > 0 });
  const { data: selectedSessions } = useQuery({ queryKey: ['teacher-student-detail-sessions', selectedStudentId], queryFn: async () => {
    const { data, error } = await supabase.from('pronunciation_practice_sessions').select('word, accuracy_percentage, is_correct, created_at').eq('student_id', selectedStudentId!).order('created_at', { ascending: false }).limit(5);
    if (error) throw error;
    return data as StudentSession[];
  }, enabled: Boolean(selectedStudentId) });
  const { data: selectedAssignments } = useQuery({ queryKey: ['teacher-student-detail-assignments', selectedStudentId], queryFn: async () => {
    const { data, error } = await supabase.from('pdf_assignments').select('id, status, due_date, pdf_materials(title)').eq('student_id', selectedStudentId!).order('assigned_at', { ascending: false }).limit(5);
    if (error) throw error;
    return data as unknown as StudentAssignment[];
  }, enabled: Boolean(selectedStudentId) });
  const { data: selectedModuleData } = useQuery({ queryKey: ['teacher-student-detail-modules', selectedStudentId], queryFn: () => api<{ modules: StudentModule[] }>(`/teacher/students/${selectedStudentId}/modules`, { auth: true }), enabled: Boolean(selectedStudentId) });

  const gradeLevels = teacherProfile?.grade_levels ?? [...new Set((roster ?? []).map((row) => row.children?.grade_level).filter(Boolean))] as number[];
  const progressFor = (id: string) => progress?.find((item) => item.child_id === id);
  const recentFor = (id: string) => recent?.find((item) => item.student_id === id)?.created_at;
  const studentRows = useMemo(() => (roster ?? []).map((row) => {
    const item = progressFor(row.student_id);
    const accuracy = item?.total_attempts ? Math.round(item.accuracy_sum / item.total_attempts) : 0;
    const needsAttention = Boolean(item?.total_attempts && accuracy < 70);
    return { ...row, item, accuracy, needsAttention, lastActivity: recentFor(row.student_id) };
  }), [roster, progress, recent]);
  const filtered = studentRows.filter((row) => {
    const student = row.children;
    const normalized = query.trim().toLowerCase();
    return (gradeFilter === 'all' || String(student?.grade_level) === gradeFilter)
      && (levelFilter === 'all' || row.item?.level?.toLowerCase() === levelFilter)
      && (statusFilter === 'all' || (statusFilter === 'attention' ? row.needsAttention : !row.needsAttention))
      && (!normalized || student?.name.toLowerCase().includes(normalized) || student?.username.toLowerCase().includes(normalized));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = studentRows.find((row) => row.student_id === selectedStudentId);
  const selectedCompleted = (selectedModuleData?.modules ?? []).filter((module) => module.state === 'completed');
  const activeStudents = studentRows.filter((row) => row.item?.total_attempts).length;
  const needsAttention = studentRows.filter((row) => row.needsAttention).length;
  const completedActivities = studentRows.reduce((sum, row) => sum + (row.item?.activities_completed ?? 0), 0);
  const setFilter = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); };

  return <div className="teacher-students-reference flex min-w-0 flex-col gap-4 pb-6">
    <header className="teacher-students-hero relative overflow-hidden rounded-[1.3rem] border px-7 py-6 shadow-card"><img src={rosterHero} alt="" aria-hidden="true" /><img src={purpleShape} alt="" aria-hidden="true" /><div><p>My students</p><h1>Our students <UsersRound /></h1><span>Manage, monitor, and support the learning progress of every student.</span></div></header>

    <section className="teacher-student-stats grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article><span><UsersRound /></span><div><b>{studentRows.length}</b><p>Total students</p><small>Students in your roster</small></div><ChevronRight /></article>
      <article><span><UserCheck /></span><div><b>{activeStudents}</b><p>Active students</p><small>With recorded practice</small></div><ChevronRight /></article>
      <article><span><BarChart3 /></span><div><b>{needsAttention}</b><p>Needs attention</p><small>Below 70% accuracy</small></div><ChevronRight /></article>
      <article><span><GraduationCap /></span><div><b>{completedActivities}</b><p>Completed activities</p><small>Recorded across the roster</small></div><ChevronRight /></article>
    </section>

    <section className="teacher-student-filters rounded-2xl border p-3 shadow-card"><label><Search /><input value={query} onChange={(event) => setFilter(setQuery)(event.target.value)} placeholder="Search students (name, username, or grade)..." /></label><label><SlidersHorizontal /><select value={gradeFilter} onChange={(event) => setFilter(setGradeFilter)(event.target.value)}><option value="all">All grades</option>{gradeLevels.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}</select></label><label><select value={levelFilter} onChange={(event) => setFilter(setLevelFilter)(event.target.value)}><option value="all">All reading levels</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><label><select value={statusFilter} onChange={(event) => setFilter(setStatusFilter)(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="attention">Needs attention</option></select></label><Link to="/teacher/lessons?tab=pdf"><span>＋</span> Add student activity</Link></section>

    <section className="teacher-student-table-card overflow-hidden rounded-[1.35rem] border shadow-card"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead><tr><th><input type="checkbox" aria-label="Select all visible students" /></th><th>Student</th><th>Grade</th><th>Reading level</th><th>Progress</th><th>Status</th><th>Last activity</th><th>Action</th></tr></thead><tbody>
      {isLoading && Array.from({ length: 5 }, (_, index) => <tr key={index}><td colSpan={8}><div className="teacher-student-skeleton animate-pulse" /></td></tr>)}
      {!isLoading && visible.map((row) => { const student = row.children; const level = row.item?.level ?? 'Beginner'; return <tr key={row.id}><td><input type="checkbox" aria-label={`Select ${student?.name ?? 'student'}`} /></td><td><button type="button" onClick={() => setSelectedStudentId(row.student_id)} className="teacher-student-name"><span>{initials(student?.name)}</span><i><b>{student?.name ?? 'Unknown student'}</b><small>{student?.username ?? 'No username'}</small></i></button></td><td>Grade {student?.grade_level ?? '—'}</td><td><span className={`teacher-level ${level.toLowerCase()}`}>{level}</span></td><td><div className="teacher-progress-inline"><i><u style={{ width: `${row.accuracy}%` }} /></i><b>{row.item?.total_attempts ? `${row.accuracy}%` : '—'}</b></div></td><td><span className={row.needsAttention ? 'teacher-student-status attention' : 'teacher-student-status'}>{row.needsAttention ? <AlertCircle /> : <CheckCircle2 />}{row.needsAttention ? 'Needs attention' : 'Active'}</span></td><td>{shortTime(row.lastActivity)}</td><td><button type="button" className="teacher-more-button" onClick={() => setSelectedStudentId(row.student_id)} aria-label={`Open ${student?.name ?? 'student'} details`}><MoreHorizontal /></button></td></tr>; })}
      {!isLoading && !visible.length && <tr><td colSpan={8} className="teacher-student-empty">No students match these filters.</td></tr>}
    </tbody></table></div><footer><span>Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} students</span><div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft /></button>{Array.from({ length: Math.min(pages, 5) }, (_, index) => <button key={index} type="button" onClick={() => setPage(index + 1)} aria-current={page === index + 1 ? 'page' : undefined}>{index + 1}</button>)}<button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}><ChevronRight /></button></div></footer></section>

    {selected && <div className="teacher-student-modal" role="dialog" aria-modal="true" aria-label="Student details" onMouseDown={() => setSelectedStudentId(null)}><article onMouseDown={(event) => event.stopPropagation()}><header><div><p>Student overview</p><h2>{selected.children?.name ?? 'Student'}</h2><span>Grade {selected.children?.grade_level ?? '—'} · {selected.item?.level ?? 'No reading level'}</span></div><button type="button" onClick={() => setSelectedStudentId(null)} aria-label="Close"><X /></button></header><section className="teacher-modal-metrics"><div><b>{selected.accuracy}%</b><small>Accuracy</small></div><div><b>{selected.item?.activities_completed ?? 0}</b><small>Activities</small></div><div><b>{selected.item?.streak ?? 0}</b><small>Day streak</small></div></section><section><h3>Recent practice</h3>{selectedSessions?.length ? <ul>{selectedSessions.map((session, index) => <li key={`${session.created_at}-${index}`}><span className={session.is_correct ? 'correct' : ''}>{session.is_correct ? <CheckCircle2 /> : <AlertCircle />}</span><div><b>{session.word}</b><small>{shortTime(session.created_at)}</small></div><strong>{session.accuracy_percentage}%</strong></li>)}</ul> : <p>No practice recorded yet.</p>}</section><section><h3>Assignments</h3>{selectedAssignments?.length ? <ul>{selectedAssignments.map((assignment) => <li key={assignment.id}><span><BookOpen /></span><div><b>{assignment.pdf_materials?.title ?? 'PDF material'}</b><small>{assignment.status} {assignment.due_date ? `· Due ${shortTime(assignment.due_date)}` : ''}</small></div></li>)}</ul> : <p>No assignments found for this student.</p>}</section><section><h3>Completed modules</h3><p>{selectedCompleted.length ? `${selectedCompleted.length} completed module${selectedCompleted.length === 1 ? '' : 's'}.` : 'No completed modules recorded yet.'}</p></section><footer><Link to="/teacher/progress-reports">View progress reports <ChevronRight /></Link><Link to="/teacher/lessons?tab=pdf">Assign material <ChevronRight /></Link></footer></article></div>}
  </div>;
}
