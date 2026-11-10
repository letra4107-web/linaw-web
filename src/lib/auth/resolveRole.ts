import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { recordAuthEvent } from './authEvents';

export type AppRole = 'admin' | 'parent' | 'student' | 'teacher';

export interface ResolvedIdentity {
  role: AppRole;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

const KNOWN_ROLES: AppRole[] = ['admin', 'parent', 'student', 'teacher'];

function normalizeRole(raw: unknown): AppRole | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  return (KNOWN_ROLES as string[]).includes(value) ? (value as AppRole) : null;
}

/**
 * Mirrors mobile's completeAuthSession() in src/services/supabaseService.ts:
 * users.role is authoritative when present; a matching children.auth_uid row
 * always forces 'student' (covers accounts mis-tagged during enrollment).
 * Falls back to self-healing an unknown-role email account into 'parent'.
 */
export async function resolveRole(user: User): Promise<ResolvedIdentity | null> {
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  const { data: childRow, error: childError } = await supabase
    .from('children')
    .select('id, name, parent_id, auth_uid')
    .eq('auth_uid', user.id)
    .maybeSingle();
  if (childError) throw childError;
  if (profile?.is_active === false || ['disabled', 'archived'].includes(profile?.account_status)) {
    throw new Error('Hindi aktibo ang account na ito. Makipag-ugnayan sa administrator.');
  }

  let role = normalizeRole(profile?.role);
  let displayName = profile?.name ?? profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? 'User';

  if (childRow) {
    role = 'student';
    displayName = childRow.name ?? displayName;
  }

  const emailVerified = Boolean(user.email_confirmed_at) && profile?.email_verified === true;

  if (!role) {
    if (profile) throw new Error('Hindi matukoy ang role ng account na ito.');
    // Missing profiles are created by the server after a fresh email code.
    role = 'parent';
  }

  if (role === 'student' || emailVerified) await supabase
    .from('users')
    .update({ lastLoginAt: new Date().toISOString() })
    .eq('id', user.id);
  // Server-authenticated, best-effort login audit. No credentials or tokens are sent.
  if (role === 'student' || emailVerified) void recordAuthEvent('login').catch(() => {});

  return {
    role,
    displayName,
    avatarUrl: profile?.avatar_url ?? null,
    emailVerified,
  };
}

export function dashboardPathForRole(role: AppRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'parent':
      return '/parent';
    case 'student':
      return '/student';
    case 'teacher':
      return '/teacher';
  }
}
