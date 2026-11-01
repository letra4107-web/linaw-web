import { useEffect, useId, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth/AuthContext';
import type { TeacherStudentRow } from './MyStudents';

interface Session { word: string; accuracy_percentage: number; is_correct: boolean; created_at: string; }
interface Assignment { id: string; status: string; due_date: string | null; pdf_materials: { title: string } | null; }
interface Module { id: string; title: string; state: 'locked' | 'unlocked' | 'completed'; }
const date = (value: string) => new Intl.DateTimeFormat('fil-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(value));

export function TeacherStudentDetails({ student, onClose, progressUnavailable = false }: { student: TeacherStudentRow; onClose: () => void; progressUnavailable?: boolean }) {
  const { user } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const studentId = student.student_id;
  const sessions = useQuery({ queryKey: ['teacher-student-detail-sessions', user?.id, studentId], queryFn: async () => {
    const { data, error } = await supabase.from('pronunciation_practice_sessions').select('word, accuracy_percentage, is_correct, created_at').eq('student_id', studentId).order('created_at', { ascending: false }).limit(5);
    if (error) throw error;
    return data as Session[];
  } });
  const assignments = useQuery({ queryKey: ['teacher-student-detail-assignments', user?.id, studentId], queryFn: async () => {
    const { data, error } = await supabase.from('pdf_assignments').select('id, status, due_date, pdf_materials(title)').eq('student_id', studentId).order('assigned_at', { ascending: false }).limit(5);
    if (error) throw error;
    return data as unknown as Assignment[];
  } });
  const modules = useQuery({ queryKey: ['teacher-student-detail-modules', user?.id, studentId], queryFn: () => api<{ modules: Module[] }>(`/teacher/students/${studentId}/modules`, { auth: true }) });
  useEffect(() => {
    const element = dialog.current;
    if (!opener.current) opener.current = document.activeElement as HTMLElement;
    element?.showModal();
    return () => { element?.close(); queueMicrotask(() => { if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); }); };
  }, []);
  return <dialog ref={dialog} className="ts-details" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
  }}>
    <header><div><p>STUDENT OVERVIEW</p><h2 id={titleId}>{student.children?.name ?? 'Mag-aaral'}</h2><p>{student.children?.grade_level === 0 ? 'Kindergarten' : `Grade ${student.children?.grade_level ?? '—'}`} · {student.item?.level ?? 'Beginner'}</p></div><button type="button" onClick={onClose} aria-label="Isara ang detalye"><X aria-hidden /></button></header>
    <section className="ts-detail-metrics" aria-label="Student progress summary"><div><b>{progressUnavailable ? '—' : `${student.accuracy}%`}</b><small>Accuracy</small></div><div><b>{progressUnavailable ? '—' : student.item?.activities_completed ?? 0}</b><small>Mga aktibidad</small></div><div><b>{progressUnavailable ? '—' : student.item?.streak ?? 0}</b><small>Araw na streak</small></div></section>
    <section><h3>Kamakailang Pagsasanay</h3>{sessions.isLoading ? <p role="status">Kinukuha ang pagsasanay…</p> : sessions.error ? <div className="ts-detail-error" role="alert"><p>Hindi makuha ang pagsasanay.</p><button type="button" onClick={() => void sessions.refetch()}>Subukan muli</button></div> : sessions.data?.length ? <ul>{sessions.data.map((item, index) => <li key={`${item.created_at}-${index}`}><span>{item.is_correct ? <CheckCircle2 aria-hidden /> : <AlertCircle aria-hidden />}</span><div><b>{item.word}</b><small>{date(item.created_at)}</small></div><strong>{item.accuracy_percentage}%</strong></li>)}</ul> : <p>Wala pang naitalang pagsasanay.</p>}</section>
    <section><h3>Mga Takdang Gawain</h3>{assignments.isLoading ? <p role="status">Kinukuha ang mga gawain…</p> : assignments.error ? <div className="ts-detail-error" role="alert"><p>Hindi makuha ang mga gawain.</p><button type="button" onClick={() => void assignments.refetch()}>Subukan muli</button></div> : assignments.data?.length ? <ul>{assignments.data.map((item) => <li key={item.id}><span><BookOpen aria-hidden /></span><div><b>{item.pdf_materials?.title ?? 'PDF material'}</b><small>{item.status}{item.due_date ? ` · ${date(item.due_date)}` : ''}</small></div></li>)}</ul> : <p>Wala pang nakatalagang gawain.</p>}</section>
    <section><h3>Mga Nakumpletong Modyul</h3>{modules.isLoading ? <p role="status">Kinukuha ang mga modyul…</p> : modules.error ? <div className="ts-detail-error" role="alert"><p>Hindi makuha ang progreso sa modyul.</p><button type="button" onClick={() => void modules.refetch()}>Subukan muli</button></div> : modules.data?.modules?.some((item) => item.state === 'completed') ? <ul>{modules.data.modules.filter((item) => item.state === 'completed').map((item) => <li key={item.id}><CheckCircle2 aria-hidden /><b>{item.title}</b></li>)}</ul> : <p>Wala pang nakumpletong modyul.</p>}</section>
    <footer><Link to="/teacher/progress-reports">Tingnan ang Progress Reports <ArrowRight aria-hidden /></Link><Link to="/teacher/lessons">Gumawa ng Aralin <ArrowRight aria-hidden /></Link></footer>
  </dialog>;
}
