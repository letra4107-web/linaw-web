import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '../lib/api';
import './practice-attempt-history.css';

interface ReadingIssue { kind: 'substitution' | 'missing' | 'extra'; expected: string; heard: string; position: number }
interface ReadingAttempt { id: string; expectedText: string; transcript: string; accuracy: number | null; createdAt: string; issues: ReadingIssue[]; letterIssues: ReadingIssue[] }
interface HistoryResponse { selected: ReadingAttempt; history: ReadingAttempt[]; scope: 'verified-content' | 'legacy-text'; summary: { attemptCount: number; firstScore: number | null; latestScore: number | null }; nextOffset: number | null }
const score = (value: number | null) => value === null ? '—' : `${value}%`;
const date = (value: string) => new Intl.DateTimeFormat('fil-PH', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', second:'2-digit', timeZone:'Asia/Manila' }).format(new Date(value));
const issueLabel = { substitution:'Naiibang bigkas', missing:'Hindi nabasa', extra:'Sobrang nabasa' };

export function PracticeAttemptHistory({ studentId, sessionId, onClose }: { studentId: string; sessionId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<ReadingAttempt | null>(null);
  const query = useQuery({ queryKey:['practice-attempt-history', studentId, sessionId, offset], queryFn:() => api<HistoryResponse>(`/learning-history/students/${studentId}/practice/${sessionId}?offset=${offset}`, {auth:true}) });
  useEffect(() => {
    const element=dialog.current;opener.current=document.activeElement as HTMLElement;element?.showModal();
    return () => { element?.close();queueMicrotask(() => { if(opener.current?.isConnected)opener.current.focus({preventScroll:true}); }); };
  }, []);
  const current=selected ?? query.data?.selected;
  if(typeof document==='undefined')return null;
  return createPortal(<dialog ref={dialog} className="attempt-history-dialog" aria-labelledby={titleId}
    onCancel={event=>{event.preventDefault();event.stopPropagation();onClose();}}
    onClick={event=>{event.stopPropagation();if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)onClose();}}}>
    <header><div><p>Mga Pagsubok sa Pagbasa</p><h2 id={titleId}>Detalye at mga naunang score</h2></div><button type="button" aria-label="Isara ang mga pagsubok" onClick={onClose}><X size={22}/></button></header>
    {query.isLoading ? <p role="status">Kinukuha ang mga pagsubok…</p> : query.error ? <div role="alert"><p>Hindi makuha ang mga pagsubok ngayon.</p><button type="button" onClick={()=>void query.refetch()}>Subukan muli</button></div> : current && query.data && <>
      <section className="attempt-history-summary" aria-label="Pag-unlad sa babasahing ito"><div><small>Unang score</small><strong>{score(query.data.summary.firstScore)}</strong></div><ArrowRight aria-hidden/><div><small>Pinakabagong score</small><strong>{score(query.data.summary.latestScore)}</strong></div><div><small>Mga pagsubok</small><strong>{query.data.summary.attemptCount}</strong></div></section>
      {query.data.scope==='legacy-text' && <p className="attempt-history-note">Lumang tala: pinagsama rito ang mga pagsubok na may parehong nakatalang babasahin.</p>}
      <section className="attempt-history-current" aria-label="Napiling pagsubok"><header><div><h3>Napiling pagsubok</h3><time dateTime={current.createdAt}>{date(current.createdAt)}</time></div><strong>{score(current.accuracy)}</strong></header>
        <dl><div><dt>Inaasahang babasahin</dt><dd>{current.expectedText}</dd></div><div><dt>Naitalang bigkas / transcription</dt><dd>{current.transcript||'Walang naitalang transcription.'}</dd></div></dl>
        <h4>Mga pagkakaiba sa bigkas</h4>
        {current.issues.length ? <ul>{current.issues.map((issue,index)=><li key={index}><b>{issueLabel[issue.kind]}</b><span>{issue.expected||'—'} <ArrowRight size={14} aria-hidden/> {issue.heard||'—'}</span></li>)}</ul> : <p>Walang pagkakaiba sa inaasahang teksto at naitalang bigkas.</p>}
        {current.letterIssues.length>0 && <p className="attempt-history-note">Mga titik: {current.letterIssues.map(issue=>`${issue.expected||'—'} → ${issue.heard||'—'}`).join(', ')}</p>}
        <p className="attempt-history-note">Ang score ay mula sa mismong pagsubok. Ang mga puna rito ay batay sa transcription, hindi direktang pagsusuri ng tunog.</p>
      </section>
      <section className="attempt-history-list"><h3>Lahat ng pagsubok sa babasahing ito</h3><p>Piliin ang isang pagsubok upang makita ang sarili nitong score at detalye.</p>
        <ol start={offset+1}>{query.data.history.map((item,index)=><li key={item.id}><button type="button" aria-pressed={current.id===item.id} onClick={()=>setSelected(item)}><span>Pagsubok {offset+index+1}<small>{date(item.createdAt)}</small></span><strong>{score(item.accuracy)}</strong></button></li>)}</ol>
        <nav aria-label="Mga pahina ng pagsubok"><button type="button" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-25))}><ChevronLeft size={16}/>Nauna</button><span>{offset+1}–{offset+query.data.history.length} sa {query.data.summary.attemptCount}</span><button type="button" disabled={query.data.nextOffset===null} onClick={()=>setOffset(query.data!.nextOffset!)}>Susunod<ChevronRight size={16}/></button></nav>
      </section>
    </>}
  </dialog>,document.body);
}
