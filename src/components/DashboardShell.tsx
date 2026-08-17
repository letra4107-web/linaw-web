import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/auth/AuthContext';
import { AccessibilityBar } from './a11y/AccessibilityBar';
import { IconLabel } from './a11y/IconLabel';
import { NotificationsBell } from './NotificationsBell';

interface DashboardShellProps {
  roleLabel: string;
  children: ReactNode;
}

export function DashboardShell({ roleLabel, children }: DashboardShellProps) {
  const { identity } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
        <div>
          <p className="text-xl font-semibold text-[var(--color-primary)]">LinawLetra</p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {roleLabel} · {identity?.displayName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsBell />
          <AccessibilityBar />
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-danger)]"
          >
            <IconLabel icon="🚪" label="Mag-sign out" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
