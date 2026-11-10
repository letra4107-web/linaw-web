import {showFormFeedback} from '../../lib/formFeedback';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { HOMEWORK_ACCEPT, HOMEWORK_STATUS, homeworkError, homeworkFileType, homeworkFileUrl, listHomework, uploadHomeworkFile, type Homework, type HomeworkStudent, type HomeworkWork } from '../../lib/homework';
import '../../components/student/homework.css';

function Review({ assignment, onBack }: { assignment: Homework; onBack: () => void }) {
  const [busy, setBusy] = useState(false); const inFlight = useRef(false);
  const [error, setError] = useState(''); const [feedback, setFeedback] = useState<Record<string, string>>({});
  const { data, isPending, error: loadError, refetch } = useQuery({ queryKey: ['homework-work', assignment.id], queryFn: async () => {
    const result = await supabase.rpc('get_homework_submissions', { p_assignment_id: assignment.id }); if (result.error) throw result.error; return result.data as HomeworkWork[];
  } });
  async function review(row: HomeworkWork, returned: boolean) {
    if (!row.submission || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try { const result = await supabase.rpc('review_homework_answer', { p_submission_id: row.submission.id, p_revision: row.submission.revision, p_feedback: feedback[row.student_id] ?? row.submission.feedback, p_return: returned }); if (result.error) throw result.error; showFormFeedback('Na-save ang pagbabago.'); await refetch(); }
    catch (error) { setError(homeworkError(error));showFormFeedback(homeworkError(error),false); } finally { inFlight.current = false; setBusy(false); }
  }
  async function open(path: string) {
    const popup = window.open('about:blank', '_blank');
    try { const url = await homeworkFileUrl(supabase, path); if (!popup) throw new Error('Hindi mabuksan ang file. Payagan muna ang pop-up.'); popup.opener = null; popup.location.replace(url); }
    catch (error) { popup?.close(); setError(homeworkError(error)); }
  }
  return <section className="hw-detail"><button type="button" className="hw-secondary" disabled={busy} onClick={onBack}>Bumalik sa Takdang-Aralin</button><header><h2>{assignment.title}</h2><p>Mga ipinasa ng mag-aaral · {data?.filter(row => row.submission).length ?? 0}/{data?.length ?? 0}</p></header>
    <p className="hw-instructions">{assignment.instructions}</p>{assignment.file_path && <button className="hw-secondary" type="button" onClick={() => void open(assignment.file_path!)}>Buksan ang kalakip na gawain</button>}
    <button type="button" className="hw-secondary" disabled={busy} onClick={() => void refetch()}>I-refresh ang mga Sagot</button>
    {isPending && <p role="status">Kinukuha ang mga sagot...</p>}{(loadError || error) && <p role="alert" className="hw-error">{error || homeworkError(loadError)}</p>}
    {!isPending && !data?.length && <p>Walang nakatalagang mag-aaral.</p>}
    {data?.map(row => <article className="hw-card" key={row.student_id}><header className="hw-heading"><h3>{row.name}</h3><span className="hw-status">{row.submission ? HOMEWORK_STATUS[row.submission.status] : 'Hindi pa naipapasa'}</span></header>
      {row.submission && <><p>{row.submission.submitted_at && new Date(row.submission.submitted_at).toLocaleString('fil-PH')}{assignment.due_at && row.submission.submitted_at && new Date(row.submission.submitted_at) > new Date(assignment.due_at) ? ' · Naipasa matapos ang takdang araw' : ''}</p><p className="hw-instructions">{row.submission.answer_text || 'Kalakip na file ang sagot.'}</p>{row.submission.file_path && <button type="button" className="hw-secondary" onClick={() => void open(row.submission!.file_path!)}>Buksan: {row.submission.file_name}</button>}
        <label>Puna para kay {row.name}<textarea aria-label={`Puna para kay ${row.name}`} rows={3} maxLength={4000} disabled={busy || row.submission.status === 'returned'} value={feedback[row.student_id] ?? row.submission.feedback} onChange={event => setFeedback({ ...feedback, [row.student_id]: event.target.value })} /></label>
        {row.submission.status !== 'returned' && <div className="hw-actions"><button type="button" className="hw-secondary" disabled={busy} onClick={() => void review(row, true)}>Ibalik para Baguhin</button><button type="button" className="hw-primary" disabled={busy} onClick={() => void review(row, false)}>Markahang Nasuri</button></div>}
      </>}
    </article>)}
  </section>;
}
export function TeacherHomework() {
  const { user } = useAuth(); const cache = useQueryClient();
  const [selected, setSelected] = useState<Homework | null>(null); const [title, setTitle] = useState(''); const [instructions, setInstructions] = useState('');
  const [grade, setGrade] = useState(''); const [due, setDue] = useState(''); const [recipients, setRecipients] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null); const [uploaded, setUploaded] = useState<{ file_path: string; file_name: string } | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID()); const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const inFlight = useRef(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const { data, isPending, error: loadError, refetch } = useQuery({ queryKey: ['teacher-homework', user?.id], enabled: !!user, queryFn: async () => {
    const roster = await supabase.rpc('get_homework_roster'); if (roster.error) throw roster.error;
    return { assignments: await listHomework(supabase), roster: roster.data as HomeworkStudent[] };
  } });
  const roster = (data?.roster || []).filter(student => String(student.grade_level) === grade);
  async function create(event: React.FormEvent) {
    event.preventDefault(); if (inFlight.current) return;
    setError(''); setNotice('');
    if (!recipients.length) { setError('Pumili muna ng mga mag-aaral na bibigyan ng takdang-aralin.'); return; }
    inFlight.current = true; setBusy(true);
    try {
      let attachment = uploaded;
      if (file && !attachment) { attachment = await uploadHomeworkFile(supabase, file.name, file.size, file); setUploaded(attachment); }
      const result = await supabase.rpc('create_homework_assignment', { p_id: key, p_title: title.trim(), p_instructions: instructions.trim(), p_grade: Number(grade), p_student_ids: recipients, p_due_at: due ? new Date(due).toISOString() : null, p_file_path: attachment?.file_path || null, p_file_name: attachment?.file_name || null });
      if (result.error) throw result.error;
      setTitle(''); setInstructions(''); setGrade(''); setDue(''); setRecipients([]); setFile(null); setUploaded(null); setKey(crypto.randomUUID()); if (input.current) input.current.value = '';
      setNotice('Naibigay na ang takdang-aralin sa mga napiling mag-aaral.');showFormFeedback('Naibigay na ang takdang-aralin sa mga napiling mag-aaral.'); await cache.invalidateQueries({ queryKey: ['teacher-homework'] });
    } catch (error) { setError(homeworkError(error)); } finally { inFlight.current = false; setBusy(false); }
  }
  async function toggle(assignment: Homework) {
    if (inFlight.current) return; inFlight.current = true; setBusy(true); setError('');
    try { const result = await supabase.rpc('set_homework_open', { p_assignment_id: assignment.id, p_open: assignment.status === 'closed' }); if (result.error) throw result.error; await refetch(); }
    catch (error) { setError(homeworkError(error)); } finally { inFlight.current = false; setBusy(false); }
  }
  if (selected) return <Review assignment={selected} onBack={() => { setSelected(null); void refetch(); }} />;
  return <div className="hw-workspace"><header className="hw-heading"><div><h2>Takdang-Aralin</h2><p>Magbigay ng gawain at suriin ang mga sagot. Hiwalay ito sa Mga Aralin.</p></div><button type="button" className="hw-secondary" disabled={busy} onClick={() => void refetch()}>I-refresh</button></header>
    {isPending && <p role="status">Kinukuha ang listahan...</p>}{loadError && <p className="hw-error" role="alert">{homeworkError(loadError)}</p>}
    <form className="hw-card" onSubmit={event => void create(event)}><h3>Bagong Takdang-Aralin</h3><label>Pamagat<input required maxLength={160} disabled={busy} value={title} onChange={event => setTitle(event.target.value)} /></label><label>Panuto<textarea required maxLength={10000} rows={5} disabled={busy} value={instructions} onChange={event => setInstructions(event.target.value)} /></label>
      <div className="hw-form-row"><label>Baitang<select aria-label="Baitang" required disabled={busy} value={grade} onChange={event => { setGrade(event.target.value); setRecipients([]); }}><option value="">Pumili ng baitang</option>{[1, 2, 3, 4, 5, 6].map(value => <option key={value} value={value}>Grade {value}</option>)}</select></label><label>Takdang araw (opsyonal)<input type="datetime-local" disabled={busy} value={due} onChange={event => setDue(event.target.value)} /></label></div>
      <fieldset disabled={busy}><legend>Mga tatanggap</legend><p className="hw-help">Mga mag-aaral lamang sa iyong listahan at napiling baitang.</p>{!roster.length && <p>{grade ? 'Walang mag-aaral sa napiling baitang.' : 'Pumili muna ng baitang.'}</p>}{roster.length > 0 && <label className="hw-check"><input type="checkbox" checked={roster.every(student => recipients.includes(student.id))} onChange={event => setRecipients(event.target.checked ? roster.map(student => student.id) : [])} />Piliin lahat ({roster.length})</label>}{roster.map(student => <label className="hw-check" key={student.id}><input type="checkbox" checked={recipients.includes(student.id)} onChange={event => setRecipients(event.target.checked ? [...recipients, student.id] : recipients.filter(id => id !== student.id))} />{student.name}</label>)}</fieldset>
      <label>Kalakip na gawain (opsyonal)<input ref={input} type="file" accept={HOMEWORK_ACCEPT} disabled={busy} onChange={event => { const next = event.target.files?.[0]; try { if (next) homeworkFileType(next.name, next.size); setFile(next || null); setUploaded(null); setError(''); } catch (error) { setFile(null); setUploaded(null); setError(homeworkError(error)); event.target.value = ''; } }} /></label><p className="hw-help">PDF, Word, PowerPoint, Excel, JPG o PNG. Hanggang 20 MB. Ang file ay para lamang sa mga nakatalagang mag-aaral.</p>
      {error && <p role="alert" className="hw-error">{error}</p>}{notice && <p role="status" className="hw-notice">{notice}</p>}<button type="submit" className="hw-primary" disabled={busy || !data}>{busy ? 'Ibinibigay...' : 'Ibigay ang Takdang-Aralin'}</button>
    </form>
    <section className="hw-grid" aria-label="Mga takdang-aralin ng guro">{data?.assignments.map(assignment => <article key={assignment.id} className="hw-card"><span className="hw-status">{assignment.status === 'open' ? 'Bukas para sa pagpasa' : 'Sarado na'}</span><h3>{assignment.title}</h3><p>Grade {assignment.grade_level} · {assignment.due_at ? new Date(assignment.due_at).toLocaleString('fil-PH') : 'Walang takdang araw'}</p><div className="hw-actions"><button type="button" className="hw-primary" disabled={busy} onClick={() => setSelected(assignment)}>Tingnan ang mga Sagot</button><button type="button" className="hw-secondary" disabled={busy} onClick={() => void toggle(assignment)}>{assignment.status === 'open' ? 'Isara ang Pagpasa' : 'Buksan ang Pagpasa'}</button></div></article>)}</section>
    {data && !data.assignments.length && <p className="hw-empty">Wala ka pang naibibigay na takdang-aralin.</p>}
  </div>;
}
