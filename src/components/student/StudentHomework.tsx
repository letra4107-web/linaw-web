import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { HOMEWORK_ACCEPT, HOMEWORK_STATUS, homeworkError, homeworkFileType, homeworkFileUrl, listHomework, ownHomeworkAnswers, saveHomeworkAnswer, uploadHomeworkFile, type Homework, type HomeworkSubmission } from '../../lib/homework';
import './homework.css';

const when = (value: string) => new Date(value).toLocaleString('fil-PH', { dateStyle: 'medium', timeStyle: 'short' });
function Answer({ assignment, initial, onBack, onSaved }: { assignment: Homework; initial?: HomeworkSubmission; onBack: () => void; onSaved: () => void }) {
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial?.answer_text || '');
  const [attachment, setAttachment] = useState({ file_path: initial?.file_path || null, file_name: initial?.file_name || null });
  const [picked, setPicked] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const locked = assignment.status === 'closed' || saved?.status === 'submitted' || saved?.status === 'reviewed';
  async function save(submit: boolean) {
    if (inFlight.current || locked) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try {
      let file = attachment;
      if (picked) { file = await uploadHomeworkFile(supabase, picked.name, picked.size, picked); setAttachment(file); setPicked(null); }
      const result = await saveHomeworkAnswer(supabase, assignment.id, text, file, submit);
      setSaved(result); setNotice(submit ? 'Naipasa na ang iyong sagot sa guro.' : 'Nai-save ang sagot. Hindi pa ito naipapasa.'); onSaved();
    } catch (error) { setError(homeworkError(error)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function open(path: string) {
    setError(''); const popup = window.open('about:blank', '_blank');
    try { const url = await homeworkFileUrl(supabase, path); if (!popup) throw new Error('Hindi mabuksan ang file. Payagan muna ang pop-up sa browser.'); popup.opener = null; popup.location.replace(url); }
    catch (error) { popup?.close(); setError(homeworkError(error)); }
  }
  return <section className="hw-detail">
    <button type="button" className="hw-secondary" disabled={busy} onClick={onBack}>Bumalik sa Takdang-Aralin</button>
    <header><p>TAKDANG-ARALIN · Grade {assignment.grade_level}</p><h2>{assignment.title}</h2><p>{assignment.due_at ? `Ipasa bago: ${when(assignment.due_at)}` : 'Walang takdang araw'}</p></header>
    <div className="hw-instructions"><h3>Panuto</h3><p>{assignment.instructions}</p>{assignment.file_path && <button type="button" className="hw-secondary" onClick={() => void open(assignment.file_path!)}>Buksan ang gawain: {assignment.file_name}</button>}</div>
    <p className="hw-status">{assignment.status === 'closed' ? 'Sarado na ang pagpasa' : saved ? HOMEWORK_STATUS[saved.status] : 'Hindi pa naipapasa'}{saved?.submitted_at ? ` · ${when(saved.submitted_at)}` : ''}</p>
    {!!saved?.feedback && <aside className="hw-feedback"><h3>Puna ng guro</h3><p>{saved.feedback}</p></aside>}
    <form onSubmit={event => { event.preventDefault(); void save(true); }}>
      <label>Iyong sagot<textarea aria-label="Iyong sagot" value={text} maxLength={10000} rows={6} disabled={busy || locked} onChange={event => { setText(event.target.value); setError(''); }} placeholder="Isulat ang iyong sagot dito, o maglakip ng file." /></label>
      <label>Maglakip ng sagot<input type="file" accept={HOMEWORK_ACCEPT} disabled={busy || locked} onChange={event => { const file = event.target.files?.[0]; if (!file) return; try { homeworkFileType(file.name, file.size); setPicked(file); setError(''); } catch (error) { setError(homeworkError(error)); } event.target.value = ''; }} /></label>
      <p className="hw-help">PDF, Word, PowerPoint, Excel, JPG o PNG. Hanggang 20 MB. Maaari ring sagot na text lamang.</p>
      {(picked || attachment.file_name) && <div className="hw-file"><span>{picked?.name || attachment.file_name}</span>{attachment.file_path && !picked && <button type="button" onClick={() => void open(attachment.file_path!)}>Buksan</button>}{!locked && <button type="button" disabled={busy} onClick={() => { setPicked(null); setAttachment({ file_path: null, file_name: null }); }}>Alisin</button>}</div>}
      {error && <p role="alert" className="hw-error">{error}</p>}{notice && <p role="status" className="hw-notice">{notice}</p>}
      {!locked && <div className="hw-actions"><button type="button" className="hw-secondary" disabled={busy} onClick={() => void save(false)}>I-save muna</button><button type="submit" className="hw-primary" disabled={busy}>{busy ? 'Sine-save...' : saved?.revision ? 'Ipasa Muli ang Sagot' : 'Ipasa ang Sagot'}</button></div>}
    </form>
  </section>;
}
export function StudentHomework() {
  const { user } = useAuth(); const cache = useQueryClient(); const [selected, setSelected] = useState<Homework | null>(null);
  const [filter, setFilter] = useState('all');
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['student-homework', user?.id], enabled: !!user, queryFn: async () => {
    const [assignments, answers] = await Promise.all([listHomework(supabase), ownHomeworkAnswers(supabase)]); return { assignments, answers };
  } });
  if (selected) return <Answer key={selected.id} assignment={selected} initial={data?.answers.find(answer => answer.assignment_id === selected.id)} onBack={() => { setSelected(null); void refetch(); }} onSaved={() => { void cache.invalidateQueries({ queryKey: ['student-homework'] }); }} />;
  const assignments = (data?.assignments || []).filter(assignment => {
    const status = data?.answers.find(answer => answer.assignment_id === assignment.id)?.status;
    return filter === 'all' || (filter === 'done' ? status === 'submitted' || status === 'reviewed' : status !== 'submitted' && status !== 'reviewed');
  });
  return <section className="hw-workspace" aria-label="Takdang-Aralin">
    <header className="hw-heading"><div><h2>Takdang-Aralin</h2><p>Dito makikita ang mga gawain at maipapasa ang iyong sagot.</p></div><button type="button" className="hw-secondary" onClick={() => void refetch()}>I-refresh</button></header>
    <label className="hw-filter">Ipakita<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Lahat</option><option value="pending">Hindi pa naipapasa</option><option value="done">Naipasa na</option></select></label>
    {isPending && <p role="status">Kinukuha ang mga takdang-aralin...</p>}{error && <p role="alert" className="hw-error">{homeworkError(error)}</p>}
    {data && !assignments.length && <p className="hw-empty">Wala pang takdang-aralin sa listahang ito.</p>}
    <div className="hw-grid">{assignments.map(assignment => {
      const answer = data?.answers.find(answer => answer.assignment_id === assignment.id);
      return <article className="hw-card" key={assignment.id}><span className="hw-status">{answer ? HOMEWORK_STATUS[answer.status] : 'Hindi pa naipapasa'}</span><h3>{assignment.title}</h3><p>{assignment.due_at ? `Ipasa bago: ${when(assignment.due_at)}` : 'Walang takdang araw'}</p><p>{assignment.status === 'closed' ? 'Sarado na ang pagpasa' : 'Bukas para sa pagpasa'}</p><button type="button" className="hw-primary" onClick={() => setSelected(assignment)}>Buksan ang Takdang-Aralin</button></article>;
    })}</div>
  </section>;
}
