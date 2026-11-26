import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOutWithAudit } from '../lib/auth/authEvents';
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
  /** Existing role layouts supply an identity scope for visual tokens. */
  roleTheme?: 'student' | 'teacher' | 'parent' | 'admin';
}

export function DashboardShell({
  roleLabel,
  children,
  maxWidthClassName = 'max-w-5xl',
  minimalHeader = false,
  hideHeader = false,
  bgImage,
  roleTheme,
}: DashboardShellProps) {
  const { identity, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const didResume = useRef(false);

  // Keep each signed-in role at its last dashboard page after a reload. The
  // current location is still saved normally as the user navigates.
  useLayoutEffect(() => {
    if (!roleTheme || !user?.id) return;
    const root = `/${roleTheme}`;
    const key = `linaw-dashboard-last-page:${user.id}:${roleTheme}`;
    const current = `${location.pathname}${location.search}${location.hash}`;

    if (!didResume.current) {
      didResume.current = true;
      if (location.pathname === root) {
        try {
          const saved = sessionStorage.getItem(key);
          if (saved?.startsWith(`${root}/`)) {
            navigate(saved, { replace: true });
            return;
          }
        } catch {
          // Keep dashboard navigation usable when browser storage is disabled.
        }
      }
    }

    try {
      sessionStorage.setItem(key, current);
    } catch {
      // Route state remains in the URL even when browser storage is disabled.
    }
  }, [location.hash, location.pathname, location.search, navigate, roleTheme, user?.id]);

  const bgStyle = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundRepeat: 'repeat', backgroundSize: '600px auto' }
    : undefined;

  if (hideHeader) {
    return (
      <div className={`role-${roleTheme ?? 'student'} relative isolate min-h-screen overflow-x-clip bg-[var(--color-bg)] text-[var(--color-text)]`} style={bgStyle}>
        {children}
      </div>
    );
  }

  return (
    <div className={`role-${roleTheme ?? 'student'} relative isolate min-h-screen overflow-x-clip bg-[var(--color-bg)] text-[var(--color-text)]`} style={bgStyle}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 px-6 py-4 shadow-sm backdrop-blur">
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
              onClick={() => void signOutWithAudit()}
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
