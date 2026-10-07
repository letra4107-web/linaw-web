import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Eye, FileText, FolderOpen, MoreHorizontal, RotateCcw, Send, Trash2, UploadCloud, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { openAccessUrl } from '../../lib/openAccessUrl';

const SUBJECTS = ['Filipino', 'Ingles', 'Matematika', 'Agham', 'Araling Panlipunan', 'MAPEH'];
const GRADES = [1, 2, 3, 4, 5, 6];

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  grade_level: string | null;
  pdf_url: string;
  file_name: string | null;
  is_published: boolean;
  created_at: string;
}

const formatDate = (value: string) => new Intl.DateTimeFormat('en-PH', {
  month: 'short', day: 'numeric', year: 'numeric',
}).format(new Date(value));

export default function Lessons() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setSubject('');
    setGradeLevel('');
    setFile(null);
    setError(null);
  };

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['teacher-lessons', user?.id],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('lessons')
        .select('*')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      return data as Lesson[];
    },
    enabled: Boolean(user),
  });

  const createLesson = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Pumili ng PDF file.');
      if (!title.trim()) throw new Error('Kailangan ng pamagat ng aralin.');

      const path = `${user!.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('lesson-pdfs').upload(path, file, { contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('lesson-pdfs').getPublicUrl(path);
      const { error: insertError } = await supabase.from('lessons').insert({
        teacher_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        subject: subject.trim() || null,
        grade_level: gradeLevel.trim() || null,
        pdf_url: publicUrl.publicUrl,
        legacy_public_url: publicUrl.publicUrl,
        storage_bucket: 'lesson-pdfs',
        storage_path: path,
        file_name: file.name,
        is_published: true,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      clearForm();
      queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] });
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from('lessons').delete().eq('id', id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] }),
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error: updateError } = await supabase.from('lessons').update({ is_published: !isPublished }).eq('id', id);
      if (updateError) throw updateError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] }),
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  return (
    <div className="teacher-lesson-workspace">
      <form
        className="teacher-lesson-form"
        onSubmit={(event) => {
          event.preventDefault();
          createLesson.mutate();
        }}
      >
        <div className="teacher-lesson-field">
          <label htmlFor="lesson-title">Pamagat ng Aralin</label>
          <input id="lesson-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Hal. Pagkilala sa mga Patinig" required />
        </div>

        <div className="teacher-lesson-field">
          <label htmlFor="lesson-description">Deskripsyon</label>
          <textarea id="lesson-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Maglagay ng maikling paglalarawan ng aralin..." />
        </div>

        <div className="teacher-lesson-fields-row">
          <div className="teacher-lesson-field">
            <label htmlFor="lesson-subject">Asignatura / Kasanayan</label>
            <select id="lesson-subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
              <option value="">Piliin ang asignatura</option>
              {SUBJECTS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="teacher-lesson-field">
            <label htmlFor="lesson-grade">Baitang</label>
            <select id="lesson-grade" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)}>
              <option value="">Piliin ang baitang</option>
              {GRADES.map((grade) => <option key={grade} value={String(grade)}>Grade {grade}</option>)}
            </select>
          </div>
        </div>

        <label className="teacher-lesson-upload" htmlFor="lesson-pdf">
          <span><UploadCloud aria-hidden="true" /></span>
          <strong>{file ? file.name : 'I-upload ang Lesson PDF'}</strong>
          <small>{file ? 'Handa nang i-upload ang PDF.' : 'I-drag and drop ang file dito o i-click para pumili. PDF lang. Max 50MB.'}</small>
          <input id="lesson-pdf" type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>

        {error && <p className="teacher-lesson-error" role="alert">{error}</p>}

        <div className="teacher-lesson-form__actions">
          <button className="teacher-lesson-create" type="submit" disabled={createLesson.isPending}>
            <Send aria-hidden="true" /> {createLesson.isPending ? 'Ginagawa ang Aralin...' : 'Gumawa ng Aralin'}
          </button>
          <button className="teacher-lesson-clear" type="button" onClick={clearForm}>
            <RotateCcw aria-hidden="true" /> I-clear
          </button>
        </div>
      </form>

      <section className="teacher-lesson-library" aria-labelledby="teacher-lesson-library-title">
        <header className="teacher-lesson-library__header">
          <span><FolderOpen aria-hidden="true" /></span>
          <div>
            <h2 id="teacher-lesson-library-title">Lesson Library</h2>
            <p>Tingnan, i-edit, o pamahalaan ang iyong mga aralin.</p>
          </div>
          <b>{lessons?.length ?? 0}</b>
        </header>

        {isLoading && <p className="teacher-lesson-library__message">Naglo-load ng mga aralin...</p>}
        {!isLoading && !lessons?.length && <p className="teacher-lesson-library__message">Wala pang aralin. Gamitin ang form sa kaliwa upang gumawa ng una mong lesson.</p>}
        <ul className="teacher-lesson-library__list">
          {(lessons ?? []).map((lesson, index) => (
            <li className={`teacher-lesson-row teacher-lesson-row--${index % 5}`} key={lesson.id}>
              <span className="teacher-lesson-row__file"><FileText aria-hidden="true" /></span>
              <div className="teacher-lesson-row__content">
                <h3>{lesson.title}</h3>
                <p>{lesson.subject || 'Walang asignatura'}{lesson.grade_level ? ` · Grade ${lesson.grade_level}` : ''}</p>
                <small>{lesson.file_name || 'PDF lesson'} · {formatDate(lesson.created_at)}</small>
              </div>
              <span className={`teacher-lesson-row__grade teacher-lesson-row__grade--${index % 5}`}>{lesson.grade_level ? `Baitang ${lesson.grade_level}` : 'Walang baitang'}</span>
              <div className="teacher-lesson-row__actions" aria-label={`Mga aksyon para sa ${lesson.title}`}>
                <button type="button" title="Tingnan ang lesson" onClick={() => openAccessUrl(`/teacher/lessons/${lesson.id}/access-url`).catch((actionError: Error) => setError(actionError.message))}><Eye aria-hidden="true" /></button>
                <button type="button" title={lesson.is_published ? 'Gawing draft' : 'I-publish'} onClick={() => togglePublish.mutate({ id: lesson.id, isPublished: lesson.is_published })}><BookOpen aria-hidden="true" /></button>
                <button type="button" title="Tanggalin ang lesson" className="is-delete" onClick={() => deleteLesson.mutate(lesson.id)}><Trash2 aria-hidden="true" /></button>
                <button type="button" title="Higit pang detalye" onClick={() => setSelectedLesson(lesson)}><MoreHorizontal aria-hidden="true" /></button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {selectedLesson && <div className="teacher-lesson-modal" role="dialog" aria-modal="true" aria-label="Detalye ng aralin" onMouseDown={() => setSelectedLesson(null)}>
        <article onMouseDown={(event) => event.stopPropagation()}>
          <header><div><p>Lesson details</p><h2>{selectedLesson.title}</h2><span>{selectedLesson.subject || 'Walang asignatura'}{selectedLesson.grade_level ? ` · Grade ${selectedLesson.grade_level}` : ''}</span></div><button type="button" onClick={() => setSelectedLesson(null)} aria-label="Isara"><X /></button></header>
          <section><h3>Deskripsyon</h3><p>{selectedLesson.description || 'Walang inilagay na deskripsyon para sa araling ito.'}</p></section>
          <section><h3>PDF file</h3><p>{selectedLesson.file_name || 'PDF lesson'} · Nilikha noong {formatDate(selectedLesson.created_at)}</p></section>
          <footer><button type="button" onClick={() => openAccessUrl(`/teacher/lessons/${selectedLesson.id}/access-url`).catch((actionError: Error) => setError(actionError.message))}><Eye /> Tingnan ang PDF</button><button type="button" onClick={() => togglePublish.mutate({ id: selectedLesson.id, isPublished: selectedLesson.is_published })}><BookOpen /> {selectedLesson.is_published ? 'Gawing Draft' : 'I-publish'}</button><button type="button" className="is-delete" onClick={() => { deleteLesson.mutate(selectedLesson.id); setSelectedLesson(null); }}><Trash2 /> Tanggalin</button></footer>
        </article>
      </div>}
    </div>
  );
}
