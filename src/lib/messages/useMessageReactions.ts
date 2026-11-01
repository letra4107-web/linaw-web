import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { MESSAGE_REFRESH_MS } from './useMessageUpdates';

export type ReactionTarget = { kind: 'teacher' | 'reply'; id: string };
type ReactionRow = { id: string; user_id: string; teacher_message_id: string | null; parent_reply_id: string | null; emoji: string };
export function useMessageReactions(targets: ReactionTarget[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const savingRef = useRef(false);
  const teacherIds = [...new Set(targets.filter((t) => t.kind === 'teacher').map((t) => t.id))].sort();
  const replyIds = [...new Set(targets.filter((t) => t.kind === 'reply').map((t) => t.id))].sort();
  const query = useQuery({
    queryKey: ['message-reactions', user?.id, teacherIds, replyIds],
    enabled: Boolean(user && targets.length),
    refetchInterval: MESSAGE_REFRESH_MS,
    queryFn: async () => {
      const fields = 'id,user_id,teacher_message_id,parent_reply_id,emoji';
      const results = await Promise.all([
        teacherIds.length ? supabase.from('message_reactions').select(fields).in('teacher_message_id', teacherIds) : Promise.resolve({ data: [], error: null }),
        replyIds.length ? supabase.from('message_reactions').select(fields).in('parent_reply_id', replyIds) : Promise.resolve({ data: [], error: null }),
      ]);
      const error = results.find((result) => result.error)?.error;
      if (error?.code === 'PGRST205' || error?.code === '42P01') return { available: false, rows: [] as ReactionRow[] };
      if (error) throw error;
      return { available: true, rows: results.flatMap((result) => result.data ?? []) as ReactionRow[] };
    },
  });
  const mutation = useMutation({
    mutationFn: async ({ target, emoji }: { target: ReactionTarget; emoji: string | null }) => {
      const { error } = await supabase.rpc('set_message_reaction', { p_kind: target.kind, p_message_id: target.id, p_emoji: emoji });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['message-reactions'] }),
    onSettled: () => { savingRef.current = false; },
  });
  const forTarget = (target: ReactionTarget) => (query.data?.rows ?? []).filter((row) => (target.kind === 'teacher' ? row.teacher_message_id : row.parent_reply_id) === target.id);
  const react = (target: ReactionTarget, emoji: string) => {
    if (savingRef.current || !user || !query.data?.available) return;
    savingRef.current = true;
    const own = forTarget(target).find((row) => row.user_id === user.id);
    mutation.mutate({ target, emoji: own?.emoji === emoji ? null : emoji });
  };
  return { forTarget, react, userId: user?.id, ready: query.data?.available === true && !query.isError, busy: mutation.isPending, failed: query.isError || mutation.isError, retry: () => { mutation.reset(); void query.refetch(); } };
}
