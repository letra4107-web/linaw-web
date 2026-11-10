import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, BarChart3, BookOpen, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Filter, GraduationCap, MoreHorizontal, Plus, Search, Trophy, UserCheck, UsersRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { TeacherStudentDetails } from './TeacherStudentDetails';
import studentPortraits from '../../assets/parent/home-decorations.png';
import studentsBanner from '../../assets/teacher/students-classroom-banner.png';
import teacherIllustration from '../../assets/teacher/Teacher Illustration.png';
import './students-reference.css';

interface ChildRow { id: string; name: string; grade_level: number; username: string; }
interface RosterRow { id: string; student_id: string; assigned_at: string; children: ChildRow | null; }
interface StudentProgress { badges?: unknown; achievements?: unknown; child_id: string; level: string; accuracy_sum: number; total_attempts: number; activities_completed: number; streak: number; }
export interface TeacherStudentRow extends RosterRow { item?: StudentProgress; accuracy: number; needsAttention: boolean; lastActivity?: string; }
const PAGE_SIZE = 5;
const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat('fil-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(value)) : 'Walang aktibidad';

function SelectionBox({ label, checked, mixed = false, disabled = false, onChange }: { label: string; checked: boolean; mixed?: boolean; disabled?: boolean; onChange: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (input.current) input.current.indeterminate = mixed; }, [mixed]);
  return <input ref={input} type="checkbox" aria-label={label} checked={checked} disabled={disabled} onChange={onChange} />;
}

/** Storybook placeholders, never represented as a learner's uploaded photograph. */
function StudentPortrait({ index }: { index: number }) {
  return <span className={`ts-avatar ts-avatar-${index % 3}`} aria-hidden="true"><svg viewBox={index % 2 ? '660 55 567 548' : '25 30 575 580'} focusable="false"><image href={studentPortraits} width="1254" height="1254" /></svg></span>;
}

