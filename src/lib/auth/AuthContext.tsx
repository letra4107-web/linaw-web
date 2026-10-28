/* oxlint-disable react/only-export-components -- compatibility export used throughout the app */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { resolveRole, type ResolvedIdentity } from './resolveRole';
import { api } from '../api';

interface AuthState {
  session: Session | null;
  user: User | null;
  identity: ResolvedIdentity | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  refreshIdentity: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [identity, setIdentity] = useState<ResolvedIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const activeUserId = useRef<string | null>(null);
  const identityVersion = useRef(0);

  // Query keys are intentionally narrow within a role, but React Query's
  // in-memory cache is shared by the whole browser application. Clear it at
  // every identity boundary so a saved-profile switch (or logout/login) cannot
  // briefly render another person's private data before its new query resolves.
  const transitionSession = useCallback((nextSession: Session | null) => {
    const nextUserId = nextSession?.user.id ?? null;
    if (activeUserId.current !== nextUserId) {
      queryClient.clear();
      identityVersion.current += 1;
      setIdentity(null);
    }
    activeUserId.current = nextUserId;
    setSession(nextSession);
  }, [queryClient]);

  const loadIdentity = async (user: User | null): Promise<ResolvedIdentity | null> => {
    const version = ++identityVersion.current;
    if (!user) {
      setIdentity(null);
      return null;
    }
    const resolved = await resolveRole(user);
    // A slower request for the previous account must never replace the current
    // identity after a profile switch or logout.
    if (version !== identityVersion.current || activeUserId.current !== user.id) return null;
    setIdentity(resolved);
    return resolved;
  };

  useEffect(() => {
    let mounted = true;
    let initialVersion = identityVersion.current;

    setError(null);
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted || initialVersion !== identityVersion.current) return;
      if (sessionError) throw sessionError;
      transitionSession(data.session);
      const pending = loadIdentity(data.session?.user ?? null);
      initialVersion = identityVersion.current;
      return pending;
    }).catch(() => {
      if (mounted && initialVersion === identityVersion.current) setError('Hindi ma-load ang account ngayon. Pakisubukan muli.');
    }).finally(() => {
      if (mounted && initialVersion === identityVersion.current) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // A one-tap login exchanges a saved refresh token. Supabase reports that
      // exchange as TOKEN_REFRESHED, just like its ordinary hourly refresh.
      // Only reload the identity when it belongs to a *new* user session; this
      // keeps ordinary background refreshes quiet while giving the route guard
      // the student's role before it renders the dashboard.
      const isNewSessionUser = activeUserId.current !== (nextSession?.user.id ?? null);
      transitionSession(nextSession);

      // Supabase refreshes access tokens in the background. That is not a
      // login transition, so reloading the whole identity here makes every
      // dashboard flash and can trigger a fetch/refresh loop.
      if (event === 'TOKEN_REFRESHED' && !isNewSessionUser) return;

      setLoading(true);
      setError(null);
      // Notify the parent on an actual login only -- never on a background token
      // refresh (fires roughly hourly while the app just sits open) or on the
      // page-refresh/persisted-session replay, both of which aren't a new login.
      // Resolve the role before calling the student-only endpoint: Teacher,
      // Parent, and Admin accounts must never generate a forbidden request.
      const pendingIdentity = loadIdentity(nextSession?.user ?? null);
      const version = identityVersion.current;
      pendingIdentity
        .then((resolved) => {
          if (mounted && version === identityVersion.current && event === 'SIGNED_IN' && resolved?.role === 'student') {
            api('/student/notify-login', { method: 'POST', auth: true }).catch(() => {});
          }
        })
        .catch(() => { if (mounted && version === identityVersion.current) setError('Hindi ma-load ang account ngayon. Pakisubukan muli.'); })
        .finally(() => { if (mounted && version === identityVersion.current) setLoading(false); });
    });

    return () => {
      mounted = false;
      identityVersion.current += 1;
      sub.subscription.unsubscribe();
    };
  }, [retryCount, transitionSession]);

  const refreshIdentity = async () => {
    await loadIdentity(session?.user ?? null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, identity, loading, error, retry: () => { setLoading(true); setRetryCount((count) => count + 1); }, refreshIdentity }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
