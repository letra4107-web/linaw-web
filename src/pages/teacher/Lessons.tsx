import { uploadPublishedLesson, type LessonDraft } from '../../lib/lessons/upload';
import { updateOwnedLesson, deleteOwnedLesson } from '../../lib/lessons/manage';
import { tagalogError } from '../../lib/validationMessages';
import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, FileText, FolderOpen, GraduationCap, Pencil, RotateCcw, Search, Send, Star, Trash2, UploadCloud, UsersRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { openAccessUrl } from '../../lib/openAccessUrl';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { LessonDescription, LessonDescriptionEditor } from './LessonDescriptionEditor';
import readingOwl from '../../assets/teacher/lessons-reading-owl.png';

const GRADES = [1, 2, 3, 4, 5, 6];
interface Lesson { id: string; title: string; description: string | null; subject: string | null; grade_level: string | null; pdf_url: string; file_name: string | null; is_published: boolean; created_at: string; }
type Draft = LessonDraft;
const EMPTY: Draft = { title: '', description: '', gradeLevel: '' };
const formatDate = (value: string) => new Intl.DateTimeFormat('fil-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(value));

function LessonFields({ draft, onChange, disabled, titleLimit = 100, descriptionLimit = 500 }: { draft: Draft; onChange: (draft: Draft) => void; disabled: boolean; titleLimit?: number; descriptionLimit?: number }) {
  const id = useId();
  return <><div className="tl-field"><label htmlFor={`${id}-title`}>Pamagat ng Aralin <span aria-hidden="true">*</span></label><input id={`${id}-title`} value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="Hal. Pagkilala sa mga Patinig" required maxLength={titleLimit} disabled={disabled} aria-describedby={`${id}-title-count`} /><small id={`${id}-title-count`}>{draft.title.length}/{titleLimit}</small></div>
    <LessonDescriptionEditor value={draft.description} onChange={(description) => onChange({ ...draft, description })} disabled={disabled} maxLength={descriptionLimit} />
    <div className="tl-fields-row"><div className="tl-field"><label htmlFor={`${id}-grade`}>Baitang <span aria-hidden="true">*</span></label><div className="tl-select"><GraduationCap aria-hidden /><select id={`${id}-grade`} value={draft.gradeLevel} onChange={(event) => onChange({ ...draft, gradeLevel: event.target.value })} required disabled={disabled}><option value="">Piliin ang baitang</option>{[...new Set([...GRADES.map(String), ...(draft.gradeLevel ? [draft.gradeLevel] : [])])].map((grade) => <option key={grade} value={grade}>{grade === '0' ? 'Kindergarten' : `Grade ${grade}`}</option>)}</select></div></div></div>
  </>;
}

function LessonDialog({ lesson, mode, busy, error, onClose, onSave, onPublish, onDelete, onPreview }: { lesson: Lesson; mode: 'view' | 'edit' | 'delete'; busy: boolean; error: string | null; onClose: () => void; onSave: (draft: Draft) => void; onPublish: () => void; onDelete: () => void; onPreview: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [draft, setDraft] = useState<Draft>({ title: lesson.title, description: lesson.description ?? '', gradeLevel: lesson.grade_level ?? '' });
  useEffect(() => { const element = ref.current; if (!opener.current) opener.current = document.activeElement as HTMLElement; element?.showModal(); return () => { element?.close(); queueMicrotask(() => { if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); }); }; }, []);
  return <dialog ref={ref} className="tl-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}><header><div><p>{mode === 'delete' ? 'KUMPIRMAHIN' : mode === 'edit' ? 'I-EDIT ANG ARALIN' : 'DETALYE NG ARALIN'}</p><h2 id={titleId}>{mode === 'delete' ? 'Tanggalin ang aralin?' : lesson.title}</h2></div><button type="button" disabled={busy} aria-label="Isara ang detalye ng aralin" onClick={onClose}><X aria-hidden /></button></header>
    {mode === 'edit' ? <form onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><LessonFields draft={draft} onChange={setDraft} disabled={busy} titleLimit={Math.max(100, lesson.title.length)} descriptionLimit={Math.max(500, lesson.description?.length ?? 0)} />{error && <p className="tl-error" role="alert">{error}</p>}<footer><button type="button" disabled={busy} className="tl-secondary" onClick={onClose}>Kanselahin</button><button type="submit" disabled={busy} className="tl-primary">{busy ? 'Sine-save…' : 'I-save ang mga Pagbabago'}</button></footer></form> : mode === 'delete' ? <div className="tl-dialog-body"><p>Matatanggal ang <strong>{lesson.title}</strong> sa iyong lesson library. Hindi na mababawi ang aralin kapag tinanggal.</p>{error && <p className="tl-error" role="alert">{error}</p>}<footer><button type="button" disabled={busy} className="tl-secondary" onClick={onClose} autoFocus>Kanselahin</button><button type="button" disabled={busy} className="tl-delete-confirm" onClick={onDelete}>{busy ? 'Tinatanggal…' : 'Oo, tanggalin ang aralin'}</button></footer></div> : <div className="tl-dialog-body"><p className="tl-dialog-meta">{lesson.grade_level ? `Grade ${lesson.grade_level}` : 'Walang baitang'} · {lesson.is_published ? 'Published' : 'Draft'}</p><h3>Deskripsyon</h3><LessonDescription value={lesson.description || 'Walang inilagay na deskripsyon.'} /><h3>PDF file</h3><p>{lesson.file_name || 'Lesson PDF'} · {formatDate(lesson.created_at)}</p>{error && <p className="tl-error" role="alert">{error}</p>}<footer><button type="button" className="tl-primary" disabled={busy} onClick={onPreview}><Eye aria-hidden /> Tingnan ang PDF</button><button type="button" className="tl-secondary" disabled={busy} onClick={onPublish}>{lesson.is_published ? 'Gawing Draft' : 'I-publish'}</button></footer></div>}
  </dialog>;
}

export default function Lessons() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadId = useId();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [formKey, setFormKey] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileChecking, setFileChecking] = useState(false);
  const fileRevision = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [selection, setSelection] = useState<{ id: string; mode: 'view' | 'edit' | 'delete' } | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data: lessons, isLoading, error: libraryError, refetch } = useQuery({ queryKey: ['teacher-lessons', user?.id], queryFn: async () => {
    const { data, error } = await supabase.from('lessons').select('*').eq('teacher_id', user!.id).order('created_at', { ascending: false });
    if (error) throw error;
    return data as Lesson[];
  }, enabled: Boolean(user) });
  function clearForm() { fileRevision.current++; setFormKey((value) => value + 1); setDraft(EMPTY); setFile(null); setFileChecking(false); setFormError(null); if (fileInput.current) fileInput.current.value = ''; }
  async function chooseFile(next: File | undefined) {
    const revision = ++fileRevision.current; setFile(null); setFormError(null);
    if (!next) { setFileChecking(false); return; }
    setFileChecking(true);
    try {
      if (next.size === 0) throw new Error('Walang laman ang napiling file.');
      if (next.size > 50 * 1024 * 1024) throw new Error('Hanggang 50MB lamang ang PDF.');
      if (!next.name.toLowerCase().endsWith('.pdf') && next.type !== 'application/pdf') throw new Error('PDF file lamang ang maaaring i-upload.');
      if (await next.slice(0, 5).text() !== '%PDF-') throw new Error('Hindi wastong PDF ang napiling file.');
      if (revision === fileRevision.current) setFile(next);
    } catch (error) { if (revision === fileRevision.current) { setFormError(error instanceof Error ? tagalogError(error) : 'Hindi mabasa ang file.'); if (fileInput.current) fileInput.current.value = ''; } }
    finally { if (revision === fileRevision.current) setFileChecking(false); }
  }
  const createLesson = useMutation({ mutationFn: async () => {
    if (!user || !file) throw new Error('Pumili ng PDF file.');
    return uploadPublishedLesson(supabase, user.id, draft, file);
  }, onSuccess: () => { clearForm(); setSuccess('Na-upload at na-publish ang aralin. Makikita ito sa web at iOS sa Aralin → Galing sa Guro para sa napiling baitang.'); setSearch(''); setPage(1); void queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] }); void queryClient.invalidateQueries({ queryKey: ['teacher-materials-count'] }); void queryClient.invalidateQueries({ queryKey: ['student-teacher-lessons'] }); }, onError: (error: Error) => setFormError(tagalogError(error)) });
  const updateLesson = useMutation({ mutationFn: async ({ id, values }: { id: string; values: Partial<Draft> & { is_published?: boolean } }) => {
    if (values.is_published === undefined && (!values.title?.trim() || !values.description?.trim() || !values.gradeLevel)) throw new Error('Kumpletuhin ang mga kinakailangang detalye.');
    const payload = values.is_published !== undefined ? { is_published: values.is_published } : { title: values.title?.trim(), description: values.description?.trim(), grade_level: values.gradeLevel };
    await updateOwnedLesson(supabase, user?.id, id, payload);
  }, onSuccess: (_, variables) => { setActionError(null); if (variables.values.is_published === undefined) setSelection(null); setSuccess(variables.values.is_published === undefined ? 'Na-save ang mga pagbabago.' : variables.values.is_published ? 'Nai-publish ang aralin.' : 'Nailipat sa draft ang aralin.'); void queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] }); void queryClient.invalidateQueries({ queryKey: ['teacher-materials-count'] }); }, onError: (error: Error) => setActionError(tagalogError(error)) });
  const deleteLesson = useMutation({ mutationFn: async (id: string) => {
    await deleteOwnedLesson(supabase, user?.id, id);
  }, onSuccess: () => { setSelection(null); setActionError(null); setSuccess('Natanggal ang aralin.'); void queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] }); void queryClient.invalidateQueries({ queryKey: ['teacher-materials-count'] }); }, onError: (error: Error) => setActionError(tagalogError(error)) });
  const busy = createLesson.isPending || updateLesson.isPending || deleteLesson.isPending;
  const selectedLesson = lessons?.find((lesson) => lesson.id === selection?.id);
  const filtered = (lessons ?? []).filter((lesson) => lesson.title.toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pages);
  function openDialog(lesson: Lesson, mode: 'view' | 'edit' | 'delete') { setActionError(null); setSelection({ id: lesson.id, mode }); }
  function preview(id: string) { setActionError(null); void openAccessUrl(`/teacher/lessons/${id}/access-url`).catch((error: Error) => setActionError(tagalogError(error))); }

  return <div className="tl-workspace">
    <section className="tl-create-panel"><header className="tl-panel-heading"><span className="tl-heading-icon"><BookOpen aria-hidden /></span><div><h2>Gumawa ng Bagong Aralin</h2><p>I-upload ang lesson PDF at ilagay ang mga detalye ng aralin.</p></div></header>
      <form className="tl-form" onSubmit={(event) => { event.preventDefault(); setFormError(null); setSuccess(''); if (!fileChecking && !createLesson.isPending) createLesson.mutate(); }}>
        <LessonFields key={formKey} draft={draft} onChange={setDraft} disabled={busy} />
        <div className={`tl-upload ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) void chooseFile(event.dataTransfer.files[0]); }}><span className="tl-upload-icon"><UploadCloud aria-hidden /></span><div><label htmlFor={uploadId}>{file ? file.name : 'I-upload ang Lesson PDF'} <span aria-hidden="true">*</span></label><p>{fileChecking ? 'Sinusuri ang file…' : file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Handa nang i-upload.` : 'I-drag and drop ang file dito o i-click para pumili. PDF lang. Max 50MB.'}</p></div><button type="button" className="tl-file-button" disabled={busy || fileChecking} onClick={() => fileInput.current?.click()}><FileText aria-hidden /> Pumili ng File</button><input ref={fileInput} id={uploadId} className="sr-only" type="file" accept=".pdf,application/pdf" disabled={busy || fileChecking} onChange={(event) => void chooseFile(event.target.files?.[0])} /></div>
        {formError && <p className="tl-error" role="alert">{formError}</p>}
        <div className="tl-form-actions"><button className="tl-primary" type="submit" disabled={busy || fileChecking}><Send aria-hidden />{createLesson.isPending ? 'Ginagawa ang Aralin…' : 'Gumawa ng Aralin'}</button><button className="tl-secondary" type="button" disabled={busy} onClick={clearForm}><RotateCcw aria-hidden /> I-clear</button></div>
        {success && <p className="tl-success" role="status"><CheckCircle2 aria-hidden />{success}</p>}
      </form>
    </section>
    <section className="tl-library-panel" aria-labelledby="tl-library-title"><header className="tl-panel-heading"><span className="tl-heading-icon"><FolderOpen aria-hidden /></span><div><h2 id="tl-library-title">Lesson Library</h2><p>Tingnan, i-edit, o pamahalaan ang iyong mga aralin.</p></div><span className="tl-library-count"><b>{libraryError ? '—' : isLoading ? '…' : lessons?.length ?? 0}</b><small>Kabuuang Aralin</small></span></header>
      <div className="tl-library-body"><QueryErrorNotice error={libraryError} onRetry={() => void refetch()} message="Hindi ma-load ang Lesson Library. Pakisubukang muli." />{actionError && !selectedLesson && <p className="tl-error" role="alert">{actionError}</p>}
        {isLoading ? <div className="tl-library-empty"><p role="status">Kinukuha ang mga aralin…</p></div> : libraryError ? null : !lessons?.length ? <div className="tl-library-empty"><img src={readingOwl} alt="" aria-hidden="true" /><h3>Wala pang aralin.</h3><p>Simulan sa paggawa ng iyong unang aralin upang magamit ito sa iyong mga mag-aaral.</p></div> : <><label className="tl-library-search"><Search aria-hidden /><span className="sr-only">Maghanap sa Lesson Library</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Maghanap ng aralin..." /></label><ul className="tl-lesson-list">{filtered.slice((currentPage - 1) * 5, currentPage * 5).map((lesson) => <li key={lesson.id}><span className="tl-lesson-file"><FileText aria-hidden /></span><div><h3>{lesson.title}</h3><p>{lesson.grade_level ? `Grade ${lesson.grade_level}` : 'Walang baitang'}</p><small>{formatDate(lesson.created_at)} · {lesson.is_published ? 'Published' : 'Draft'}</small><div className="tl-lesson-actions"><button type="button" disabled={busy} onClick={() => preview(lesson.id)} aria-label={`Tingnan ang PDF ng ${lesson.title}`} title="Tingnan ang PDF"><Eye aria-hidden /></button><button type="button" disabled={busy} onClick={() => openDialog(lesson, 'edit')} aria-label={`I-edit ang ${lesson.title}`} title="I-edit"><Pencil aria-hidden /></button><button type="button" disabled={busy} onClick={() => { setActionError(null); updateLesson.mutate({ id: lesson.id, values: { is_published: !lesson.is_published } }); }} aria-label={`${lesson.is_published ? 'Gawing draft ang' : 'I-publish ang'} ${lesson.title}`} title={lesson.is_published ? 'Gawing draft' : 'I-publish'}><BookOpen aria-hidden /></button><button type="button" disabled={busy} onClick={() => openDialog(lesson, 'delete')} aria-label={`Tanggalin ang ${lesson.title}`} title="Tanggalin"><Trash2 aria-hidden /></button><button type="button" disabled={busy} onClick={() => openDialog(lesson, 'view')} aria-label={`Mga detalye ng ${lesson.title}`} title="Mga detalye"><ArrowRight aria-hidden /></button></div></div></li>)}</ul>{!filtered.length && <p className="tl-no-results">Walang araling tumugma sa iyong hinahanap.</p>}{pages > 1 && <nav className="tl-library-pagination" aria-label="Mga pahina ng Lesson Library"><button type="button" aria-label="Nakaraang pahina ng aralin" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft aria-hidden /></button><span>{currentPage} / {pages}</span><button type="button" aria-label="Susunod na pahina ng aralin" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight aria-hidden /></button></nav>}</>}
        <aside className="tl-benefits"><h3><GraduationCap aria-hidden /> Mga Benepisyo ng Digital Lessons</h3><div><span><i><UsersRound aria-hidden /></i>Mas organisadong pagtuturo</span><span><i><Clock3 aria-hidden /></i>Mas madaling pagsubaybay</span><span><i><Star aria-hidden /></i>Mas makabuluhang pagkatuto</span></div></aside>
        <blockquote className="tl-library-quote"><span aria-hidden="true">“</span><p>“Ang isang maayos na aralin ngayon,<br /> mas maraming batang magtatagumpay bukas.”</p></blockquote>
      </div>
    </section>
    {selectedLesson && selection && <LessonDialog key={`${selection.id}-${selection.mode}`} lesson={selectedLesson} mode={selection.mode} busy={busy} error={actionError} onClose={() => { if (!busy) { setSelection(null); setActionError(null); } }} onSave={(values) => { setActionError(null); updateLesson.mutate({ id: selectedLesson.id, values }); }} onPublish={() => updateLesson.mutate({ id: selectedLesson.id, values: { is_published: !selectedLesson.is_published } })} onDelete={() => deleteLesson.mutate(selectedLesson.id)} onPreview={() => preview(selectedLesson.id)} />}
  </div>;
}
