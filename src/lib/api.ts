import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL;
const EXPECTED_API_COMPATIBILITY = import.meta.env.VITE_API_COMPATIBILITY_VERSION || '3';
let compatibilityWarningShown = false;

if (!API_URL) throw new Error('Missing VITE_API_URL in .env');

interface ApiOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (opts.auth) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const apiCompatibility = res.headers.get('x-api-compatibility-version');
  if (!compatibilityWarningShown && apiCompatibility !== EXPECTED_API_COMPATIBILITY) {
    compatibilityWarningShown = true;
    console.warn('[LinawLetra] Frontend/API compatibility mismatch.', {
      expected: EXPECTED_API_COMPATIBILITY,
      received: apiCompatibility || 'missing',
    });
  }

  const contentType = res.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return payload as T;
}
