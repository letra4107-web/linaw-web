import { supabase } from '../supabaseClient';
import { saveAuthProfile, type SavedAuthProfile } from './savedProfiles';

// "Switch profile" logout -- the everyday "Mag-log out" button calls this, not a
// network-revoking sign-out. It saves the current refresh token into the saved-profile
// picker (see savedProfiles.ts, used on the Login page) and clears only the local
// session, deliberately leaving the refresh token valid server-side so tapping the
// saved profile later can exchange it for a fresh session without retyping a password.
//
// Why this is safe enough to ship: Supabase's public signOut() has no "local-only,
// don't revoke" mode -- even `{ scope: 'local' }` still calls the server and revokes the
// current session's refresh token (`scope` only controls WHICH sessions get revoked,
// never whether). So this reaches into the client's private `_removeSession()` to clear
// stored tokens and fire the SIGNED_OUT event without a network call, falling back to a
// full revoke if that private method is ever renamed/removed by a future SDK upgrade.
//
// The trade-off (no immediate server-side revocation on every logout) is bounded by the
// saved-profile TTL (7 days for students, 30 for other roles -- see savedProfiles.ts)
// and by the fact that a real, fully-revoking sign-out is always one tap away from any
// dashboard's account menu.
export async function softSignOut(profile: Omit<SavedAuthProfile, 'savedAt' | 'refreshToken'>) {
  const { data } = await supabase.auth.getSession();
  const refreshToken = data.session?.refresh_token;
  if (refreshToken) saveAuthProfile({ ...profile, refreshToken });

  try {
    await (supabase.auth as unknown as { _removeSession: () => Promise<void> })._removeSession();
  } catch {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  }
}
