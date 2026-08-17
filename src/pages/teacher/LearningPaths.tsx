import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';

interface LearningPath {
  id: string;
  title: string;
  description: string | null;
}

interface Lesson {
  id: string;
  title: string;
}

interface PathItem {
  id: string;
  path_id: string;
  lesson_id: string;
  item_order: number;
  lessons: { title: string } | null;
}

interface RosterChild {
  id: string;
  student_id: string;
  children: { id: string; name: string } | null;
}

export default function LearningPaths() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openPathId, setOpenPathId] = useState<string | null>(null);

  const { data: paths, isLoading } = useQuery({
    queryKey: ['learning-paths', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('learning_paths')
        .select('id, title, description')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      return data as LearningPath[];
    },
    enabled: Boolean(user),
  });

  const { data: myLessons } = useQuery({
    queryKey: ['teacher-lessons-brief', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase.from('lessons').select('id, title').eq('teacher_id', user!.id);
      if (err) throw err;
      return data as Lesson[];
    },
    enabled: Boolean(user),
  });

  const { data: items } = useQuery({
    queryKey: ['path-items', openPathId],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('learning_path_items')
        .select('id, path_id, lesson_id, item_order, lessons(title)')
        .eq('path_id', openPathId!)
        .order('item_order');
      if (err) throw err;
      return data as unknown as PathItem[];
    },
    enabled: Boolean(openPathId),
  });

  const { data: roster } = useQuery({
    queryKey: ['teacher-roster', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('teacher_student_links')
        .select('id, student_id, children(id, name)');
      if (err) throw err;
      return data as unknown as RosterChild[];
    },
    enabled: Boolean(user),
  });

  const createPath = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Kailangan ng title.');
      const { error: err } = await supabase
        .from('learning_paths')
        .insert({ teacher_id: user!.id, title: title.trim(), description: description.trim() || null });
      if (err) throw err;
    },
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['learning-paths'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const addItem = useMutation({
    mutationFn: async ({ pathId, lessonId }: { pathId: string; lessonId: string }) => {
      const nextOrder = (items?.length ?? 0) + 1;
      const { error: err } = await supabase
        .from('learning_path_items')
        .insert({ path_id: pathId, lesson_id: lessonId, item_order: nextOrder });
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['path-items'] }),
    onError: (err: Error) => setError(err.message),
  });

  const assignStudent = useMutation({
    mutationFn: async ({ pathId, studentId }: { pathId: string; studentId: string }) => {
      const { error: err } = await supabase.from('learning_path_assignments').insert({ path_id: pathId, student_id: studentId });
      if (err) throw err;
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Landas ng Pagkatuto</h1>
        <p className="text-[var(--color-text-muted)]">
          Bumuo ng sunud-sunod na aralin at i-assign sa mga mag-aaral.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPath.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h2 className="text-lg font-semibold">Bagong Landas ng Pagkatuto</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Pamagat"
          required
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsyon"
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <button
          type="submit"
          disabled={createPath.isPending}
          className="self-start rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-60"
        >
          {createPath.isPending ? 'Ginagawa...' : 'Gumawa'}
        </button>
      </form>

      <div>
        {isLoading && <p>Naglo-load...</p>}
        <ul className="flex flex-col gap-3">
          {(paths ?? []).map((p) => (
            <li key={p.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{p.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenPathId(openPathId === p.id ? null : p.id)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)]"
                >
                  <IconLabel icon="🧭" label="Buksan" />
                </button>
              </div>
              {openPathId === p.id && (
                <div className="mt-4 flex flex-col gap-4 border-t border-[var(--color-border)] pt-4">
                  <div>
                    <h3 className="mb-2 font-medium">Mga Aralin sa Path na Ito</h3>
                    <ol className="mb-3 list-decimal pl-5">
                      {(items ?? []).map((it) => (
                        <li key={it.id}>{it.lessons?.title}</li>
                      ))}
                    </ol>
                    <div className="flex flex-wrap gap-2">
                      {(myLessons ?? [])
                        .filter((l) => !(items ?? []).some((it) => it.lesson_id === l.id))
                        .map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => addItem.mutate({ pathId: p.id, lessonId: l.id })}
                            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)]"
                          >
                            <IconLabel icon="➕" label={l.title} />
                          </button>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 font-medium">I-assign sa Mag-aaral</h3>
                    <div className="flex flex-wrap gap-2">
                      {(roster ?? []).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => assignStudent.mutate({ pathId: p.id, studentId: r.student_id })}
                          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)]"
                        >
                          {r.children?.name ?? 'Mag-aaral'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
