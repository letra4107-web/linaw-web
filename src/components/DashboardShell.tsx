import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/auth/AuthContext';
import logo from '../assets/Logo.jpg';
import { AccessibilityBar } from './a11y/AccessibilityBar';
import { IconLabel } from './a11y/IconLabel';
import { NotificationsBell } from './NotificationsBell';

interface DashboardShellProps {
  roleLabel: string;
  children: ReactNode;
  maxWidthClassName?: string;
  /** When true, the header only shows the logo — the role layout owns notifications/accessibility/sign-out. */
  minimalHeader?: boolean;
  /** When true, skip the top header entirely — the role layout owns the logo, and children render full-bleed. */
  hideHeader?: boolean;
  /** Optional tiled background image (e.g. import().webp) shown behind the whole shell. */
  bgImage?: string;
}

export function DashboardShell({
  roleLabel,
  children,
  maxWidthClassName = 'max-w-5xl',
  minimalHeader = false,
  hideHeader = false,
  bgImage,
}: DashboardShellProps) {
  const { identity } = useAuth();

  const bgStyle = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundRepeat: 'repeat', backgroundSize: '600px auto' }
    : undefined;

  if (hideHeader) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]" style={bgStyle}>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]" style={bgStyle}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="LinawLetra" className="h-10 w-auto rounded-lg" />
          {!minimalHeader && (
            <div>
              <p className="text-xl font-semibold text-[var(--color-primary)]">LinawLetra</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {roleLabel} · {identity?.displayName}
              </p>
            </div>
          )}
        </div>
        {!minimalHeader && (
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
        )}
      </header>
      <main className={`mx-auto ${maxWidthClassName} px-6 py-10`}>{children}</main>
    </div>
  );
}
