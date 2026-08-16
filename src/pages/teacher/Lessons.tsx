import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';

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
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Mga Aralin</h1>
        <p className="text-[var(--color-text-muted)]">Gumawa, i-edit, o alisin ang mga lesson.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createLesson.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h2 className="text-lg font-semibold">Bagong Aralin</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsyon"
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          />
          <input
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            placeholder="Grade Level"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          />
        </div>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <button
          type="submit"
          disabled={createLesson.isPending}
          className="self-start rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-60"
        >
          {createLesson.isPending ? 'Nagpo-post...' : 'Gumawa ng Aralin'}
        </button>
      </form>

      <div>
        {isLoading && <p>Naglo-load...</p>}
        <ul className="flex flex-col gap-3">
          {(lessons ?? []).map((lesson) => (
            <li
              key={lesson.id}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <div>
                <p className="font-medium">{lesson.title}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {lesson.subject ?? 'Walang subject'} · Grade {lesson.grade_level ?? '-'} ·{' '}
                  {lesson.is_published ? 'Naka-publish' : 'Draft'}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={lesson.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
                >
                  <IconLabel icon="👁️" label="Tingnan" />
                </a>
                <button
                  type="button"
                  onClick={() => togglePublish.mutate({ id: lesson.id, isPublished: lesson.is_published })}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
                >
                  <IconLabel icon="🔁" label={lesson.is_published ? 'I-draft' : 'I-publish'} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteLesson.mutate(lesson.id)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-danger)]"
                >
                  <IconLabel icon="🗑️" label="Tanggalin" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
