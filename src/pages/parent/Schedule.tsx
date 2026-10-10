import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock3, Heart, List, MoreHorizontal, Plus, Star, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import noActivitiesArt from '../../assets/parent/no activities.png';
import scheduleMotivationArt from '../../assets/parent/current.png';
import reminderFoliage from '../../assets/admin_design/sidebar-foliage-left.png';
import './calendar-reference.css';

interface Child { id: string; name: string; grade_level: number; level: string; }
interface Activity {
  id: string;
  child_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
}
type View = 'Buwan' | 'Linggo' | 'Araw';
const views: View[] = ['Buwan', 'Linggo', 'Araw'];
const weekdayLabels = ['Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab', 'Araw'];
const types = [
  { value: 'reading_lesson', label: 'Module / Lesson', color: 'green', icon: BookOpen },
  { value: 'practice', label: 'Practice', color: 'blue', icon: Star },
  { value: 'reminder', label: 'Assignment / Paalala', color: 'gold', icon: ClipboardList },
  { value: 'appointment', label: 'Reading / Appointment', color: 'violet', icon: CalendarDays },
];
const statuses = [
  { value: 'scheduled', label: 'Nakatakda' },
  { value: 'in_progress', label: 'Ginagawa' },
  { value: 'completed', label: 'Tapos na' },
  { value: 'missed', label: 'Nalampasan' },
];
const emptyForm = { activity_type: 'reading_lesson', title: '', scheduled_date: '', start_time: '', end_time: '', description: '' };
interface SaveSubmission { childId: string; authUid: string; form: Readonly<typeof emptyForm>; }
interface StatusSubmission { id: string; status: string; childId: string; }
const toKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseDate = (key: string) => new Date(`${key.slice(0, 10)}T00:00:00`);
const isDateKey = (key: string | null): key is string => Boolean(key && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(parseDate(key).getTime()) && toKey(parseDate(key)) === key);
const typeFor = (value: string) => types.find((item) => item.value === value) ?? types[0];
const formatDate = (key: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) => parseDate(key).toLocaleDateString('fil-PH', options);
const formatTime = (time: string | null) => time ? new Date(`2000-01-01T${time}`).toLocaleTimeString('fil-PH', { hour: 'numeric', minute: '2-digit' }) : '';
const activityTime = (activity: Activity) => activity.start_time ? `${formatTime(activity.start_time)}${activity.end_time ? ` – ${formatTime(activity.end_time)}` : ''}` : 'Buong araw';

