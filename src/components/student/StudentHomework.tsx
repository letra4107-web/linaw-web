import { useEffect, useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, ClipboardList, Clock3, Paperclip, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { HOMEWORK_ACCEPT, HOMEWORK_STATUS, homeworkError, homeworkFileType, homeworkFileUrl, listHomework, ownHomeworkAnswers, saveHomeworkAnswer, uploadHomeworkFile, type Homework, type HomeworkSubmission } from '../../lib/homework';
import { HOMEWORK_FILTERS, groupHomework, homeworkCategory, homeworkDeadline, homeworkSubmitLabel, type HomeworkFilter } from '../../lib/homeworkPresentation';
import './homework.css';

function Answer({ assignment, initial, onBack, onSaved, now }: { assignment: Homework; initial?: HomeworkSubmission; onBack: () => void; onSaved: (answer: HomeworkSubmission) => void; now: number }) {
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial?.answer_text || '');
  const [attachment, setAttachment] = useState({ file_path: initial?.file_path || null, file_name: initial?.file_name || null });
  const [picked, setPicked] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const formId = useId();
  const detailHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { detailHeading.current?.focus(); }, []);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const locked = assignment.status === 'closed' || saved?.status === 'submitted' || saved?.status === 'reviewed';
  const late = homeworkCategory(assignment, saved, now) === 'late';
  async function save(submit: boolean) {
    if (inFlight.current || locked) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try {
      let file = attachment;
      if (picked) { file = await uploadHomeworkFile(supabase, picked.name, picked.size, picked); setAttachment(file); setPicked(null); }
      const result = await saveHomeworkAnswer(supabase, assignment.id, text, file, submit);
      setSaved(result); setNotice(submit ? 'Naipasa na ang iyong sagot sa guro.' : 'Nai-save ang sagot. Hindi pa ito naipapasa.'); onSaved(result);
    } catch (error) { setError(homeworkError(error)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function open(path: string) {
    setError(''); const popup = window.open('about:blank', '_blank');
    try { const url = await homeworkFileUrl(supabase, path); if (!popup) throw new Error('Hindi mabuksan ang file. Payagan muna ang pop-up sa browser.'); popup.opener = null; popup.location.replace(url); }
    catch (error) { popup?.close(); setError(homeworkError(error)); }
  }
  return <section className="hw-detail hw-assignment-detail">
    <div className="hw-detail-toolbar"><button type="button" className="hw-secondary" disabled={busy} onClick={onBack}><ArrowLeft size={18} aria-hidden />Bumalik sa Takdang-Aralin</button>{!locked && <button type="submit" form={formId} className="hw-primary" disabled={busy}>{busy ? 'Sine-save...' : homeworkSubmitLabel(assignment, saved, now)}</button>}</div>
    <header className="hw-detail-title"><span className="hw-detail-eyebrow">TAKDANG-ARALIN · Grade {assignment.grade_level}</span><h2 ref={detailHeading} tabIndex={-1}>{assignment.title}</h2><p className={late ? 'hw-deadline is-late' : 'hw-deadline'}><Clock3 size={17} aria-hidden />{assignment.due_at ? <>Ipasa bago: <time dateTime={assignment.due_at}>{homeworkDeadline(assignment.due_at)}</time></> : 'Walang takdang araw'}</p></header>
    <p className={`hw-turnin-status ${late ? 'is-late' : ''}`} role="status">{assignment.status === 'closed' ? 'Sarado na ang pagpasa' : saved ? HOMEWORK_STATUS[saved.status] : 'Hindi pa naipapasa'}{saved?.submitted_at ? ` · ${homeworkDeadline(saved.submitted_at)}` : ''}{late && assignment.status === 'open' ? ' · Maaari pang ipasa kahit huli.' : ''}</p>
    {!!saved?.feedback && <aside className="hw-feedback"><h3>Puna ng guro</h3><p>{saved.feedback}</p></aside>}
    <details className="hw-instruction-panel" open><summary>Panuto</summary><div><p>{assignment.instructions}</p>{assignment.file_path && <button type="button" className="hw-secondary" onClick={() => void open(assignment.file_path!)}><Paperclip size={17} aria-hidden />Buksan ang gawain: {assignment.file_name}</button>}</div></details>
    <form id={formId} className="hw-my-work" onSubmit={event => { event.preventDefault(); void save(true); }}>
      <header><h3>Aking Gawain</h3><p className="hw-help">Isulat ang sagot o maglakip ng file, pagkatapos ay pindutin ang pagpasa sa itaas.</p></header>
      <label>Iyong sagot<textarea aria-label="Iyong sagot" value={text} maxLength={10000} rows={6} disabled={busy || locked} onChange={event => { setText(event.target.value); setError(''); }} placeholder="Isulat ang iyong sagot dito, o maglakip ng file." /></label>
      {!locked && <label className="hw-attach-label"><Paperclip size={18} aria-hidden />Maglakip ng sagot<input type="file" accept={HOMEWORK_ACCEPT} disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (!file) return; try { homeworkFileType(file.name, file.size); setPicked(file); setError(''); } catch (error) { setError(homeworkError(error)); } event.target.value = ''; }} /></label>}
      <p className="hw-help">PDF, Word, PowerPoint, Excel, JPG o PNG. Hanggang 20 MB.</p>
      {(picked || attachment.file_name) && <div className="hw-file"><Paperclip size={17} aria-hidden /><span>{picked?.name || attachment.file_name}</span>{attachment.file_path && !picked && <button type="button" onClick={() => void open(attachment.file_path!)}>Buksan</button>}{!locked && <button type="button" disabled={busy} onClick={() => { setPicked(null); setAttachment({ file_path: null, file_name: null }); }}>Alisin</button>}</div>}
      {error && <p role="alert" className="hw-error">{error}</p>}{notice && <p role="status" className="hw-notice">{notice}</p>}
      {!locked && <button type="button" className="hw-secondary" disabled={busy} onClick={() => void save(false)}>I-save muna</button>}
    </form>
  </section>;
}
export function StudentHomework() {
  const { user } = useAuth(); const cache = useQueryClient(); const [selected, setSelected] = useState<Homework | null>(null);
  const [filter, setFilter] = useState<HomeworkFilter>('upcoming');
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['student-homework', user?.id], enabled: !!user, queryFn: async () => {
    const [assignments, answers] = await Promise.all([listHomework(supabase), ownHomeworkAnswers(supabase)]); return { assignments, answers };
  } });
  if (selected) return <Answer key={selected.id} assignment={selected} initial={data?.answers.find(answer => answer.assignment_id === selected.id)} now={now} onBack={() => { setSelected(null); void refetch(); }} onSaved={answer => { if (answer.status === 'submitted' || answer.status === 'reviewed') setFilter('done'); void cache.invalidateQueries({ queryKey: ['student-homework'] }); }} />;
  const groups = groupHomework(data?.assignments || [], data?.answers || [], filter, now);
  return <section className="hw-workspace hw-student-assignments" aria-label="Takdang-Aralin">
    <header className="hw-heading"><div><h2>Takdang-Aralin</h2><p>Piliin ang card para buksan ang gawain at ipasa ang sagot.</p></div><button type="button" className="hw-secondary" onClick={() => void refetch()}><RefreshCw size={16} aria-hidden />I-refresh</button></header>
    <div className="hw-category-tabs" role="group" aria-label="Kalagayan ng takdang-aralin">{HOMEWORK_FILTERS.map(category => {
      const count = (data?.assignments || []).filter(assignment => homeworkCategory(assignment, data?.answers.find(answer => answer.assignment_id === assignment.id), now) === category.key).length;
      return <button type="button" key={category.key} aria-label={`${category.label}: ${count} gawain`} aria-pressed={filter === category.key} onClick={() => setFilter(category.key)}>{category.label}<span aria-hidden>{count}</span></button>;
    })}</div>
    {isPending && <p role="status">Kinukuha ang mga takdang-aralin...</p>}{error && <p role="alert" className="hw-error">{homeworkError(error)}</p>}
    {data && !groups.length && <p className="hw-empty">Walang takdang-aralin sa “{HOMEWORK_FILTERS.find(category => category.key === filter)?.label}”.</p>}
    {groups.map(group => <section className="hw-date-group" key={group.key} aria-label={group.label}><h3 className="hw-date-heading">{group.label}</h3><div className="hw-assignment-list">{group.items.map(({ assignment, answer }) => <article className="hw-assignment-card" key={assignment.id} aria-label={assignment.title}><button type="button" className="hw-card-open" aria-label={`Buksan ang Takdang-Aralin: ${assignment.title}`} onClick={() => setSelected(assignment)}>
      <span className="hw-assignment-icon" aria-hidden><ClipboardList size={25} /></span>
      <span className="hw-assignment-copy"><span className="hw-assignment-title">{assignment.title}</span><span>Grade {assignment.grade_level}{assignment.file_name ? ' · May kalakip na gawain' : ''}</span><span className={filter === 'late' ? 'hw-card-deadline is-late' : 'hw-card-deadline'}>{assignment.due_at ? `Ipasa bago: ${homeworkDeadline(assignment.due_at)}` : 'Walang takdang araw'}</span></span>
      <span className="hw-assignment-status">{assignment.status === 'closed' ? 'Sarado na' : answer ? HOMEWORK_STATUS[answer.status] : 'Hindi pa naipapasa'}</span><ChevronRight className="hw-card-chevron" size={20} aria-hidden />
    </button></article>)}</div></section>)}
  </section>;
}
