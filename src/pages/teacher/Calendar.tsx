import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, UsersRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { tagalogError } from '../../lib/validationMessages';
import { calendarDateLabel, calendarMonthDays, shiftCalendarMonth } from './teacherCalendarDates';
import classroom from '../../assets/illustrations/owl-world/classroom-banner.png';
import teacher from '../../assets/illustrations/role-themes/teacher-guide.png';
import './calendar.css';

type Student = { id: string; name: string; grade_level: number };
type Activity = { id: string; child_id: string; title: string; scheduled_date: string; start_time: string | null; end_time: string | null; description: string | null; activity_type: string; status: string; created_by: string; created_by_auth_uid: string | null; revision: number };
type CalendarData = { students: Student[]; activities: Activity[] };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const empty = () => ({ id: String(crypto.randomUUID()), child_id: '', title: '', scheduled_date: today(), start_time: '', end_time: '', description: '', activity_type: 'reading_lesson' });
const types = [['reading_lesson', 'Aralin'], ['practice', 'Pagsasanay'], ['reminder', 'Paalala / Takdang-aralin'], ['appointment', 'Pagpupulong']];
const fullDate = (date: string) => calendarDateLabel(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export default function TeacherCalendar() {
  const { user } = useAuth();
  const client = useQueryClient(), busy = useRef(false), dialog = useRef<HTMLDialogElement>(null);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today());
  const [studentId, setStudentId] = useState('');
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['teacher-calendar', user?.id], enabled: Boolean(user), refetchInterval: 15000,
    queryFn: async () => { const { data, error } = await supabase.rpc('get_teacher_calendar'); if (error) throw error; return data as CalendarData; },
  });
  const change = useMutation({
    meta: { saveFeedback: 'Na-save ang iskedyul. May abiso na ang magulang na tingnan ang Kalendaryo.' },
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('save_teacher_calendar', { p_id: form.id, p_child: form.child_id, p_title: form.title.trim(), p_date: form.scheduled_date, p_start: form.start_time || null, p_end: form.end_time || null, p_type: form.activity_type, p_description: form.description.trim() || null, p_revision: editing?.revision ?? null });
      if (error) throw error; return data;
    },
    onSuccess: async () => { setOpen(false); setEditing(null); setMonth(form.scheduled_date.slice(0, 7)); setSelectedDate(form.scheduled_date); await client.invalidateQueries({ queryKey: ['teacher-calendar'] }); },
    onSettled: () => { busy.current = false; },
  });
  const remove = useMutation({
    meta: { saveFeedback: 'Kinansela ang iskedyul. Naabisuhan ang magulang.' },
    mutationFn: async (item: Activity) => { const { error } = await supabase.rpc('delete_teacher_calendar', { p_id: item.id, p_revision: item.revision }); if (error) throw error; },
    onSuccess: () => client.invalidateQueries({ queryKey: ['teacher-calendar'] }),
    onSettled: () => { busy.current = false; },
  });
  const pending = change.isPending || remove.isPending;
  const students = query.data?.students ?? [];
  const canCreate = !query.isLoading && !query.error && students.length > 0 && !pending;
  const visible = (query.data?.activities ?? []).filter(item => item.scheduled_date.startsWith(month) && (!studentId || studentId === item.child_id))
    .sort((a, b) => (a.scheduled_date + (a.start_time ?? '')).localeCompare(b.scheduled_date + (b.start_time ?? '')) || a.title.localeCompare(b.title));
  const selectedActivities = visible.filter(item => item.scheduled_date === selectedDate);
  const dirty = !editing || form.title.trim() !== editing.title || form.scheduled_date !== editing.scheduled_date || form.start_time !== (editing.start_time ?? '').slice(0, 5) || form.end_time !== (editing.end_time ?? '').slice(0, 5) || form.description.trim() !== (editing.description ?? '') || form.activity_type !== editing.activity_type;
  const invalidTime = Boolean(form.start_time && form.end_time && form.end_time <= form.start_time);
  const start = () => { change.reset(); setEditing(null); setForm({ ...empty(), scheduled_date: selectedDate, child_id: studentId || students[0]?.id || '' }); setOpen(true); };
  const edit = (item: Activity) => { change.reset(); setEditing(item); setForm({ id: item.id, child_id: item.child_id, title: item.title, scheduled_date: item.scheduled_date, start_time: (item.start_time ?? '').slice(0, 5), end_time: (item.end_time ?? '').slice(0, 5), description: item.description ?? '', activity_type: item.activity_type }); setOpen(true); };
  const chooseMonth = (value: string) => { if (!/^\d{4}-\d{2}$/.test(value) || value < '1900-01' || value > '2200-12') return; setMonth(value); setSelectedDate(value === today().slice(0, 7) ? today() : value + '-01'); };
  const selectDate = (date: string) => { setSelectedDate(date); if (!date.startsWith(month)) setMonth(date.slice(0, 7)); };
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current; element.showModal();
    return () => { if (element.open) element.close(); };
  }, [open]);
  const monthLabel = calendarDateLabel(month + '-01', { month: 'long', year: 'numeric' });

  return <div className="teacher-calendar">
    <header className="teacher-calendar-hero">
      <img className="teacher-calendar-background" src={classroom} alt="" aria-hidden="true" />
      <div className="teacher-calendar-hero-copy"><p>ISKEDYUL NG KLASE</p><h1>Kalendaryo <CalendarDays aria-hidden="true" /></h1><p>Ayusin ang mga aralin, pagsasanay, at pagpupulong. Makikita rin ng magulang ang mga iskedyul ng kanilang anak.</p></div>
      <img className="teacher-calendar-guide" src={teacher} alt="" aria-hidden="true" />
      <span className="teacher-calendar-hero-note"><Clock3 aria-hidden="true" />Oras sa Pilipinas</span>
    </header>

    {query.error && <div className="teacher-calendar-error" role="alert"><p>Hindi makuha ang iskedyul. Subukan muli.</p><button type="button" onClick={() => void query.refetch()}>Subukan muli</button></div>}
    {!query.isLoading && !query.error && !students.length && <p className="teacher-calendar-notice">Mag-link muna ng mag-aaral sa Mga Mag-aaral upang makapagtakda ng iskedyul.</p>}

    <section className="teacher-calendar-toolbar" aria-label="Mga filter ng kalendaryo">
      <label>Mag-aaral<select value={studentId} onChange={event => setStudentId(event.target.value)}><option value="">Lahat ng mag-aaral</option>{students.map(student => <option value={student.id} key={student.id}>{student.name} · Grade {student.grade_level}</option>)}</select></label>
      <label>Buwan<input aria-label="Buwan ng iskedyul" type="month" min="1900-01" max="2200-12" required value={month} onChange={event => chooseMonth(event.target.value)} /></label>
      <button className="teacher-calendar-primary" type="button" onClick={start} disabled={!canCreate}><Plus aria-hidden="true" />Magdagdag ng Iskedyul</button>
    </section>

    <div className="teacher-calendar-workspace">
      <section className="teacher-calendar-month" aria-labelledby="teacher-calendar-month-title" aria-busy={query.isLoading}>
        <div className="teacher-calendar-month-heading"><div><p>BUWANANG ISKEDYUL</p><h2 id="teacher-calendar-month-title" aria-live="polite">{monthLabel}</h2></div><div className="teacher-calendar-navigation"><button type="button" className="teacher-calendar-icon" aria-label="Naunang buwan" disabled={month === '1900-01'} onClick={() => chooseMonth(shiftCalendarMonth(month, -1))}><ChevronLeft aria-hidden="true" /></button><button type="button" onClick={() => { setMonth(today().slice(0, 7)); setSelectedDate(today()); }}>Ngayon</button><button type="button" className="teacher-calendar-icon" aria-label="Susunod na buwan" disabled={month === '2200-12'} onClick={() => chooseMonth(shiftCalendarMonth(month, 1))}><ChevronRight aria-hidden="true" /></button></div></div>
        <div className="teacher-calendar-weekdays" aria-hidden="true">{['Lin', 'Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="teacher-calendar-days" role="group" aria-label={monthLabel}>
          {calendarMonthDays(month).map(date => {
            const activities = (query.data?.activities ?? []).filter(item => item.scheduled_date === date && (!studentId || item.child_id === studentId));
            return <button key={date} type="button" className={['teacher-calendar-day', !date.startsWith(month) ? 'outside' : '', date === today() ? 'today' : '', date === selectedDate ? 'selected' : ''].join(' ')} aria-label={fullDate(date) + (activities.length ? ', ' + activities.length + ' iskedyul' : '')} aria-pressed={date === selectedDate} aria-current={date === today() ? 'date' : undefined} onClick={() => selectDate(date)}><span className="teacher-calendar-day-number">{Number(date.slice(-2))}</span><span className="teacher-calendar-day-events" aria-hidden="true">{activities.slice(0, 2).map(item => <span className={'teacher-calendar-event ' + item.activity_type} key={item.id}>{item.title}</span>)}{activities.length > 2 && <small>+{activities.length - 2} pa</small>}</span>{activities.length > 0 && <span className="teacher-calendar-day-count" aria-hidden="true">{activities.length}</span>}</button>;
          })}
        </div>
        <footer className="teacher-calendar-month-footer"><span><i className="reading_lesson" />Aralin</span><span><i className="practice" />Pagsasanay</span><span><i className="reminder" />Paalala</span><span><i className="appointment" />Pagpupulong</span><p>{visible.length} iskedyul sa buwang ito</p></footer>
      </section>

      <section className="teacher-calendar-agenda" aria-labelledby="teacher-calendar-agenda-title">
        <header><span className="teacher-calendar-agenda-icon"><CalendarDays aria-hidden="true" /></span><div><p>NAPILING ARAW</p><h2 id="teacher-calendar-agenda-title">{calendarDateLabel(selectedDate, { month: 'long', day: 'numeric' })}</h2><small>{calendarDateLabel(selectedDate, { weekday: 'long', year: 'numeric' })}</small></div><b>{selectedActivities.length}</b></header>
        {query.isLoading ? <p role="status" className="teacher-calendar-empty">Kinukuha ang iskedyul…</p> : query.error ? <p className="teacher-calendar-empty">Hindi pa makuha ang mga iskedyul para sa araw na ito.</p> : selectedActivities.length ? <div className="teacher-calendar-list">{selectedActivities.map(item => <article className={item.activity_type} key={item.id}>
          <span className="teacher-calendar-type">{types.find(([type]) => type === item.activity_type)?.[1] ?? 'Iskedyul'}</span>
          <h3>{item.title}</h3><time dateTime={item.scheduled_date}><Clock3 aria-hidden="true" />{item.start_time ? item.start_time.slice(0, 5) + (item.end_time ? ' – ' + item.end_time.slice(0, 5) : '') : 'Buong araw'}</time>
          <p className="teacher-calendar-student"><UsersRound aria-hidden="true" />{students.find(student => student.id === item.child_id)?.name ?? 'Mag-aaral'}</p>
          {item.description && <p>{item.description}</p>}<small>{item.created_by === 'parent' ? 'Personal na paalala ng magulang' : item.created_by === 'teacher' ? 'Mula sa guro' : 'Paalala ng system'}</small>
          {item.created_by === 'teacher' && item.created_by_auth_uid === user?.id && <footer><button type="button" disabled={pending} onClick={() => edit(item)}>I-edit</button><button className="teacher-calendar-cancel" type="button" disabled={pending} onClick={() => { if (!busy.current && window.confirm('Kanselahin ang iskedyul na ito? Aabisuhan ang magulang.')) { busy.current = true; remove.mutate(item); } }}>Kanselahin</button></footer>}
        </article>)}</div> : <div className="teacher-calendar-empty"><CalendarDays aria-hidden="true" /><h3>Maluwag pa ang araw na ito</h3><p>Walang iskedyul sa napiling araw at mag-aaral.</p><button type="button" onClick={start} disabled={!canCreate}><Plus aria-hidden="true" />Magdagdag ng Iskedyul</button></div>}
        <p className="teacher-calendar-parent-note">Ang mga iskedyul mula sa guro ay makikita rin ng naka-link na magulang.</p>
        {remove.error && <p role="alert">{tagalogError(remove.error)}</p>}
      </section>
    </div>

    {open && <dialog ref={dialog} className="teacher-calendar-dialog" aria-labelledby="teacher-calendar-form-title" onCancel={event => { if (pending) event.preventDefault(); else setOpen(false); }}>
      <form className="teacher-calendar-form" onSubmit={event => { event.preventDefault(); if (busy.current || !dirty || invalidTime) return; busy.current = true; change.mutate(); }}>
        <header><div><p>KALENDARYO NG GURO</p><h2 id="teacher-calendar-form-title">{editing ? 'I-edit ang Iskedyul' : 'Bagong Iskedyul'}</h2></div><button type="button" className="teacher-calendar-icon" disabled={pending} aria-label="Isara ang form" onClick={() => setOpen(false)}><X aria-hidden="true" /></button></header>
        <label>Mag-aaral<select required value={form.child_id} disabled={pending || Boolean(editing)} onChange={event => setForm({ ...form, child_id: event.target.value })}><option value="">Pumili ng mag-aaral</option>{students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
        <label>Pamagat<input autoFocus required maxLength={150} value={form.title} disabled={pending} placeholder="Hal. Pagsasanay sa pagbasa" onChange={event => setForm({ ...form, title: event.target.value })} /></label>
        <label>Uri<select value={form.activity_type} disabled={pending} onChange={event => setForm({ ...form, activity_type: event.target.value })}>{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Petsa<input type="date" required min="1900-01-01" max="2200-12-31" value={form.scheduled_date} disabled={pending} onChange={event => setForm({ ...form, scheduled_date: event.target.value })} /></label>
        <label>Oras ng Simula (opsyonal)<input type="time" value={form.start_time} disabled={pending} onChange={event => setForm({ ...form, start_time: event.target.value })} /></label>
        <label>Oras ng Pagtatapos (opsyonal)<input type="time" value={form.end_time} disabled={pending} aria-invalid={invalidTime || undefined} aria-describedby={invalidTime ? 'teacher-calendar-time-error' : undefined} onChange={event => setForm({ ...form, end_time: event.target.value })} /></label>
        {invalidTime && <p className="full" id="teacher-calendar-time-error" role="alert">Dapat mas huli ang oras ng pagtatapos kaysa sa simula.</p>}
        <label className="full">Mga Detalye (opsyonal)<textarea maxLength={1000} rows={3} value={form.description} disabled={pending} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
        <p className="full teacher-calendar-form-note">Lahat ng oras ay oras sa Pilipinas. Makikita ng magulang ang iskedyul; guro lamang ang makakapag-edit nito.</p>
        {change.error && <p className="full" role="alert">{tagalogError(change.error)}</p>}
        <footer className="full"><button type="button" disabled={pending} onClick={() => setOpen(false)}>Bumalik</button><button className="teacher-calendar-primary" disabled={pending || !dirty || invalidTime || !form.title.trim() || !form.child_id || !form.scheduled_date} type="submit">{change.isPending ? 'Sine-save…' : 'I-save at Abisuhan ang Magulang'}</button></footer>
      </form>
    </dialog>}
  </div>;
}
