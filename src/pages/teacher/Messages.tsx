import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';

interface RosterRow {
  student_id: string;
  children: { id: string; name: string; parent_id: string } | null;
}

interface SentMessageRow {
  id: string;
  child_id: string;
  message: string;
  read: boolean;
  created_at: string;
  children: { name: string } | null;
}

export default function TeacherMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: roster } = useQuery({
    queryKey: ['teacher-roster', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('teacher_student_links')
        .select('student_id, children(id, name, parent_id)');
      if (err) throw err;
      return data as unknown as RosterRow[];
    },
    enabled: Boolean(user),
  });

  const { data: sent, isLoading } = useQuery({
    queryKey: ['teacher-sent-messages', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('teacher_messages')
        .select('id, child_id, message, read, created_at, children(name)')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      return data as unknown as SentMessageRow[];
    },
    enabled: Boolean(user),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const child = roster?.find((r) => r.student_id === studentId)?.children;
      if (!child) throw new Error('Pumili muna ng mag-aaral.');
      const { error: err } = await supabase.from('teacher_messages').insert({
        teacher_id: user!.id,
        parent_id: child.parent_id,
        child_id: child.id,
        message: message.trim(),
      });
      if (err) throw err;
    },
    onSuccess: () => {
      setMessage('');
      setStudentId('');
      queryClient.invalidateQueries({ queryKey: ['teacher-sent-messages'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Mga Mensahe</h1>
        <p className="text-[var(--color-text-muted)]">Magpadala ng mensahe sa magulang ng iyong mag-aaral.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (!message.trim()) {
            setError('Sumulat muna ng mensahe.');
            return;
          }
          sendMessage.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border p-5"
        style={cardStyle('--color-brand-teal')}
      >
        <label htmlFor="student" className="text-sm font-medium">
          Mag-aaral
        </label>
        <select
          id="student"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2"
        >
          <option value="">Piliin ang mag-aaral...</option>
          {(roster ?? []).map((r) => (
            <option key={r.student_id} value={r.student_id}>
              {r.children?.name ?? 'Hindi kilala'}
            </option>
          ))}
        </select>

        <label htmlFor="message" className="text-sm font-medium">
          Mensahe
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2"
          placeholder="Isulat ang mensahe para sa magulang..."
        />

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <button
          type="submit"
          disabled={sendMessage.isPending}
          className="self-start rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm text-white disabled:opacity-60"
        >
          <IconLabel icon="✉️" label={sendMessage.isPending ? 'Ipinapadala...' : 'Ipadala'} />
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Naipadalang mga Mensahe</h2>
        {isLoading && <p>Naglo-load...</p>}
        {sent && sent.length === 0 && <p className="text-[var(--color-text-muted)]">Wala ka pang naipadalang mensahe.</p>}
        <ul className="flex flex-col gap-2">
          {(sent ?? []).map((m, i) => (
            <li key={m.id} className="rounded-lg border px-4 py-3" style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}>
              <p className="text-sm font-medium">
                Kay {m.children?.name ?? 'mag-aaral'} · {m.read ? 'Nabasa na' : 'Hindi pa nababasa'}
              </p>
              <p className="mt-1 text-[var(--color-text)]">{m.message}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{new Date(m.created_at).toLocaleString('fil-PH')}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
