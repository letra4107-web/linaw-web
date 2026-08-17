import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mga Mensahe</h1>
        <p className="text-[var(--color-text-muted)]">Mga mensahe mula sa mga guro ng iyong mga anak.</p>
      </div>

      {isLoading && <p>Naglo-load...</p>}
      {messages && messages.length === 0 && (
        <p className="text-[var(--color-text-muted)]">Wala ka pang natatanggap na mensahe.</p>
      )}

      <ul className="flex flex-col gap-3">
        {(messages ?? []).map((m) => (
          <li
            key={m.id}
            onClick={() => !m.read && markRead.mutate(m.id)}
            className={`rounded-xl border border-[var(--color-border)] p-4 ${
              m.read ? 'bg-[var(--color-surface)]' : 'cursor-pointer bg-[var(--color-primary-soft)]'
            }`}
          >
            <p className="text-sm font-medium">
              {teacherNames?.[m.teacher_id] ?? 'Guro'} — tungkol kay {m.children?.name ?? 'anak mo'}
            </p>
            <p className="mt-1 text-[var(--color-text)]">{m.message}</p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              {new Date(m.created_at).toLocaleString('fil-PH')}
              {!m.read && ' · Bagong mensahe'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