function dateRange(anchor: Date, mode: View) {
  if (mode === 'Araw') return [new Date(anchor)];
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), mode === 'Buwan' ? 1 : anchor.getDate());
  const leading = (start.getDay() + 6) % 7;
  const count = mode === 'Buwan'
    ? Math.ceil((leading + new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()) / 7) * 7
    : 7;
  start.setDate(start.getDate() - leading);
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export default function Schedule() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedDate = searchParams.get('date');
  const initialDate = isDateKey(requestedDate) ? requestedDate : null;
  const [selectedChild, setSelectedChild] = useState(searchParams.get('child') ?? '');
  const [anchor, setAnchor] = useState(() => initialDate ? parseDate(initialDate) : new Date());
  const [mode, setMode] = useState<View>('Buwan');
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [showForm, setShowForm] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [savedNotice, setSavedNotice] = useState('');
  const savePendingRef = useRef(false);
  const updatePendingRef = useRef(false);
  const childrenQuery = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => (await api<{ children: Child[] }>('/parent/children', { auth: true })).children,
    enabled: Boolean(user),
  });
  const children = childrenQuery.data ?? [];
  const activeChild = children.find((child) => child.id === selectedChild) ?? children[0];
  const activeChildId = activeChild?.id ?? '';
  const scheduleQuery = useQuery({
    queryKey: ['parent-schedule', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('scheduled_activities')
        .select('id,child_id,activity_type,title,description,scheduled_date,start_time,end_time,status')
        .order('scheduled_date').order('start_time');
      if (error) throw error;
      return data as Activity[];
    },
    enabled: Boolean(user),
  });
  const save = useMutation({
    mutationFn: async ({ childId, authUid, form: submittedForm }: SaveSubmission) => {
      if (!childId || !authUid || !submittedForm.title.trim() || !isDateKey(submittedForm.scheduled_date)) throw new Error('Kumpletuhin ang anak, pamagat, at petsa.');
      if (submittedForm.end_time && (!submittedForm.start_time || submittedForm.end_time <= submittedForm.start_time)) throw new Error('Ang oras ng pagtatapos ay dapat mas huli sa simula.');
      const { error } = await supabase.from('scheduled_activities').insert({
        ...submittedForm,
        child_id: childId,
        created_by: 'parent',
        created_by_auth_uid: authUid,
        title: submittedForm.title.trim(),
        description: submittedForm.description.trim() || null,
        start_time: submittedForm.start_time || null,
        end_time: submittedForm.end_time || null,
        status: 'scheduled',
      });
      if (error) throw error;
    },
    onSuccess: (_data, submission) => {
      setAnchor(parseDate(submission.form.scheduled_date));
      setSelectedDate(submission.form.scheduled_date);
      setShowForm(false);
      setForm(emptyForm);
      setSavedNotice('Naidagdag na ang aktibidad sa iskedyul.');
      void client.invalidateQueries({ queryKey: ['parent-schedule'] });
    },
    onSettled: () => { savePendingRef.current = false; },
  });
  const update = useMutation({
    mutationFn: async ({ id, status, childId }: StatusSubmission) => {
      const { error } = await supabase.from('scheduled_activities').update({ status })
        .eq('id', id).eq('child_id', childId).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => {
      setSavedNotice('Na-update na ang status ng aktibidad.');
      void client.invalidateQueries({ queryKey: ['parent-schedule'] });
    },
    onSettled: () => { updatePendingRef.current = false; },
  });
  const mutationPending = save.isPending || update.isPending;

  const today = toKey(new Date());
  const days = dateRange(anchor, mode);
  const filtered = (scheduleQuery.data ?? []).filter((item) => item.child_id === activeChildId);
  const events = filtered.reduce<Record<string, Activity[]>>((all, item) => {
    (all[item.scheduled_date.slice(0, 10)] ??= []).push(item);
    return all;
  }, {});
  const visibleKeys = new Set(days.map(toKey));
  const displayedActivities = filtered.filter((item) => {
    const key = item.scheduled_date.slice(0, 10);
    if (selectedDate) return key === selectedDate;
    return mode === 'Buwan' ? key.slice(0, 7) === toKey(anchor).slice(0, 7) : visibleKeys.has(key);
  });
  const upcoming = filtered.filter((item) => {
    if (!['scheduled', 'in_progress'].includes(item.status)) return false;
    const date = item.scheduled_date.slice(0, 10);
    if (date > today) return true;
    if (date !== today) return false;
    return !item.end_time || new Date(`${date}T${item.end_time}`).getTime() >= Date.now();
  });
  const upcomingActivities = showAllUpcoming ? upcoming : upcoming.slice(0, 3);
  const nextScheduled = upcoming[0];
  const detail = filtered.find((item) => item.id === detailId);
  const dateLabel = mode === 'Araw'
    ? formatDate(toKey(anchor), { month: 'long', day: 'numeric', year: 'numeric' })
    : mode === 'Linggo'
      ? `${formatDate(toKey(days[0]), { month: 'short', day: 'numeric' })} – ${formatDate(toKey(days[6]), { month: 'short', day: 'numeric', year: 'numeric' })}`
      : anchor.toLocaleDateString('fil-PH', { month: 'long', year: 'numeric' });
  const progressLink = `/parent/progress${activeChildId ? `?child=${activeChildId}` : ''}`;

  function navigate(direction: number) {
    const next = new Date(anchor);
    if (mode === 'Buwan') next.setFullYear(anchor.getFullYear(), anchor.getMonth() + direction, 1);
    else next.setDate(next.getDate() + direction * (mode === 'Linggo' ? 7 : 1));
    setAnchor(next);
    setSelectedDate(null);
    setDetailId(null);
  }
  function selectDate(key: string) {
    setSelectedDate((value) => value === key ? null : key);
    setAnchor(parseDate(key));
    setDetailId(null);
  }
  function viewActivity(item: Activity) {
    setAnchor(parseDate(item.scheduled_date));
    setSelectedDate(item.scheduled_date.slice(0, 10));
    setDetailId(item.id);
  }
  function openForm() {
    if (savePendingRef.current || updatePendingRef.current || !activeChildId) return;
    save.reset();
    setSavedNotice('');
    setForm({ ...emptyForm, scheduled_date: selectedDate ?? toKey(anchor) });
    setShowForm(true);
  }
  function closeForm() {
    if (savePendingRef.current || updatePendingRef.current) return;
    setShowForm(false);
  }
  function submitForm() {
    if (savePendingRef.current || updatePendingRef.current) return;
    savePendingRef.current = true;
    setSavedNotice('');
    save.mutate({ childId: activeChildId, authUid: user?.id ?? '', form: Object.freeze({ ...form }) });
  }
  function updateStatus(item: Activity, status: string) {
    if (savePendingRef.current || updatePendingRef.current || item.status === status) return;
    updatePendingRef.current = true;
    setSavedNotice('');
    update.mutate({ id: item.id, status, childId: item.child_id });
  }

  return <div className="calendar-reference">
    <header className="calendar-reference-hero">
      <div><p>PLANO NG PAMILYA</p><div className="calendar-hero-heading"><h1>Kalendaryo at Iskedyul</h1><CalendarDays aria-hidden="true" /></div><span>Tingnan ang mga aktibidad, takdang-aralin, at mahahalagang petsa ng inyong anak. Sama-sama tayo sa kanyang pagkatuto!</span></div>
      <aside className="calendar-hero-note" aria-label="Paalala"><Heart size={18} fill="currentColor" aria-hidden="true" /><span>Bawat maliit na hakbang, malaking pag-unlad!</span></aside>
    </header>
    {(childrenQuery.error || scheduleQuery.error) && <p className="calendar-error" role="alert">Hindi makuha ang iskedyul ngayon. {(childrenQuery.error ?? scheduleQuery.error)?.message}<button type="button" onClick={() => { void childrenQuery.refetch(); void scheduleQuery.refetch(); }}>Subukan muli</button></p>}
    <div className="calendar-reference-grid">
      <div className="calendar-reference-left">
        <section className="calendar-board" aria-label="Kalendaryo ng aktibidad">
          <div className="calendar-toolbar">
            <div className="calendar-month-navigation"><button type="button" aria-label={`Nakaraang ${mode.toLowerCase()}`} onClick={() => navigate(-1)}><ChevronLeft size={21} /></button><h2 aria-live="polite">{dateLabel}</h2><button type="button" aria-label={`Susunod na ${mode.toLowerCase()}`} onClick={() => navigate(1)}><ChevronRight size={21} /></button></div>
            <div className="calendar-view-toggle" aria-label="Uri ng kalendaryo">{views.map((item) => <button type="button" aria-pressed={mode === item} className={mode === item ? 'active' : ''} key={item} onClick={() => { setMode(item); setSelectedDate(null); }}>{item === 'Buwan' && <CalendarDays size={16} />}{item}</button>)}</div>
          </div>
          <div className={`calendar-weekdays ${mode === 'Araw' ? 'is-day' : ''}`}>{(mode === 'Araw' ? [formatDate(toKey(anchor), { weekday: 'long' })] : weekdayLabels).map((day) => <b key={day}>{day}</b>)}</div>
          <div className={`calendar-day-grid view-${mode === 'Buwan' ? 'month' : mode === 'Linggo' ? 'week' : 'day'}`}>
            {days.map((date) => {
              const key = toKey(date);
              const inMonth = date.getMonth() === anchor.getMonth();
              const dayEvents = events[key] ?? [];
              const visibleEvents = mode === 'Araw' ? dayEvents : dayEvents.slice(0, 2);
              return <button type="button" key={key} className={`${inMonth ? '' : 'outside'} ${key === today ? 'today' : ''} ${selectedDate === key ? 'selected' : ''}`} aria-label={`${formatDate(key)}${dayEvents.length ? `, ${dayEvents.length} aktibidad` : ''}`} aria-pressed={selectedDate === key} onClick={() => selectDate(key)}>
                <strong>{date.getDate()}</strong>
                {visibleEvents.map((event) => <small className={typeFor(event.activity_type).color} key={event.id} title={`${event.title} · ${activityTime(event)}`}>{mode === 'Araw' && <span>{activityTime(event)} · </span>}{event.title}</small>)}
                {dayEvents.length > visibleEvents.length && <span className="calendar-event-count">+{dayEvents.length - visibleEvents.length} pa</span>}
                {mode === 'Araw' && !dayEvents.length && <span className="calendar-day-empty">Wala pang nakatakdang aktibidad sa araw na ito.</span>}
              </button>;
            })}
          </div>
          <div className="calendar-legend">{types.map((type) => <span key={type.value}><i className={type.color}><type.icon size={13} aria-hidden="true" /></i>{type.label}</span>)}</div>
        </section>
        <section className="calendar-details" aria-labelledby="calendar-details-title">
          <div className="calendar-details-heading"><span><List size={24} /></span><h2 id="calendar-details-title">Mga Detalye ng Aktibidad</h2><button type="button" disabled={!activeChildId || mutationPending} aria-expanded={showForm} onClick={() => showForm ? closeForm() : openForm()}>{showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? 'Isara' : 'Magdagdag'}</button></div>
          {showForm && <form className="calendar-add-form" aria-busy={save.isPending} onSubmit={(event) => { event.preventDefault(); submitForm(); }}>
            <label className="calendar-title-field">Pamagat<input autoFocus maxLength={150} required disabled={mutationPending} value={form.title} placeholder="Pamagat ng aktibidad" onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label>Uri<select disabled={mutationPending} value={form.activity_type} onChange={(event) => setForm({ ...form, activity_type: event.target.value })}>{types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
            <label>Petsa<input type="date" required disabled={mutationPending} value={form.scheduled_date} onChange={(event) => setForm({ ...form, scheduled_date: event.target.value })} /></label>
            <label>Oras ng Simula<input type="time" disabled={mutationPending} value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} /></label>
            <label>Oras ng Pagtatapos<input type="time" disabled={mutationPending} value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></label>
            <label className="calendar-description-field">Mga Detalye <small>(opsyonal)</small><textarea maxLength={1000} rows={2} disabled={mutationPending} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            {save.error && <p className="calendar-error" role="alert">{save.error.message}</p>}
            <div className="calendar-form-actions"><button type="button" disabled={mutationPending} onClick={closeForm}>Kanselahin</button><button type="submit" disabled={mutationPending}>{save.isPending ? 'Sine-save…' : 'I-save ang Aktibidad'}</button></div>
          </form>}
          <div className="calendar-details-filter"><span>{selectedDate ? formatDate(selectedDate, { weekday: 'long', month: 'short', day: 'numeric' }) : mode === 'Buwan' ? dateLabel : `Mga aktibidad sa ${mode.toLowerCase()}`}</span>{selectedDate && <button type="button" onClick={() => { setSelectedDate(null); setDetailId(null); }}>Buong {mode.toLowerCase()} <X size={12} /></button>}</div>
          {savedNotice && <p className="calendar-saved" role="status">{savedNotice}</p>}
          {update.error && <p className="calendar-error" role="alert">Hindi na-update ang status. {update.error.message}</p>}
          <div className="calendar-table">
            <table className="calendar-activity-table"><thead><tr><th>Petsa</th><th>Uri</th><th>Pamagat</th><th>Kategorya</th><th>Status</th><th>Aksyon</th></tr></thead><tbody>
              {displayedActivities.map((item) => { const type = typeFor(item.activity_type); const TypeIcon = type.icon; return <tr key={item.id}><td>{formatDate(item.scheduled_date)}</td><td><span className={`calendar-type-icon ${type.color}`} title={type.label}><TypeIcon size={18} aria-hidden="true" /><span className="sr-only">{type.label}</span></span></td><td><strong>{item.title}</strong></td><td>{type.label}</td><td><select className={`calendar-status status-${item.status}`} aria-label={`Status ng ${item.title}`} disabled={mutationPending} value={item.status} onChange={(event) => updateStatus(item, event.target.value)}>{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></td><td><button type="button" className="calendar-row-details" aria-expanded={detailId === item.id} aria-label={`Tingnan ang detalye ng ${item.title}`} onClick={() => setDetailId(detailId === item.id ? null : item.id)}><MoreHorizontal size={17} /></button></td></tr>; })}
              {!displayedActivities.length && <tr><td colSpan={6}><div className="calendar-no-data"><img src={noActivitiesArt} alt="" /><div><strong>{scheduleQuery.isLoading || childrenQuery.isLoading ? 'Kinukuha ang iyong iskedyul…' : activeChildId ? 'May puwang para sa bagong pagkatuto.' : 'Simulan ang reading journey.'}</strong><p>{activeChildId ? 'Wala pang aktibidad sa panahong ito. Magdagdag ng maikling oras para sa pagbasa o practice.' : 'Mag-enroll muna ng anak upang gumawa ng kanyang iskedyul.'}</p>{activeChildId ? <button type="button" disabled={mutationPending} onClick={openForm}>Magplano ng aktibidad <Plus size={14} /></button> : <Link to="/parent/children">Magdagdag ng Anak <ChevronRight size={14} /></Link>}</div></div></td></tr>}
            </tbody></table>
          </div>
          {detail && <div className="calendar-activity-detail"><button type="button" aria-label="Isara ang detalye" onClick={() => setDetailId(null)}><X size={17} /></button><h3>{detail.title}</h3><p><CalendarDays size={15} />{formatDate(detail.scheduled_date)}<Clock3 size={15} />{activityTime(detail)}</p>{detail.description && <p>{detail.description}</p>}</div>}
        </section>
      </div>
      <aside className="calendar-reference-side">
        <section className="calendar-child-picker"><p>Piliin ang Anak</p><label htmlFor="calendar-child-picker"><i aria-hidden="true"><img src={scheduleMotivationArt} alt="" /><b>{activeChild?.name.charAt(0) ?? 'A'}</b></i><span><strong>{activeChild?.name ?? 'Wala pang naka-enroll'}</strong><small>{activeChild ? `Grade ${activeChild.grade_level} · ${activeChild.level}` : 'Magdagdag ng anak upang magsimula'}</small></span><ChevronDown size={17} aria-hidden="true" /><select id="calendar-child-picker" value={activeChildId} disabled={!children.length || mutationPending} onChange={(event) => { if (savePendingRef.current || updatePendingRef.current) return; setSelectedChild(event.target.value); setDetailId(null); setSavedNotice(''); const next = new URLSearchParams(searchParams); next.set('child', event.target.value); setSearchParams(next, { replace: true }); }}>{!children.length && <option value="">Wala pang anak</option>}{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label></section>
        <section className="calendar-upcoming"><header><h2>Mga Paparating na Aktibidad</h2>{upcoming.length > 3 && <button className="calendar-section-link" type="button" onClick={() => setShowAllUpcoming((value) => !value)}>{showAllUpcoming ? 'Ipakita ang Una' : 'Tingnan Lahat'} <ChevronRight size={13} /></button>}</header><div className="calendar-upcoming-list">{upcomingActivities.map((item) => { const type = typeFor(item.activity_type); const TypeIcon = type.icon; return <button type="button" key={item.id} onClick={() => viewActivity(item)}><time className={type.color}><b>{formatDate(item.scheduled_date, { month: 'short' }).toUpperCase()}</b><strong>{parseDate(item.scheduled_date).getDate()}</strong></time><i className={`calendar-type-icon ${type.color}`}><TypeIcon size={21} /></i><span><b>{item.title}</b><small>{activityTime(item)}</small></span><ChevronRight size={16} aria-hidden="true" /></button>; })}{!upcomingActivities.length && <div className="calendar-upcoming-empty"><CalendarDays size={27} /><strong>Magplano ng susunod na hakbang.</strong><p>Wala pang paparating na aktibidad.</p><button type="button" disabled={!activeChildId || mutationPending} onClick={openForm}>Magdagdag sa iskedyul <Plus size={14} /></button></div>}</div></section>
        <section className="calendar-reminder"><header><span><BellRing size={22} /></span><h2>Mga Paalala</h2><Link className="calendar-section-link" to={progressLink}>Tingnan ang Progreso <ChevronRight size={13} /></Link></header><div className="calendar-reminder-list"><button type="button" disabled={!activeChildId || mutationPending} onClick={() => nextScheduled ? viewActivity(nextScheduled) : openForm()}><i className="blue"><BellRing size={19} /></i><span><b>{nextScheduled ? `Maghanda para sa ${nextScheduled.title}` : 'Maglaan ng oras sa pagbasa'}</b><small>{nextScheduled ? formatDate(nextScheduled.scheduled_date) : 'Magplano ng maikling reading session.'}</small></span></button><button type="button" disabled={!activeChildId || mutationPending} onClick={openForm}><i className="gold"><BellRing size={19} /></i><span><b>Panatilihing updated ang iskedyul</b><small>Magdagdag ng mga susunod na gawain.</small></span></button><Link to={progressLink}><i className="violet"><BellRing size={19} /></i><span><b>Suriin ang progress report</b><small>Alamin ang kanyang mga natapos na aralin.</small></span></Link></div><img className="calendar-reminder-foliage" src={reminderFoliage} alt="" /></section>
        <section className="calendar-motivation" aria-label="Paalala sa pagkatuto"><div><strong>“Ang disiplina ngayon, mas magandang kinabukasan bukas.”</strong><p>Sama-sama tayo sa bawat hakbang ng kanyang pagkatuto.</p></div><img src={scheduleMotivationArt} alt="" /><Heart className="calendar-motivation-heart" size={24} aria-hidden="true" /></section>
      </aside>
    </div>
  </div>;
}
