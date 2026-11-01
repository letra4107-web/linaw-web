import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import { useAuth } from './auth/AuthContext';
import { api } from './api';
import { showParentInAppNotice, showTeacherInAppNotice, type ParentNoticePreferences } from './notificationPreferences';
import { useTeacherPreferences } from './teacher/useTeacherPreferences';

export interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  message: string | null;
  type: string;
  is_read: boolean;
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user, identity } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['notifications', user?.id];
  const parent = identity?.role === 'parent';
  const { preferences:teacherPreferences } = useTeacherPreferences();
  const { data: preferences } = useQuery({
    queryKey: ['parent-notification-preferences', user?.id],
    enabled: Boolean(user && parent),
    queryFn: async () => {
      const { data, error } = await supabase.from('parents_settings').select('notification_preferences').eq('auth_uid', user!.id).maybeSingle();
      if (error) throw error;
      return (data?.notification_preferences ?? null) as ParentNoticePreferences | null;
    },
  });

  // Notifications can target a user via user_id, parent_id, or (for a
  // parent's children) student_id/child auth_uid -- RLS only allows a plain
  // client-side query to see user_id=auth.uid() rows, so this goes through
  // the backend's service-role-backed union query instead.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api<{ notifications: NotificationRow[] }>('/notifications', { auth: true });
      return res.notifications;
    },
    enabled: Boolean(user),
    refetchInterval: 5_000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });

  useEffect(() => {
    if (!user) return;
    // Channel name must be unique per mount -- in React 18 dev StrictMode
    // (and on fast route changes) the cleanup's removeChannel() can still be
    // in flight when the next effect fires, and supabase-js reuses an
    // existing channel of the same name instead of creating a fresh one,
    // which throws when .on() is called on an already-subscribed channel.
    const channel = supabase
      .channel(`notifications-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await api(`/notifications/${id}/read`, { method: 'POST', auth: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await api('/notifications/read-all', { method: 'POST', auth: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const notifications = parent ? (data ?? []).filter((row) => showParentInAppNotice(row, preferences)) : identity?.role==='teacher' ? (data ?? []).filter(row=>showTeacherInAppNotice(row,teacherPreferences.notices)) : data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, isLoading, error, refetch, markAsRead, markAllAsRead };
}
