import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';
import { PdfReadingAssistant } from '../../components/PdfReadingAssistant';
import { PdfDrillReview } from '../../components/teacher/PdfDrillReview';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';

interface PdfMaterial {
  id: string;
  title: string;
  file_url: string;
  extracted_text: string | null;
  grade_level: number | null;
  level: string | null;
  drill_status: string | null;
  created_at: string;
}

const DRILL_STATUS_LABEL: Record<string, string> = {
  pending_review: 'Kailangan ng review',
  published: 'Nai-publish',
};

const GRADES = [1, 2, 3, 4, 5, 6];

interface RosterChild {
  id: string;
  student_id: string;
  children: { id: string; name: string } | null;
}

interface AssignmentWithAttempts {
  id: string;
  status: string;
  student_id: string;
  children: { name: string } | null;
  pdf_reading_attempts: { accuracy: number; created_at: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Bago',
  in_progress: 'Ginagawa',
  completed: 'Tapos na',
};

export default function PdfReading() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [level, setLevel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [monitorId, setMonitorId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'plain' | 'drill'>('plain');

  const { data: materials, isLoading } = useQuery({
    queryKey: ['pdf-materials', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('pdf_materials')
        .select('id, title, file_url, extracted_text, grade_level, level, drill_status, created_at')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      return data as PdfMaterial[];
    },
    enabled: Boolean(user),
  });

  const { data: monitorAssignments } = useQuery({
    queryKey: ['pdf-monitor', monitorId],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('pdf_assignments')
        .select('id, status, student_id, children(name), pdf_reading_attempts(accuracy, created_at)')
        .eq('pdf_material_id', monitorId!);
      if (err) throw err;
      return data as unknown as AssignmentWithAttempts[];
    },
    enabled: Boolean(monitorId),
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

      const endpoint = uploadMode === 'drill' ? '/teacher/pdf-drill' : '/teacher/pdf';
      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Hindi na-upload ang PDF.');
      return payload as { material: { id: string } };
    },
    onSuccess: (payload) => {
      setTitle('');
      setGradeLevel('');
      setLevel('');
      setFile(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['pdf-materials'] });
      if (uploadMode === 'drill' && payload?.material?.id) setReviewingId(payload.material.id);
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
        <h1 className="text-2xl font-semibold">Pagbasa ng PDF</h1>
        <p className="text-[var(--color-text-muted)]">
          Mag-upload ng PDF at i-assign sa mga mag-aaral para sa gabay na pagbasa.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border p-6"
        style={cardStyle('--color-brand-teal')}
      >
        <h2 className="text-lg font-semibold">Mag-upload ng PDF</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUploadMode('plain')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              uploadMode === 'plain' ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)]'
            }`}
          >
            Karaniwang PDF
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('drill')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              uploadMode === 'drill' ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)]'
            }`}
          >
            Pagsasanay sa Pantig
          </button>
        </div>
        {uploadMode === 'drill' && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Awtomatikong hahatiin ang PDF sa mga pantig at salita (3-column na format: pantig | salita | larawan). Susuriin mo pa ito bago i-publish.
          </p>
        )}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Pamagat"
          required
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          >
            <option value="">Baitang</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
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
          {(materials ?? []).map((m, i) => (
            <li key={m.id} className="rounded-lg border px-4 py-3" style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{m.title}</p>
                    {m.drill_status && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          m.drill_status === 'published'
                            ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                            : 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                        }`}
                      >
                        {DRILL_STATUS_LABEL[m.drill_status] ?? m.drill_status}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Grade {m.grade_level ?? '-'} · {m.level ?? 'Walang level'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={m.file_url} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm">
                    <IconLabel icon="📄" label="Raw PDF" />
                  </a>
                  {m.drill_status ? (
                    <button
                      type="button"
                      onClick={() => setReviewingId(reviewingId === m.id ? null : m.id)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)]"
                    >
                      <IconLabel icon="✏️" label="I-review" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreviewId(previewId === m.id ? null : m.id)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)]"
                    >
                      <IconLabel icon="👁️" label="I-preview" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMonitorId(monitorId === m.id ? null : m.id)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)]"
                  >
                    <IconLabel icon="📈" label="Monitor" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssigningId(assigningId === m.id ? null : m.id)}
                    className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-sm text-white"
                  >
                    <IconLabel icon="📮" label="I-assign" />
                  </button>
                </div>
              </div>
              {previewId === m.id && (
                <div className="mt-3 border-t border-white/60 pt-3">
                  <PdfReadingAssistant material={m} mode="preview" />
                </div>
              )}
              {reviewingId === m.id && (
                <div className="mt-3 border-t border-white/60 pt-3">
                  <PdfDrillReview materialId={m.id} onPublished={() => setReviewingId(null)} />
                </div>
              )}
              {monitorId === m.id && (
                <div className="mt-3 border-t border-white/60 pt-3">
                  <h3 className="mb-2 font-medium">Progreso ng Mag-aaral</h3>
                  <ul className="flex flex-col gap-2">
                    {(monitorAssignments ?? []).map((a) => {
                      const best = a.pdf_reading_attempts.reduce(
                        (max, at) => Math.max(max, at.accuracy),
                        0,
                      );
                      return (
                        <li key={a.id} className="flex items-center justify-between text-sm">
                          <span>{a.children?.name ?? 'Mag-aaral'}</span>
                          <span className="text-[var(--color-text-muted)]">
                            {STATUS_LABEL[a.status] ?? a.status} ·{' '}
                            {a.pdf_reading_attempts.length > 0 ? `Best: ${best}%` : 'Wala pang attempt'}
                          </span>
                        </li>
                      );
                    })}
                    {(monitorAssignments ?? []).length === 0 && (
                      <p className="text-sm text-[var(--color-text-muted)]">Wala pang naka-assign dito.</p>
                    )}
                  </ul>
                </div>
              )}
              {assigningId === m.id && (
                <ul className="mt-3 flex flex-wrap gap-2 border-t border-white/60 pt-3">
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