export default function MyStudents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [gradeFilter, setGradeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState(() => searchParams.get('search') ?? '');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [onlySelected, setOnlySelected] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { data: teacherProfile } = useQuery({ queryKey: ['teacher-profile', user?.id], queryFn: async () => {
    const { data, error } = await supabase.from('teacher_profiles').select('grade_levels').eq('user_id', user!.id).maybeSingle();
    if (error) throw error;
    return data as { grade_levels: number[] } | null;
  }, enabled: Boolean(user) });
  const rosterQuery = useQuery({ queryKey: ['teacher-roster', user?.id], queryFn: async () => {
    const { data, error } = await supabase.from('teacher_student_links').select('id, student_id, assigned_at, children(id, name, grade_level, username)').eq('teacher_id', user!.id).order('assigned_at', { ascending: false });
    if (error) throw error;
    return data as unknown as RosterRow[];
  }, enabled: Boolean(user) });
  const rosterIds = (rosterQuery.data ?? []).map((row) => row.student_id);
  const progressQuery = useQuery({ queryKey: ['teacher-students-progress', user?.id, rosterIds], queryFn: async () => {
    const { data, error } = await supabase.from('child_progress').select('child_id, level, accuracy_sum, total_attempts, activities_completed, streak, achievements').in('child_id', rosterIds);
    if (error) throw error;
    return data as StudentProgress[];
  }, enabled: rosterIds.length > 0 });
  const recentQuery = useQuery({ queryKey: ['teacher-roster-recent', user?.id, rosterIds], queryFn: async () => {
    const result: { student_id: string; created_at: string }[] = [];
    for (let start = 0; ; start += 500) {
      const { data, error } = await supabase.from('pronunciation_practice_sessions').select('student_id, created_at').in('student_id', rosterIds).order('created_at', { ascending: false }).order('id', { ascending: false }).range(start, start + 499);
      if (error) throw error;
      result.push(...data);
      if (data.length < 500 || rosterIds.every((id) => result.some((row) => row.student_id === id))) return result;
    }
  }, enabled: rosterIds.length > 0 });
  const studentRows: TeacherStudentRow[] = useMemo(() => (rosterQuery.data ?? []).map((row) => {
    const item = progressQuery.data?.find((entry) => entry.child_id === row.student_id);
    const accuracy = item?.total_attempts ? Math.round(item.accuracy_sum / item.total_attempts) : 0;
    return { ...row, item, accuracy, needsAttention: Boolean(item?.total_attempts && accuracy < 70), lastActivity: recentQuery.data?.find((entry) => entry.student_id === row.student_id)?.created_at };
  }), [rosterQuery.data, progressQuery.data, recentQuery.data]);
  const validSelected = selectedIds.filter((id) => rosterIds.includes(id));
  const normalized = query.trim().toLowerCase();
  const filtered = studentRows.filter((row) => (gradeFilter === 'all' || String(row.children?.grade_level) === gradeFilter)
    && (levelFilter === 'all' || (row.item?.level ?? 'Beginner').toLowerCase() === levelFilter)
    && (statusFilter === 'all' || (statusFilter === 'attention' ? row.needsAttention : !row.needsAttention))
    && (!normalized || [row.children?.name, row.children?.username, row.student_id].some((value) => value?.toLowerCase().includes(normalized)))
    && (!onlySelected || validSelected.includes(row.student_id)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = studentRows.find((row) => row.student_id === selectedStudentId);
  const gradeLevels = [...new Set([...(teacherProfile?.grade_levels ?? []), ...studentRows.flatMap((row) => row.children ? [row.children.grade_level] : [])])].sort((a, b) => a - b);
  const levels = [...new Set(['Beginner', 'Intermediate', 'Advanced', ...studentRows.flatMap((row) => row.item?.level ? [row.item.level] : [])])];
  const dataError = rosterQuery.error || progressQuery.error;
  const pending = rosterQuery.isLoading || progressQuery.isLoading;
  const allChecked = visible.length > 0 && visible.every((row) => validSelected.includes(row.student_id));
  const mixed = !allChecked && visible.some((row) => validSelected.includes(row.student_id));
  const pageStart = Math.max(1, Math.min(currentPage - 2, pages - 4));
  const count = (value: number, progress = false) => rosterQuery.error || (progress && progressQuery.error) ? '—' : rosterQuery.isLoading || (progress && progressQuery.isLoading) ? '…' : value;
  const metrics = [
    { Icon: UsersRound, value: count(studentRows.length), title: 'Total students', detail: 'Students in your roster', tone: 'purple', action: () => { setStatusFilter('all'); setGradeFilter('all'); setLevelFilter('all'); setQuery(''); setOnlySelected(false); }, decoration: UsersRound },
    { Icon: UserCheck, value: count(studentRows.filter((row) => !row.needsAttention).length, true), title: 'Active students', detail: 'Currently participating', tone: 'green', action: () => setStatusFilter('active'), decoration: UserCheck },
    { Icon: BarChart3, value: count(studentRows.filter((row) => row.needsAttention).length, true), title: 'Needs attention', detail: 'Below 70% accuracy', tone: 'gold', action: () => setStatusFilter('attention'), decoration: AlertTriangle },
    { Icon: GraduationCap, value: count(studentRows.reduce((sum, row) => sum + (row.item?.activities_completed ?? 0), 0), true), title: 'Completed activities', detail: 'Recorded across the roster', tone: 'pink', action: () => navigate('/teacher/progress-reports'), decoration: Trophy },
  ];

  return <div className="teacher-students-design">
    <header className="ts-hero"><img src={studentsBanner} className="ts-hero-art" alt="" aria-hidden="true" /><img className="ts-hero-teacher" src={teacherIllustration} alt="" aria-hidden="true" /><svg className="ts-hero-children" viewBox="1325 225 847 499" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false"><image href={studentsBanner} width="2172" height="724" /></svg><div className="ts-hero-copy"><p>AKING MGA MAG-AARAL</p><h1>Our <span>students</span> <UsersRound aria-hidden /></h1><p>Manage, monitor, and support the learning progress<br className="ts-wide-break" /> of every student.</p></div><blockquote>“Bawat mag-aaral ay may natatanging kakayahan.<br /> Sama-sama tayong gumawa ng mas maliwanag na bukas!”<span aria-hidden>♥</span></blockquote></header>
    <QueryErrorNotice error={dataError || recentQuery.error} onRetry={() => { void rosterQuery.refetch(); if (rosterIds.length) { void progressQuery.refetch(); void recentQuery.refetch(); } }} />
    <section className="ts-metrics" aria-label="Buod ng mga mag-aaral">{metrics.map(({ Icon, value, title, detail, tone, action, decoration: Decoration }) => <button type="button" className={`ts-metric ${tone}`} key={title} onClick={() => { action(); setPage(1); document.getElementById('ts-student-list')?.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }} disabled={pending || Boolean(dataError) || !studentRows.length}><span className="ts-metric-icon"><Icon aria-hidden /></span><span className="ts-metric-copy"><b>{value}</b><strong>{title}</strong><small>{detail}</small></span><ChevronRight className="ts-metric-chevron" aria-hidden /><Decoration className="ts-metric-decoration" aria-hidden /></button>)}</section>
    <section className="ts-filters" aria-label="Hanapin at i-filter ang mga mag-aaral">
      <label className="ts-search"><Search aria-hidden /><span className="sr-only">Maghanap ng mag-aaral</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Maghanap ng mag-aaral (pangalan, username, o ID)..." /></label>
      <label><GraduationCap aria-hidden /><span className="sr-only">Baitang</span><select aria-label="Baitang" value={gradeFilter} onChange={(event) => { setGradeFilter(event.target.value); setPage(1); }}><option value="all">Lahat ng Baitang</option>{gradeLevels.map((grade) => <option key={grade} value={grade}>{grade === 0 ? 'Kindergarten' : `Grade ${grade}`}</option>)}</select></label>
      <label><BookOpen aria-hidden /><span className="sr-only">Reading Level</span><select aria-label="Reading Level" value={levelFilter} onChange={(event) => { setLevelFilter(event.target.value); setPage(1); }}><option value="all">Lahat ng Reading Level</option>{levels.map((level) => <option key={level} value={level.toLowerCase()}>{level}</option>)}</select></label>
      <label><Filter aria-hidden /><span className="sr-only">Status</span><select aria-label="Status" value={statusFilter} disabled={Boolean(progressQuery.error)} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">Lahat ng Status</option><option value="active">Active</option><option value="attention">Needs attention</option></select></label>
      <Link className="ts-add" to="/teacher/lessons"><Plus aria-hidden /> Gumawa ng Aralin</Link>
    </section>
    {validSelected.length > 0 && <div className="ts-selection" role="status"><span>{validSelected.length} mag-aaral ang napili</span><button type="button" onClick={() => { setOnlySelected((value) => !value); setPage(1); }} aria-pressed={onlySelected}>{onlySelected ? 'Ipakita ang lahat' : 'Tingnan ang napili'}</button><button type="button" onClick={() => { setSelectedIds([]); setOnlySelected(false); }}>Alisin ang pagpili <X aria-hidden /></button></div>}
    <section id="ts-student-list" className="ts-table-card" aria-label="Listahan ng mga mag-aaral">
      <div className="ts-table-scroll" tabIndex={0} role="region" aria-label="Student roster table"><table><thead><tr><th scope="col"><SelectionBox label="Piliin ang lahat sa pahinang ito" checked={allChecked} mixed={mixed} disabled={!visible.length || rosterQuery.isLoading} onChange={() => setSelectedIds((ids) => allChecked ? ids.filter((id) => !visible.some((row) => row.student_id === id)) : [...new Set([...ids, ...visible.map((row) => row.student_id)])])} /></th><th scope="col">Mag-aaral</th><th scope="col">Baitang</th><th scope="col">Reading Level</th><th scope="col" title="Accuracy mula sa reading practice">Progreso</th><th scope="col">Status</th><th scope="col">Huling Aktibidad</th><th scope="col">Aksyon</th></tr></thead><tbody>
        {rosterQuery.isLoading ? <tr><td colSpan={8} className="ts-state" role="status">Kinukuha ang mga mag-aaral…</td></tr> : rosterQuery.error ? <tr><td colSpan={8} className="ts-state">Hindi makuha ang roster. Subukan muli sa itaas.</td></tr> : visible.map((row) => { const student = row.children, level = row.item?.level ?? 'Beginner'; const rowIndex = studentRows.findIndex((item) => item.student_id === row.student_id); return <tr key={row.id} className={validSelected.includes(row.student_id) ? 'is-selected' : ''}><td><SelectionBox label={`Piliin si ${student?.name ?? 'mag-aaral'}`} checked={validSelected.includes(row.student_id)} onChange={() => setSelectedIds((ids) => ids.includes(row.student_id) ? ids.filter((id) => id !== row.student_id) : [...ids, row.student_id])} /></td><td><button type="button" className="ts-student" onClick={() => setSelectedStudentId(row.student_id)}><StudentPortrait index={rowIndex} /><span><b>{student?.name ?? 'Mag-aaral'}</b><small title={student?.username}>{student?.username ?? 'Walang username'}</small></span></button></td><td>{student ? student.grade_level === 0 ? 'Kindergarten' : `Grade ${student.grade_level}` : '—'}</td><td><span className={`ts-level ${level.toLowerCase().replace(/[^a-z]/g, '')}`}><BookOpen aria-hidden />{progressQuery.error ? '—' : level}</span></td><td><div className="ts-progress" aria-label={progressQuery.error ? 'Hindi makuha ang accuracy' : `${row.accuracy}% reading accuracy`}><span><i style={{ width: `${progressQuery.error ? 0 : Math.max(0, Math.min(100, row.accuracy))}%` }} /></span><b>{progressQuery.error ? '—' : `${row.accuracy}%`}</b></div></td><td>{progressQuery.error ? '—' : <span className={`ts-status ${row.needsAttention ? 'attention' : ''}`}>{row.needsAttention ? <AlertTriangle aria-hidden /> : <CheckCircle2 aria-hidden />}{row.needsAttention ? 'Needs attention' : 'Active'}</span>}</td><td><span className="ts-last-activity"><CalendarDays aria-hidden />{recentQuery.error ? 'Hindi makuha' : <time dateTime={row.lastActivity}>{dateLabel(row.lastActivity)}</time>}</span></td><td><button type="button" className="ts-more" onClick={() => setSelectedStudentId(row.student_id)} aria-label={`Tingnan ang detalye ni ${student?.name ?? 'mag-aaral'}`}><MoreHorizontal aria-hidden /></button></td></tr>; })}
        {!rosterQuery.isLoading && !rosterQuery.error && !visible.length && <tr><td colSpan={8} className="ts-state"><UsersRound aria-hidden /><strong>{studentRows.length ? 'Walang tugmang mag-aaral' : 'Wala pang mag-aaral sa iyong roster'}</strong><p>{studentRows.length ? 'Subukang baguhin ang search o mga filter.' : 'Makikita rito ang mga mag-aaral na naka-assign sa iyong klase.'}</p>{studentRows.length > 0 && <button type="button" onClick={() => { setQuery(''); setGradeFilter('all'); setLevelFilter('all'); setStatusFilter('all'); setOnlySelected(false); setPage(1); }}>I-reset ang mga filter</button>}</td></tr>}
      </tbody></table></div>
      <footer className="ts-pagination"><p>Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} students</p><nav aria-label="Mga pahina ng mag-aaral"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Nakaraang pahina"><ChevronLeft aria-hidden /></button>{Array.from({ length: Math.min(pages, 5) }, (_, index) => pageStart + index).map((number) => <button type="button" key={number} aria-label={`Pahina ${number}`} aria-current={currentPage === number ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}<button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} aria-label="Susunod na pahina"><ChevronRight aria-hidden /></button></nav></footer>
    </section>
    {selected && <TeacherStudentDetails key={selected.student_id} student={selected} progressUnavailable={Boolean(progressQuery.error)} onClose={() => setSelectedStudentId(null)} />}
  </div>;
}
