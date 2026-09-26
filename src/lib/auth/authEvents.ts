import { api } from '../api';
import { supabase } from '../supabaseClient';

type AuthEvent = 'login' | 'logout';

function platform() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ? 'mobile' : 'web';
}

function sessionId() {
  const key = 'linawletra.auditSessionId.v1';
  let value = sessionStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); sessionStorage.setItem(key, value); }
  return value;
}

/** Sends no credential material: only a platform label and opaque session id. */
export function recordAuthEvent(type: AuthEvent) {
  return api('/auth/events', { method: 'POST', auth: true, body: { type, platform: platform(), sessionId: sessionId() } });
}

export async function signOutWithAudit() {
  await recordAuthEvent('logout').catch(() => {});
  await supabase.auth.signOut();
}
