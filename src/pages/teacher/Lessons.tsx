import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';

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

export default function Lessons() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['teacher-lessons', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('lessons')
        .select('*')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      return data as Lesson[];
    },
    enabled: Boolean(user),
  });

  const createLesson = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Pumili ng PDF file.');
      if (!title.trim()) throw new Error('Kailangan ng title.');

      const path = `${user!.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const { error: uploadErr } = await supabase.storage.from('lesson-pdfs').upload(path, file, {
        contentType: 'application/pdf',
      });
      if (uploadErr) throw uploadErr;

      const { data: publicUrl } = supabase.storage.from('lesson-pdfs').getPublicUrl(path);

      const { error: insertErr } = await supabase.from('lessons').insert({
        teacher_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        subject: subject.trim() || null,
        grade_level: gradeLevel.trim() || null,
        pdf_url: publicUrl.publicUrl,
        file_name: file.name,
        is_published: true,
      });
      if (insertErr) throw insertErr;
    },
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setSubject('');
      setGradeLevel('');
      setFile(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await supabase.from('lessons').delete().eq('id', id);
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] }),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error: err } = await supabase.from('lessons').update({ is_published: !isPublished }).eq('id', id);
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-lessons'] }),
  });

  return (
    <div className="flex min-w-0 flex-col gap-6">

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createLesson.mutate();
        }}
        className="flex flex-col gap-4 rounded-3xl border p-5 shadow-card sm:p-6"
        style={cardStyle('--color-brand-sun')}
      >
        <div><h2 className="text-xl font-bold">Gumawa ng Bagong Aralin</h2><p className="text-sm text-[var(--color-text-muted)]">I-upload ang lesson PDF at ilagay ang malinaw na detalye.</p></div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Pamagat"
          required
          className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white/80 px-4"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsyon"
          className="min-h-24 w-full rounded-2xl border border-[var(--color-border)] bg-white/80 px-4 py-3"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="min-h-12 min-w-0 rounded-2xl border border-[var(--color-border)] bg-white/80 px-4"
          >
            <option value="">Asignatura</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="min-h-12 min-w-0 rounded-2xl border border-[var(--color-border)] bg-white/80 px-4"
          >
            <option value="">Baitang</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="min-h-12 w-full min-w-0 rounded-2xl border border-[var(--color-border)] bg-white/80 px-4 py-2"
        />
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <button
          type="submit"
          disabled={createLesson.isPending}
          className="inline-flex min-h-12 items-center self-start rounded-2xl bg-[var(--color-primary)] px-5 font-bold text-white shadow-card disabled:opacity-60"
        >
          {createLesson.isPending ? 'Nagpo-post...' : 'Gumawa ng Aralin'}
        </button>
      </form>

      <section aria-labelledby="lesson-list-title">
        <div className="mb-3 flex items-center justify-between"><h2 id="lesson-list-title" className="text-xl font-bold">Lesson Library</h2><span className="text-sm font-bold text-[var(--color-text-muted)]">{lessons?.length ?? 0} aralin</span></div>
        {isLoading && <p>Naglo-load...</p>}
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(lessons ?? []).map((lesson, i) => (
            <li
              key={lesson.id}
              className="flex min-w-0 flex-col gap-4 rounded-3xl border p-5 shadow-card"
              style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}
            >
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70">▤</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${lesson.is_published ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-white/70 text-[var(--color-text-muted)]'}`}>{lesson.is_published ? 'Published' : 'Draft'}</span></div>
                <p className="mt-3 line-clamp-2 text-lg font-bold">{lesson.title}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {lesson.subject ?? 'Walang subject'} · Grade {lesson.grade_level ?? '-'} ·{' '}
                  {lesson.is_published ? 'Naka-publish' : 'Draft'}
                </p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-white/70 pt-3">
                <a
                  href={lesson.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-10 rounded-xl border border-white/70 bg-white/65 px-3 text-sm font-bold"
                >
                  <IconLabel icon="👁️" label="Tingnan" />
                </a>
                <button
                  type="button"
                  onClick={() => togglePublish.mutate({ id: lesson.id, isPublished: lesson.is_published })}
                  className="min-h-10 rounded-xl border border-white/70 bg-white/65 px-3 text-sm font-bold"
                >
                  <IconLabel icon="🔁" label={lesson.is_published ? 'I-draft' : 'I-publish'} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteLesson.mutate(lesson.id)}
                  className="min-h-10 rounded-xl border border-white/70 bg-white/65 px-3 text-sm font-bold text-[var(--color-danger)] hover:border-[var(--color-danger)]"
                >
                  <IconLabel icon="🗑️" label="Tanggalin" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
