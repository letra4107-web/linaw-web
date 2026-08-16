import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';

interface PdfMaterial {
  id: string;
  title: string;
  file_url: string;
  grade_level: number | null;
  level: string | null;
  created_at: string;
}

interface RosterChild {
  id: string;
  student_id: string;
  children: { id: string; name: string } | null;
}

export default function PdfReading() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [level, setLevel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const { data: materials, isLoading } = useQuery({
    queryKey: ['pdf-materials', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('pdf_materials')
        .select('id, title, file_url, grade_level, level, created_at')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      return data as PdfMaterial[];
    },
    enabled: Boolean(user),
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

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Pumili ng PDF file.');
      if (!title.trim()) throw new Error('Kailangan ng title.');

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      if (gradeLevel) formData.append('gradeLevel', gradeLevel);
      if (level) formData.append('level', level);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/teacher/pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Hindi na-upload ang PDF.');
    },
    onSuccess: () => {
      setTitle('');
      setGradeLevel('');
      setLevel('');
      setFile(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['pdf-materials'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const assign = useMutation({
    mutationFn: async ({ materialId, studentId }: { materialId: string; studentId: string }) => {
      const { error: err } = await supabase.from('pdf_assignments').insert({
        pdf_material_id: materialId,
        student_id: studentId,
        assigned_by: user!.id,
      });
      if (err) throw err;
    },
    onSuccess: () => setAssigningId(null),
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">PDF Reading</h1>
        <p className="text-[var(--color-text-muted)]">
          Mag-upload ng PDF at i-assign sa mga mag-aaral para sa guided reading.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h2 className="text-lg font-semibold">Mag-upload ng PDF</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            placeholder="Grade Level (hal. 3)"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          >
            <option value="">Reading Level</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
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
          disabled={upload.isPending}
          className="self-start rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-60"
        >
          {upload.isPending ? 'Ina-upload...' : 'I-upload'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Mga PDF</h2>
        {isLoading && <p>Naglo-load...</p>}
        <ul className="flex flex-col gap-3">
          {(materials ?? []).map((m) => (
            <li key={m.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Grade {m.grade_level ?? '-'} · {m.level ?? 'Walang level'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a href={m.file_url} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm">
                    <IconLabel icon="👁️" label="Tingnan" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setAssigningId(assigningId === m.id ? null : m.id)}
                    className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-sm text-white"
                  >
                    <IconLabel icon="📮" label="I-assign" />
                  </button>
                </div>
              </div>
              {assigningId === m.id && (
                <ul className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
                  {(roster ?? []).map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => assign.mutate({ materialId: m.id, studentId: r.student_id })}
                        className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)]"
                      >
                        {r.children?.name ?? 'Mag-aaral'}
                      </button>
                    </li>
                  ))}
                  {(roster ?? []).length === 0 && (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Walang mag-aaral sa listahan mo. Pumunta sa "Mag-aaral Ko" muna.
                    </p>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
