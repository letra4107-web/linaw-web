import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { resolveRole, type ResolvedIdentity } from './resolveRole';

interface AuthState {
  session: Session | null;
  user: User | null;
  identity: ResolvedIdentity | null;
  loading: boolean;
  refreshIdentity: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [identity, setIdentity] = useState<ResolvedIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  const loadIdentity = async (user: User | null) => {
    if (!user) {
      setIdentity(null);
      return;
    }
    const resolved = await resolveRole(user);
    setIdentity(resolved);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadIdentity(data.session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(true);
      loadIdentity(nextSession?.user ?? null).finally(() => setLoading(false));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshIdentity = async () => {
    await loadIdentity(session?.user ?? null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, identity, loading, refreshIdentity }}
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
