import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AccessibilityBar } from '../a11y/AccessibilityBar';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <Link to="/" className="text-xl font-semibold text-[var(--color-primary)]">
          LinawLetra
        </Link>
        <AccessibilityBar />
      </header>
      <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-12">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-[var(--color-text-muted)]">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="text-sm text-[var(--color-text-muted)]">{footer}</div>}
      </main>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-[var(--color-danger)]">
      {message}
    </p>
  );
}

export const inputClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text)] focus-visible:border-[var(--color-primary)]';

export const primaryButtonClass =
  'w-full rounded-lg bg-[var(--color-primary)] px-4 py-3 text-base font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60';
