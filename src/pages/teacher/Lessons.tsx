import { uploadPublishedLesson, validateLessonFile, LESSON_FILE_ACCEPT, type LessonDraft } from '../../lib/lessons/upload';
import { updateOwnedLesson, deleteOwnedLesson } from '../../lib/lessons/manage';
import { saveOwnedLessonEdit, type LessonPdfChange } from '../../lib/lessons/edit';
import { LessonLibraryTable } from './LessonLibraryTable';
import { LessonPdfEditor } from './LessonPdfEditor';
import { tagalogError } from '../../lib/validationMessages';
import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, Clock3, Eye, FileText, FolderOpen, GraduationCap, RotateCcw, Send, Star, UploadCloud, UsersRound, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { openAccessUrl } from '../../lib/openAccessUrl';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { LessonDescription, LessonDescriptionEditor } from './LessonDescriptionEditor';
import readingOwl from '../../assets/teacher/lessons-reading-owl.png';

const GRADES = [1, 2, 3, 4, 5, 6];
interface Lesson { id: string; title: string; description: string | null; subject: string | null; grade_level: string | null; pdf_url: string | null; storage_bucket?: string | null; storage_path?: string | null; file_name: string | null; is_published: boolean; created_at: string; }
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

function LessonDialog({ lesson, mode, busy: saving, error, onClose, onSave, onPublish, onDelete, onPreview }: { lesson: Lesson; mode: 'view' | 'edit' | 'delete'; busy: boolean; error: string | null; onClose: () => void; onSave: (draft: Draft, pdfChange: LessonPdfChange) => void; onPublish: () => void; onDelete: () => void; onPreview: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const [pdfChange, setPdfChange] = useState<LessonPdfChange>({ kind: 'keep' });
  const [pdfChecking, setPdfChecking] = useState(false);
  const busy = saving || pdfChecking;
  const [draft, setDraft] = useState<Draft>({ title: lesson.title, description: lesson.description ?? '', gradeLevel: lesson.grade_level ?? '' });
  useEffect(() => { const element = ref.current; if (!opener.current) opener.current = document.activeElement as HTMLElement; element?.showModal(); return () => { element?.close(); queueMicrotask(() => { if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); }); }; }, []);
  return <dialog ref={ref} className="tl-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}><header><div><p>{mode === 'delete' ? 'KUMPIRMAHIN' : mode === 'edit' ? 'I-EDIT ANG ARALIN' : 'DETALYE NG ARALIN'}</p><h2 id={titleId}>{mode === 'delete' ? 'Tanggalin ang aralin?' : lesson.title}</h2></div><button type="button" disabled={busy} aria-label="Isara ang detalye ng aralin" onClick={onClose}><X aria-hidden /></button></header>
    {mode === 'edit' ? <form onSubmit={(event) => { event.preventDefault(); if (!busy) onSave(draft, pdfChange); }}><LessonFields draft={draft} onChange={setDraft} disabled={busy} titleLimit={Math.max(100, lesson.title.length)} descriptionLimit={Math.max(500, lesson.description?.length ?? 0)} /><LessonPdfEditor fileName={lesson.file_name} hasPdf={Boolean(lesson.pdf_url)} change={pdfChange} onChange={setPdfChange} disabled={saving} checking={pdfChecking} onChecking={setPdfChecking} />{error && <p className="tl-error" role="alert">{error}</p>}<footer><button type="button" disabled={busy} className="tl-secondary" onClick={onClose}>Kanselahin</button><button type="submit" disabled={busy} className="tl-primary">{busy ? 'Sine-save…' : 'I-save ang mga Pagbabago'}</button></footer></form> : mode === 'delete' ? <div className="tl-dialog-body"><p>Matatanggal ang <strong>{lesson.title}</strong> sa iyong lesson library. Hindi na mababawi ang aralin kapag tinanggal.</p>{error && <p className="tl-error" role="alert">{error}</p>}<footer><button type="button" disabled={busy} className="tl-secondary" onClick={onClose} autoFocus>Kanselahin</button><button type="button" disabled={busy} className="tl-delete-confirm" onClick={onDelete}>{busy ? 'Tinatanggal…' : 'Oo, tanggalin ang aralin'}</button></footer></div> : <div className="tl-dialog-body"><p className="tl-dialog-meta">{lesson.grade_level ? `Grade ${lesson.grade_level}` : 'Walang baitang'} · {lesson.is_published ? 'Published' : 'Draft'}</p><h3>Deskripsyon</h3><LessonDescription value={lesson.description || 'Walang inilagay na deskripsyon.'} /><h3>PDF file</h3><p>{lesson.pdf_url ? lesson.file_name || 'Lesson PDF' : 'Walang kalakip na PDF'} · {formatDate(lesson.created_at)}</p>{error && <p className="tl-error" role="alert">{error}</p>}<footer><button type="button" className="tl-primary" disabled={busy || !lesson.pdf_url} onClick={onPreview}><Eye aria-hidden /> Tingnan ang PDF</button><button type="button" className="tl-secondary" disabled={busy || (!lesson.is_published && !lesson.pdf_url)} onClick={onPublish}>{lesson.is_published ? 'Gawing Draft' : 'I-publish'}</button></footer></div>}
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
  const [saveWarning, setSaveWarning] = useState('');
  const [selection, setSelection] = useState<{ id: string; mode: 'view' | 'edit' | 'delete' } | null>(null);
  const [libraryRevision, setLibraryRevision] = useState(0);
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
      await validateLessonFile(next);
      if (revision === fileRevision.current) setFile(next);
    } catch (error) { if (revision === fileRevision.current) { setFormError(error instanceof Error ? tagalogError(error) : 'Hindi mabasa ang file.'); if (fileInput.current) fileInput.current.value = ''; } }
    finally { if (revision === fileRevision.current) setFileChecking(false); }
  }
  const createLesson = useMutation({ mutationFn: async () => {
    if (!user || !file) throw new Error('Pumili ng file para sa aralin.');
    return uploadPublishedLesson(supabase, user.id, draft, file);
  }, onSuccess: () => { clearForm(); setSuccess('Na-upload at na-publish ang aralin. Makikita ito sa web, iOS at Android sa Aralin → Mga Aralin para sa napiling baitang.'); setLibraryRevision(value => value + 1); void queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] }); void queryClient.invalidateQueries({ queryKey: ['teacher-materials-count'] }); void queryClient.invalidateQueries({ queryKey: ['student-teacher-lessons'] }); }, onError: (error: Error) => setFormError(tagalogError(error)) });
  const updateLesson = useMutation({ mutationFn: async ({ id, values, pdfChange }: { id: string; values: Partial<Draft> & { is_published?: boolean }; pdfChange?: LessonPdfChange }) => {
    setSaveWarning('');
    const lesson = lessons?.find(item => item.id === id);
    if (!lesson) throw new Error('Hindi makita ang aralin. I-refresh ang Lesson Library.');
    if (values.is_published && !lesson.pdf_url) throw new Error('Magdagdag muna ng PDF bago i-publish ang aralin.');
    if (values.is_published === undefined && (!values.title?.trim() || !values.description?.trim() || !values.gradeLevel)) throw new Error('Kumpletuhin ang mga kinakailangang detalye.');
    const payload = values.is_published !== undefined ? { is_published: values.is_published } : { title: values.title?.trim(), description: values.description?.trim(), grade_level: values.gradeLevel };
    if (values.is_published !== undefined) {
      await updateOwnedLesson(supabase, user?.id, id, payload);
      return { warning: '' };
    }
    return saveOwnedLessonEdit(supabase, user?.id, id, payload, lesson, pdfChange || { kind: 'keep' });
  }, onSuccess: (result, variables) => { setActionError(null); setSaveWarning(result.warning); void queryClient.invalidateQueries({ queryKey: ['student-teacher-lessons'] }); if (variables.values.is_published === undefined) setSelection(null); setSuccess(variables.values.is_published === undefined ? 'Na-save ang mga pagbabago.' : variables.values.is_published ? 'Nai-publish ang aralin.' : 'Nailipat sa draft ang aralin.'); void queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] }); void queryClient.invalidateQueries({ queryKey: ['teacher-materials-count'] }); }, onError: (error: Error) => setActionError(tagalogError(error)) });
  const deleteLesson = useMutation({ mutationFn: async (id: string) => {
    await deleteOwnedLesson(supabase, user?.id, id);
  }, onSuccess: () => { setSelection(null); setActionError(null); setSuccess('Natanggal ang aralin.'); void queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] }); void queryClient.invalidateQueries({ queryKey: ['teacher-materials-count'] }); }, onError: (error: Error) => setActionError(tagalogError(error)) });
  const busy = createLesson.isPending || updateLesson.isPending || deleteLesson.isPending;
  const selectedLesson = lessons?.find((lesson) => lesson.id === selection?.id);
  function openDialog(lesson: Lesson, mode: 'view' | 'edit' | 'delete') { setActionError(null); setSelection({ id: lesson.id, mode }); }
  function preview(id: string) { setActionError(null); void openAccessUrl(`/teacher/lessons/${id}/access-url`).catch((error: Error) => setActionError(tagalogError(error))); }

  return <div className="tl-workspace">
    <section className="tl-create-panel"><header className="tl-panel-heading"><span className="tl-heading-icon"><BookOpen aria-hidden /></span><div><h2>Gumawa ng Bagong Aralin</h2><p>I-upload ang lesson file at ilagay ang mga detalye ng aralin.</p></div></header>
      <form className="tl-form" onSubmit={(event) => { event.preventDefault(); setFormError(null); setSuccess(''); if (!fileChecking && !createLesson.isPending) createLesson.mutate(); }}>
        <LessonFields key={formKey} draft={draft} onChange={setDraft} disabled={busy} />
        <div className={`tl-upload ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) void chooseFile(event.dataTransfer.files[0]); }}><span className="tl-upload-icon"><UploadCloud aria-hidden /></span><div><label htmlFor={uploadId}>{file ? file.name : 'I-upload ang Lesson File'} <span aria-hidden="true">*</span></label><p>{fileChecking ? 'Sinusuri ang file…' : file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Handa nang i-upload.` : 'I-drag and drop ang file dito o i-click para pumili. PDF, Word, PowerPoint, Excel, JPG o PNG. Max 50 MB.'}</p></div><button type="button" className="tl-file-button" disabled={busy || fileChecking} onClick={() => fileInput.current?.click()}><FileText aria-hidden /> Pumili ng File</button><input ref={fileInput} id={uploadId} className="sr-only" type="file" accept={LESSON_FILE_ACCEPT} disabled={busy || fileChecking} onChange={(event) => void chooseFile(event.target.files?.[0])} /></div>
        <p className="tl-upload-help">PDF version ang ise-save at mabubuksan ng mga mag-aaral. Hindi ise-save ang orihinal na Office o image file.</p>
        {formError && <p className="tl-error" role="alert">{formError}</p>}
        <div className="tl-form-actions"><button className="tl-primary" type="submit" disabled={busy || fileChecking}><Send aria-hidden />{createLesson.isPending ? 'Ginagawa ang Aralin…' : 'Gumawa ng Aralin'}</button><button className="tl-secondary" type="button" disabled={busy} onClick={clearForm}><RotateCcw aria-hidden /> I-clear</button></div>
        {success && <p className="tl-success" role="status"><CheckCircle2 aria-hidden />{success}</p>}{saveWarning && <p className="tl-error" role="alert">{saveWarning}</p>}
      </form>
    </section>
    <section className="tl-library-panel" aria-labelledby="tl-library-title"><header className="tl-panel-heading"><span className="tl-heading-icon"><FolderOpen aria-hidden /></span><div><h2 id="tl-library-title">Lesson Library</h2><p>Tingnan, i-edit, o pamahalaan ang iyong mga aralin.</p></div><span className="tl-library-count"><b>{libraryError ? '—' : isLoading ? '…' : lessons?.length ?? 0}</b><small>Kabuuang Aralin</small></span></header>
      <div className="tl-library-body"><QueryErrorNotice error={libraryError} onRetry={() => void refetch()} message="Hindi ma-load ang Lesson Library. Pakisubukang muli." />{actionError && !selectedLesson && <p className="tl-error" role="alert">{actionError}</p>}
        {isLoading ? <div className="tl-library-empty"><p role="status">Kinukuha ang mga aralin…</p></div> : libraryError ? null : !lessons?.length ? <div className="tl-library-empty"><img src={readingOwl} alt="" aria-hidden="true" /><h3>Wala pang aralin.</h3><p>Simulan sa paggawa ng iyong unang aralin upang magamit ito sa iyong mga mag-aaral.</p></div> : <LessonLibraryTable key={libraryRevision} lessons={lessons} busy={busy} onPreview={preview} onEdit={id => { const lesson = lessons.find(item => item.id === id); if (lesson) openDialog(lesson, 'edit'); }} onPublish={id => { const lesson = lessons.find(item => item.id === id); if (lesson) { setActionError(null); updateLesson.mutate({ id, values: { is_published: !lesson.is_published } }); } }} onDelete={id => { const lesson = lessons.find(item => item.id === id); if (lesson) openDialog(lesson, 'delete'); }} onDetails={id => { const lesson = lessons.find(item => item.id === id); if (lesson) openDialog(lesson, 'view'); }} />}
        <aside className="tl-benefits"><h3><GraduationCap aria-hidden /> Mga Benepisyo ng Digital Lessons</h3><div><span><i><UsersRound aria-hidden /></i>Mas organisadong pagtuturo</span><span><i><Clock3 aria-hidden /></i>Mas madaling pagsubaybay</span><span><i><Star aria-hidden /></i>Mas makabuluhang pagkatuto</span></div></aside>
        <blockquote className="tl-library-quote"><span aria-hidden="true">“</span><p>“Ang isang maayos na aralin ngayon,<br /> mas maraming batang magtatagumpay bukas.”</p></blockquote>
      </div>
    </section>
    {selectedLesson && selection && <LessonDialog key={`${selection.id}-${selection.mode}`} lesson={selectedLesson} mode={selection.mode} busy={busy} error={actionError} onClose={() => { if (!busy) { setSelection(null); setActionError(null); } }} onSave={(values, pdfChange) => { setActionError(null); updateLesson.mutate({ id: selectedLesson.id, values, pdfChange }); }} onPublish={() => updateLesson.mutate({ id: selectedLesson.id, values: { is_published: !selectedLesson.is_published } })} onDelete={() => deleteLesson.mutate(selectedLesson.id)} onPreview={() => preview(selectedLesson.id)} />}
  </div>;
}
