import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  grade_level: number | null;
  max_score: number;
  is_published: boolean;
}

interface RosterChild {
  id: string;
  student_id: string;
  children: { id: string; name: string } | null;
}

interface ScoreRow {
  id: string;
  assessment_id: string;
  student_id: string;
  score: number;
  feedback: string | null;
}

export default function Assessments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [error, setError] = useState<string | null>(null);
  const [openAssessmentId, setOpenAssessmentId] = useState<string | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['teacher-assessments', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('teacher_assessments')
        .select('id, title, description, subject, grade_level, max_score, is_published')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      return data as Assessment[];
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

  const { data: scores } = useQuery({
    queryKey: ['assessment-scores', openAssessmentId],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('teacher_assessment_scores')
        .select('id, assessment_id, student_id, score, feedback')
        .eq('assessment_id', openAssessmentId!);
      if (err) throw err;
      return data as ScoreRow[];
    },
    enabled: Boolean(openAssessmentId),
  });

  const createAssessment = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Kailangan ng title.');
      const { error: err } = await supabase.from('teacher_assessments').insert({
        teacher_id: user!.id,
        title: title.trim(),
        subject: subject.trim() || null,
        grade_level: gradeLevel ? Number(gradeLevel) : null,
        max_score: Number(maxScore) || 100,
      });
      if (err) throw err;
    },
    onSuccess: () => {
      setTitle('');
      setSubject('');
      setGradeLevel('');
      setMaxScore('100');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const saveScore = useMutation({
    mutationFn: async ({ assessmentId, studentId, score }: { assessmentId: string; studentId: string; score: number }) => {
      const { error: err } = await supabase
        .from('teacher_assessment_scores')
        .upsert({ assessment_id: assessmentId, student_id: studentId, score }, { onConflict: 'assessment_id,student_id' });
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assessment-scores'] }),
    onError: (err: Error) => setError(err.message),
  });

  const scoreByStudent = new Map((scores ?? []).map((s) => [s.student_id, s]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Mga Pagsusulit</h1>
        <p className="text-[var(--color-text-muted)]">Gumawa ng assessment at ilagay ang tunay na marka ng mag-aaral.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createAssessment.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border p-6"
        style={cardStyle('--color-brand-coral')}
      >
        <h2 className="text-lg font-semibold">Bagong Pagsusulit</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Pamagat"
          required
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asignatura"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          />
          <input
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            placeholder="Baitang"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          />
          <input
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            placeholder="Pinakamataas na Marka"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          />
        </div>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <button
          type="submit"
          disabled={createAssessment.isPending}
          className="self-start rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-60"
        >
          {createAssessment.isPending ? 'Ginagawa...' : 'Gumawa'}
        </button>
      </form>

      <div>
        {isLoading && <p>Naglo-load...</p>}
        <ul className="flex flex-col gap-3">
          {(assessments ?? []).map((a, i) => (
            <li key={a.id} className="rounded-lg border px-4 py-3" style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {a.subject ?? 'Walang subject'} · Grade {a.grade_level ?? '-'} · Max: {a.max_score}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenAssessmentId(openAssessmentId === a.id ? null : a.id)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)]"
                >
                  <IconLabel icon="📋" label="Markahan" />
                </button>
              </div>
              {openAssessmentId === a.id && (
                <ul className="mt-3 flex flex-col gap-2 border-t border-white/60 pt-3">
                  {(roster ?? []).map((r) => {
                    const existing = scoreByStudent.get(r.student_id);
                    const draftKey = `${a.id}:${r.student_id}`;
                    return (
                      <li key={r.id} className="flex items-center justify-between gap-3">
                        <span>{r.children?.name ?? 'Mag-aaral'}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            defaultValue={existing?.score ?? ''}
                            onChange={(e) => setScoreDrafts((prev) => ({ ...prev, [draftKey]: e.target.value }))}
                            className="w-24 rounded-lg border border-[var(--color-border)] px-3 py-1"
                            placeholder="Marka"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const raw = scoreDrafts[draftKey] ?? String(existing?.score ?? '');
                              const score = Number(raw);
                              if (Number.isNaN(score)) {
                                setError('Ilagay ang numerong marka.');
                                return;
                              }
                              saveScore.mutate({ assessmentId: a.id, studentId: r.student_id, score });
                            }}
                            className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-sm text-white"
                          >
                            I-save
                          </button>
                        </div>
                      </li>
                    );
                  })}
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
