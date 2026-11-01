import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Start a clean local auth store after the previous development token was
    // revoked. This prevents localhost from repeatedly restoring that broken
    // refresh token on every page load.
    storageKey: 'linawletra-auth-v2',
  },
});

/** Check a password without replacing the current browser or MFA session. */
export async function verifyAccountPassword(email: string, password: string, expectedUserId: string) {
  const verifier = createClient(url, anonKey, { auth: {
    persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
    storageKey: `linawletra-password-check-${crypto.randomUUID()}`,
  } });
  try {
    const { data, error } = await verifier.auth.signInWithPassword({ email, password });
    if (error || data.user?.id !== expectedUserId) throw new Error('Hindi tama ang kasalukuyang password.');
  } finally {
    await verifier.auth.signOut({ scope: 'local' }).catch(() => {});
  }
}
