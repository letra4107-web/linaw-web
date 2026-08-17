import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { IconLabel } from '../../components/a11y/IconLabel';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  account_status: string;
  created_at: string;
}

const GRADES = [1, 2, 3, 4, 5, 6];

export default function AdminTeachers() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [gradeLevels, setGradeLevels] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string } | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ['admin-users', 'teacher', ''],
    queryFn: () => api<{ users: UserRow[] }>('/admin/users?role=teacher', { auth: true }),
  });

  const createTeacher = useMutation({
    mutationFn: () =>
      api<{ temporaryPassword: string }>('/admin/teachers', {
        method: 'POST',
        auth: true,
        body: { email, name, gradeLevels },
      }),
    onSuccess: (res) => {
      setCreated({ email, temporaryPassword: res.temporaryPassword });
      setEmail('');
      setName('');
      setGradeLevels([]);
      refetch();
    },
    onError: (err: Error) => setError(err.message),
  });

  const toggleGrade = (g: number) => {
    setGradeLevels((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].sort()));
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Mga Guro</h1>
        <p className="text-[var(--color-text-muted)]">Gumawa ng bagong account ng guro at itakda ang grade level.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setCreated(null);
          if (gradeLevels.length === 0) {
            setError('Pumili ng kahit isang grade level.');
            return;
          }
          createTeacher.mutate();
        }}
        className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      >
        <div>
          <label htmlFor="teacher-name" className="mb-1 block text-sm font-medium">
            Buong Pangalan
          </label>
          <input
            id="teacher-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2"
          />
        </div>
        <div>
          <label htmlFor="teacher-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="teacher-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2"
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Baitang</p>
          <div className="flex flex-wrap gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGrade(g)}
                className={`rounded-full border px-4 py-1 text-sm ${
                  gradeLevels.includes(g)
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                    : 'border-[var(--color-border)]'
                }`}
              >
                Grade {g}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <button
          type="submit"
          disabled={createTeacher.isPending}
          className="self-start rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm text-white disabled:opacity-60"
        >
          <IconLabel icon="➕" label={createTeacher.isPending ? 'Ginagawa...' : 'Gumawa ng Account'} />
        </button>
      </form>

      {created && (
        <div className="rounded-xl border border-[var(--color-primary)] bg-[var(--color-surface)] p-4">
          <p className="font-medium">Nagawa ang account para kay {created.email}</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Pansamantalang password: <span className="font-mono font-semibold">{created.temporaryPassword}</span>
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Ibahagi ito sa guro nang ligtas — hindi na ito muling ipapakita.
          </p>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Kasalukuyang mga Guro</h2>
        <ul className="flex flex-col gap-2">
          {(data?.users ?? []).map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
            >
              <span>
                {t.name ?? t.email} · {t.email}
              </span>
              <span className="text-sm capitalize text-[var(--color-text-muted)]">{t.account_status}</span>
            </li>
          ))}
          {data && data.users.length === 0 && (
            <p className="text-[var(--color-text-muted)]">Wala pang guro.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
