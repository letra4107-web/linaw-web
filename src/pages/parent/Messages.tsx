import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { cardStyle } from '../../lib/cardStyle';

interface MessageRow {
  id: string;
  teacher_id: string;
  child_id: string;
  message: string;
  read: boolean;
  created_at: string;
  children: { name: string } | null;
}

export default function ParentMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['parent-messages', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_messages')
        .select('id, teacher_id, child_id, message, read, created_at, children(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as MessageRow[];
    },
    enabled: Boolean(user),
  });

  const teacherIds = Array.from(new Set((messages ?? []).map((m) => m.teacher_id)));

  const { data: teacherNames } = useQuery({
    queryKey: ['parent-messages-teachers', teacherIds],
    queryFn: async () => {
      if (teacherIds.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase.from('users').select('id, name').in('id', teacherIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const t of data ?? []) map[t.id] = t.name ?? 'Guro';
      return map;
    },
    enabled: teacherIds.length > 0,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teacher_messages').update({ read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parent-messages'] }),
  });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-teal', 8, 28)}>
        <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-brand-teal)] uppercase">Komunikasyon</p>
        <h1 className="text-2xl font-bold sm:text-3xl">Mga Mensahe</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Mga update mula sa mga guro ng iyong mga anak.</p>
      </header>

      {isLoading && <p>Naglo-load...</p>}
      {messages && messages.length === 0 && (
        <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-white/45 p-8 text-center text-[var(--color-text-muted)]">Wala ka pang natatanggap na mensahe.</div>
      )}

      <ul className="flex flex-col gap-3">
        {(messages ?? []).map((m) => (
          <li
            key={m.id}
            onClick={() => !m.read && markRead.mutate(m.id)}
            className={`relative min-w-0 overflow-hidden rounded-3xl border p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised ${m.read ? 'opacity-85' : 'cursor-pointer border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]'}`}
            style={m.read ? cardStyle('--color-brand-teal', 8, 25) : undefined}
          >
            {!m.read && <span className="absolute inset-y-0 left-0 w-1 bg-[var(--color-primary)]" />}
            <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70" aria-hidden="true">✉</span><div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              {teacherNames?.[m.teacher_id] ?? 'Guro'} — tungkol kay {m.children?.name ?? 'anak mo'}
            </p>
            <p className="mt-2 leading-relaxed text-[var(--color-text)]">{m.message}</p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              {new Date(m.created_at).toLocaleString('fil-PH')}
              {!m.read && ' · Bagong mensahe'}
            </p></div>{!m.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-primary)]" aria-label="Bagong mensahe" />}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
