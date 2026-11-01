import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { getSavedProfiles } from '../auth/savedProfiles';

interface MessageProfilePhotos { avatars: Record<string, string | null>; ownAvatarUrl: string | null; }
const EMPTY_AVATARS: Record<string, string | null> = {};
export function useMessageProfilePhotos(role: 'parent' | 'teacher') {
  const { user, identity } = useAuth();
  const query = useQuery({
    queryKey: ['message-profile-photos', user?.id, role],
    queryFn: () => api<MessageProfilePhotos>(`/${role}/message-profile-photos`, { auth: true }),
    enabled: Boolean(user), staleTime: 15_000, refetchInterval: 30_000,
    refetchOnWindowFocus: 'always', refetchOnReconnect: 'always', retry: 1,
  });
  const ownAvatarUrl = query.data ? query.data.ownAvatarUrl
    : identity?.avatarUrl ?? getSavedProfiles().find(profile => profile.userId === user?.id)?.avatarUrl ?? null;
  return { ...query, avatars: query.data?.avatars ?? EMPTY_AVATARS, ownAvatarUrl };
}
