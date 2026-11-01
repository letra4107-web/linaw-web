import { supabase } from '../supabaseClient';
import type { SavedAuthProfile } from './savedProfiles';

/** Read the uploaded photo from the same role table as the dashboard, before logout. */
export async function loadProfileAvatar(userId: string, role: SavedAuthProfile['role']): Promise<string | null | undefined> {
  const source = role === 'parent' ? ['parents', 'auth_uid'] : role === 'teacher' ? ['teacher_profiles', 'user_id'] : ['users', 'id'];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const { data, error } = await supabase.from(source[0]).select('avatar_url').eq(source[1], userId).abortSignal(controller.signal).maybeSingle();
    // A temporary read failure must not erase a previously saved photo or block logout.
    if (error) return undefined;
    return data?.avatar_url ?? null;
  } catch { return undefined; }
  finally { clearTimeout(timeout); }
}
