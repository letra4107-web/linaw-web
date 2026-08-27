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

interface ParentOption {
  parentId: string;
  label: string;
  childIds: string[];
  childNames: string[];
}

interface SentMessageRow {
  id: string;
  parent_id: string;
  child_id: string;
  message: string;
  read: boolean;
  created_at: string;
  children: { name: string } | null;
}

export default function TeacherMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [parentId, setParentId] = useState('');
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

  const parentIds = Array.from(new Set((roster ?? []).map((r) => r.children?.parent_id).filter(Boolean))) as string[];

  const { data: parentNames } = useQuery({
    queryKey: ['teacher-roster-parent-names', parentIds],
    queryFn: async () => {
      if (parentIds.length === 0) return {} as Record<string, string>;
      const { data, error: err } = await supabase.from('users').select('id, name, email').in('id', parentIds);
      if (err) throw err;
      const map: Record<string, string> = {};
      for (const p of data ?? []) map[p.id] = p.name ?? p.email ?? 'Magulang';
      return map;
    },
    enabled: parentIds.length > 0,
  });

  const parentOptions: ParentOption[] = parentIds.map((pid) => {
    const children = (roster ?? []).filter((r) => r.children?.parent_id === pid);
    return {
      parentId: pid,
      label: parentNames?.[pid] ?? 'Magulang',
      childIds: children.map((c) => c.children!.id),
      childNames: children.map((c) => c.children!.name),
    };
  });

  const { data: sent, isLoading } = useQuery({
    queryKey: ['teacher-sent-messages', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('teacher_messages')
        .select('id, parent_id, child_id, message, read, created_at, children(name)')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      return data as unknown as SentMessageRow[];
    },
    enabled: Boolean(user),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const parent = parentOptions.find((p) => p.parentId === parentId);
      if (!parent || parent.childIds.length === 0) throw new Error('Pumili muna ng magulang.');
      const { error: err } = await supabase.from('teacher_messages').insert({
        teacher_id: user!.id,
        parent_id: parent.parentId,
        child_id: parent.childIds[0],
        message: message.trim(),
      });
      if (err) throw err;
    },
    onSuccess: () => {
      setMessage('');
      setParentId('');
      queryClient.invalidateQueries({ queryKey: ['teacher-sent-messages'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-sage', 8, 28)}><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-brand-sage)] uppercase">Family communication</p><h1 className="text-2xl font-bold sm:text-3xl">Mga Mensahe</h1><p className="text-sm text-[var(--color-text-muted)]">Magpadala ng malinaw na update sa magulang tungkol sa kanilang anak.</p></header>

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
        className="flex flex-col gap-4 rounded-3xl border p-5 shadow-card sm:p-6"
        style={cardStyle('--color-brand-teal')}
      >
        <label htmlFor="parent" className="text-sm font-medium">
          Magulang
        </label>
        <select
          id="parent"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white/80 px-4"
        >
          <option value="">Piliin ang magulang...</option>
          {parentOptions.map((p) => (
            <option key={p.parentId} value={p.parentId}>
              {p.label} ({p.childNames.join(', ')})
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
          className="min-h-28 w-full rounded-2xl border border-[var(--color-border)] bg-white/80 px-4 py-3"
          placeholder="Isulat ang mensahe para sa magulang..."
        />

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <button
          type="submit"
          disabled={sendMessage.isPending}
          className="inline-flex min-h-11 items-center self-start rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-card disabled:opacity-60"
        >
          <IconLabel icon="✉️" label={sendMessage.isPending ? 'Ipinapadala...' : 'Ipadala'} />
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-xl font-bold">Naipadalang mga Mensahe</h2>
        {isLoading && <p>Naglo-load...</p>}
        {sent && sent.length === 0 && <p className="text-[var(--color-text-muted)]">Wala ka pang naipadalang mensahe.</p>}
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {(sent ?? []).map((m, i) => (
            <li key={m.id} className="rounded-3xl border p-4 shadow-card" style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}>
              <div className="flex items-start justify-between gap-3"><p className="text-sm font-bold">
                Kay {parentNames?.[m.parent_id] ?? 'magulang'} · tungkol kay {m.children?.name ?? 'mag-aaral'}
              </p><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${m.read ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-white/70 text-[var(--color-text-muted)]'}`}>{m.read ? 'Nabasa' : 'Hindi pa nabasa'}</span></div>
              <p className="mt-1 text-[var(--color-text)]">{m.message}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{new Date(m.created_at).toLocaleString('fil-PH')}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
