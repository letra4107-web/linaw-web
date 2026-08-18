// One-tap re-login ("remember me" profile picker, like Facebook/Netflix's account
// switcher) -- web port of the mobile app's src/services/authProfileStore.ts. Stores a
// small list of saved-profile tickets in localStorage (never the password, only a
// Supabase refresh token), in a key deliberately separate from Supabase's own session
// token storage, so a soft "Mag-log out" (see softSignOut.ts) doesn't touch this list.
// Profiles expire after a TTL of disuse regardless of whether the refresh token itself
// is still technically valid -- students get a shorter window (7 days) than other roles
// (30 days) since this is a shared-device, child-safety context.

export type SavedAuthProfile = {
  userId: string;
  role: 'admin' | 'parent' | 'student' | 'teacher';
  displayName: string;
  email: string;
  refreshToken: string;
  savedAt: string; // ISO timestamp, refreshed on every successful login/relogin
};

const STORE_KEY = 'linawletra.savedProfiles.v1';
const MAX_PROFILES = 5;
const STUDENT_TTL_DAYS = 7;
const DEFAULT_TTL_DAYS = 30;
const ttlDaysFor = (role: SavedAuthProfile['role']) => (role === 'student' ? STUDENT_TTL_DAYS : DEFAULT_TTL_DAYS);

function readAll(): SavedAuthProfile[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(profiles: SavedAuthProfile[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(profiles));
}

/** Returns saved profiles, pruning (and persisting the prune of) any past their role's TTL of disuse. */
export function getSavedProfiles(): SavedAuthProfile[] {
  const all = readAll();
  const now = Date.now();
  const fresh = all.filter((p) => now - new Date(p.savedAt).getTime() < ttlDaysFor(p.role) * 86400000);
  if (fresh.length !== all.length) writeAll(fresh);
  return fresh;
}

/** Upserts by userId (moves it to the front) and evicts the oldest past MAX_PROFILES. */
export function saveAuthProfile(profile: Omit<SavedAuthProfile, 'savedAt'>) {
  const filtered = readAll().filter((p) => p.userId !== profile.userId);
  const next = [{ ...profile, savedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_PROFILES);
  writeAll(next);
}

export function removeSavedProfile(userId: string) {
  writeAll(readAll().filter((p) => p.userId !== userId));
}

/** Called after a saved profile is successfully used to relogin -- Supabase rotates
 * refresh tokens on use, so the new one must replace the old or the saved profile
 * would only ever work once. */
export function updateSavedProfileToken(userId: string, refreshToken: string) {
  const next = readAll().map((p) => (p.userId === userId ? { ...p, refreshToken, savedAt: new Date().toISOString() } : p));
  writeAll(next);
}
