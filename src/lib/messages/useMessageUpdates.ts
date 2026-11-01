import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/AuthContext';

// Polling keeps existing deployments current even when these tables have not
// been added to the project's Realtime publication. It only runs on open chats.
export const MESSAGE_REFRESH_MS = 2_000;

export function useMessageUpdates(role: 'parent' | 'teacher') {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const keys = role === 'parent'
      ? ['parent-messages', 'parent-message-replies']
      : ['teacher-sent-messages', 'teacher-parent-message-replies'];
    const refresh = () => {
      for (const key of [...keys, 'message-reactions', 'notifications', 'message-profile-photos']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    };
    const filter = `${role === 'parent' ? 'parent_id' : 'teacher_id'}=eq.${userId}`;
    const channel = supabase.channel(`messages-${role}-${userId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_messages', filter }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parent_teacher_replies', filter }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, refresh)
      .subscribe((status) => { if (status === 'SUBSCRIBED') refresh(); });
    return () => { void supabase.removeChannel(channel); };
  }, [userId, role, queryClient]);
}
