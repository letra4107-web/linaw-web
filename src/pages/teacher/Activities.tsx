import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';

interface RosterChild {
  id: string;
  student_id: string;
  children: { id: string; name: string; auth_uid: string | null } | null;
}

interface Activity {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  deadline: string;
  status: string;
  student_id: string;
}

export default function Activities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [deadline, setDeadline] = useState('');
  const [studentAuthUid, setStudentAuthUid] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: roster } = useQuery({
    queryKey: ['teacher-roster', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('teacher_student_links')
        .select('id, student_id, children(id, name, auth_uid)');
      if (err) throw err;
      return data as unknown as RosterChild[];
    },
    enabled: Boolean(user),
  });

  const rosterAuthUids = (roster ?? []).map((r) => r.children?.auth_uid).filter(Boolean) as string[];

  const { data: activities, isLoading } = useQuery({
    queryKey: ['teacher-activities', rosterAuthUids],
    queryFn: async () => {
      if (rosterAuthUids.length === 0) return [];
      const { data, error: err } = await supabase
        .from('activities')
        .select('id, title, description, subject, deadline, status, student_id')
        .in('student_id', rosterAuthUids)
        .order('deadline', { ascending: true });
      if (err) throw err;
      return data as Activity[];
    },
    enabled: rosterAuthUids.length > 0,
  });

  const createActivity = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Kailangan ng title.');
      if (!deadline) throw new Error('Kailangan ng deadline.');
      if (!studentAuthUid) throw new Error('Pumili ng mag-aaral.');
      const { error: err } = await supabase.from('activities').insert({
        title: title.trim(),
        description: description.trim() || null,
        subject: subject.trim() || null,
        deadline: new Date(deadline).toISOString(),
        student_id: studentAuthUid,
        status: 'pending',
      });
      if (err) throw err;
    },
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setSubject('');
      setDeadline('');
      setStudentAuthUid('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['teacher-activities'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const nameForAuthUid = (authUid: string) =>
    roster?.find((r) => r.children?.auth_uid === authUid)?.children?.name ?? 'Mag-aaral';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Mga Gawain</h1>
        <p className="text-[var(--color-text-muted)]">Mag-assign ng gawain sa iyong mga mag-aaral.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createActivity.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h2 className="text-lg font-semibold">Bagong Gawain</h2>
        <select
          value={studentAuthUid}
          onChange={(e) => setStudentAuthUid(e.target.value)}
          required
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        >
          <option value="">Pumili ng mag-aaral</option>
          {(roster ?? []).map((r) => (
            <option key={r.id} value={r.children?.auth_uid ?? ''}>
              {r.children?.name}
            </option>
          ))}
        </select>
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
        <div className="grid grid-cols-2 gap-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asignatura"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          />
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          />
        </div>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <button
          type="submit"
          disabled={createActivity.isPending}
          className="self-start rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-60"
        >
          {createActivity.isPending ? 'Ginagawa...' : 'Gumawa ng Gawain'}
        </button>
      </form>

      <div>
        {isLoading && <p>Naglo-load...</p>}
        <ul className="flex flex-col gap-2">
          {(activities ?? []).map((a) => (
            <li key={a.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <p className="font-medium">{a.title}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {nameForAuthUid(a.student_id)} · {a.subject ?? 'Walang subject'} · Deadline:{' '}
                {new Date(a.deadline).toLocaleString('fil-PH')} · {a.status}
              </p>
            </li>
          ))}
          {activities && activities.length === 0 && (
            <p className="text-[var(--color-text-muted)]">Wala pang gawain.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
