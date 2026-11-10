// One-tap re-login stores only the most recently used saved-profile ticket in
// localStorage (never the password, only a
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
  avatarUrl?: string | null;
  refreshToken: string;
  savedAt: string; // ISO timestamp, refreshed on every successful login/relogin
};

const STORE_KEY = 'linawletra.savedProfiles.v1';
const STUDENT_TTL_DAYS = 7;
const DEFAULT_TTL_DAYS = 30;
const ttlDaysFor = (role: SavedAuthProfile['role']) => (role === 'student' ? STUDENT_TTL_DAYS : DEFAULT_TTL_DAYS);

export function savedAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function readAll(): SavedAuthProfile[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((profile): profile is SavedAuthProfile => (
      profile !== null && typeof profile === 'object'
      && ['admin', 'parent', 'student', 'teacher'].includes(profile.role)
      && ['userId', 'displayName', 'email', 'refreshToken', 'savedAt'].every((key) => typeof profile[key] === 'string')
      && Boolean(profile.userId) && Boolean(profile.refreshToken)
      && Number.isFinite(Date.parse(profile.savedAt))
    )).map(profile => ({ ...profile, avatarUrl: savedAvatarUrl(profile.avatarUrl) })) : [];
  } catch {
    return [];
  }
}

function writeAll(profiles: SavedAuthProfile[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(profiles));
  } catch {
    // Saved profiles are optional; quota/privacy settings must not break auth.
  }
}

/** Returns saved profiles, pruning (and persisting the prune of) any past their role's TTL of disuse. */
export function getSavedProfiles(): SavedAuthProfile[] {
  const all = readAll();
  const now = Date.now();
  const fresh = all
    .filter((p) => now - new Date(p.savedAt).getTime() < ttlDaysFor(p.role) * 86400000)
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
    .slice(0, 1);
  if (fresh.length !== all.length) writeAll(fresh);
  return fresh;
}

/** Replaces the saved ticket so one-tap login always belongs to the last account used. */
export function saveAuthProfile(profile: Omit<SavedAuthProfile, 'savedAt'>) {
  const existing = readAll();
  const previous = existing.find(item => item.userId === profile.userId);
  const avatarUrl = profile.avatarUrl === undefined ? previous?.avatarUrl ?? null : savedAvatarUrl(profile.avatarUrl);
  writeAll([{ ...profile, avatarUrl, savedAt: new Date().toISOString() }]);
}

export function removeSavedProfile(userId: string) {
  writeAll(readAll().filter((p) => p.userId !== userId));
}

export function clearSavedProfiles() {
  writeAll([]);
}

/** Called after a saved profile is successfully used to relogin -- Supabase rotates
 * refresh tokens on use, so the new one must replace the old or the saved profile
 * would only ever work once. */
export function updateSavedProfileToken(userId: string, refreshToken: string) {
  const next = readAll().map((p) => (p.userId === userId ? { ...p, refreshToken, savedAt: new Date().toISOString() } : p));
  writeAll(next);
}
