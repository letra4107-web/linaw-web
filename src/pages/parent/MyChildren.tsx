import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';

interface Child {
  id: string;
  name: string;
  grade_level: number;
  username: string;
}

interface ChildProgress {
  child_id: string;
  level: string;
  xp: number;
  streak: number;
}

function levelForGrade(grade: number): string {
  if (grade <= 2) return 'Beginner';
  if (grade <= 4) return 'Intermediate';
  return 'Advanced';
}

export default function MyChildren() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [childName, setChildName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [levelDraft, setLevelDraft] = useState('Beginner');

  const { data: children, isLoading } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('children')
        .select('id, name, grade_level, username')
        .order('grade_level');
      if (err) throw err;
      return data as Child[];
    },
    enabled: Boolean(user),
  });

  const { data: progress } = useQuery({
    queryKey: ['parent-children-progress', (children ?? []).map((c) => c.id)],
    queryFn: async () => {
      const ids = (children ?? []).map((c) => c.id);
      if (ids.length === 0) return [];
      const { data, error: err } = await supabase.from('child_progress').select('child_id, level, xp, streak').in('child_id', ids);
      if (err) throw err;
      return data as ChildProgress[];
    },
    enabled: (children ?? []).length > 0,
  });

  const enrollChild = useMutation({
    mutationFn: async () => {
      const result = await api<{ success: boolean; username: string; level: string }>('/parent/children', {
        method: 'POST',
        auth: true,
        body: { childName, gradeLevel: Number(gradeLevel) },
      });
      return result;
    },
    onSuccess: (result) => {
      setChildName('');
      setGradeLevel('1');
      setError(null);
      setSuccessMsg(
        `Nai-enroll si ${childName || 'ang bata'} bilang ${result.username} (${result.level} level). Naipadala ang credentials sa iyong email.`,
      );
      queryClient.invalidateQueries({ queryKey: ['parent-children'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateLevel = useMutation({
    mutationFn: async ({ childId, level }: { childId: string; level: string }) => {
      await api(`/parent/children/${childId}/reading-level`, {
        method: 'POST',
        auth: true,
        body: { level },
      });
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['parent-children-progress'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const progressFor = (childId: string) => progress?.find((p) => p.child_id === childId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Mga Anak Ko</h1>
        <p className="text-[var(--color-text-muted)]">Pamahalaan ang mga account ng iyong mga anak.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enrollChild.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h2 className="text-lg font-semibold">Mag-enroll ng Bagong Anak</h2>
        <input
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          placeholder="Buong Pangalan ng Bata"
          required
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        <div>
          <label htmlFor="grade" className="mb-1 block text-sm font-medium">
            Grade Level
          </label>
          <select
            id="grade"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          >
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Awtomatikong ise-set ang reading level: <strong>{levelForGrade(Number(gradeLevel))}</strong>
          </p>
        </div>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        {successMsg && <p className="text-sm text-[var(--color-primary)]">{successMsg}</p>}
        <button
          type="submit"
          disabled={enrollChild.isPending}
          className="self-start rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-60"
        >
          {enrollChild.isPending ? 'Ie-enroll...' : 'I-enroll'}
        </button>
      </form>

      <div>
        {isLoading && <p>Naglo-load...</p>}
        <ul className="flex flex-col gap-3">
          {(children ?? []).map((c) => {
            const p = progressFor(c.id);
            return (
              <li key={c.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Grade {c.grade_level} · {c.username} · Kasalukuyang Level: {p?.level ?? '-'} · XP: {p?.xp ?? 0} ·
                      Streak: {p?.streak ?? 0}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(editingId === c.id ? null : c.id);
                      setLevelDraft(p?.level ?? 'Beginner');
                    }}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)]"
                  >
                    <IconLabel icon="🎚️" label="Baguhin ang Level" />
                  </button>
                </div>
                {editingId === c.id && (
                  <div className="mt-3 flex items-center gap-3 border-t border-[var(--color-border)] pt-3">
                    <select
                      value={levelDraft}
                      onChange={(e) => setLevelDraft(e.target.value)}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => updateLevel.mutate({ childId: c.id, level: levelDraft })}
                      disabled={updateLevel.isPending}
                      className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm text-white"
                    >
                      I-save
                    </button>
                  </div>
                )}
              </li>
            );
          })}
          {children && children.length === 0 && (
            <p className="text-[var(--color-text-muted)]">Wala ka pang naka-enroll na anak.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
