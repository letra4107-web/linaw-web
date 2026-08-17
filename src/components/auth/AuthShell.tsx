import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AccessibilityBar } from '../a11y/AccessibilityBar';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const PITCH_POINTS = [
  { icon: '🗣️', label: 'Sanayan sa pagbigkas, may instant na feedback' },
  { icon: '🏅', label: 'Badge at XP na nagpapalakas ng loob ng bata' },
  { icon: '👨‍👩‍👧', label: 'Magkakonekta ang magulang, guro, at bata sa isang lugar' },
];

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] lg:flex">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[var(--color-hero-from)] via-[var(--color-hero-via)] to-[var(--color-hero-to)] px-10 py-12 text-white shadow-hero lg:flex lg:w-[44%] lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 translate-x-1/4 translate-y-1/4 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />

        <Link to="/" className="relative z-10 text-2xl font-bold tracking-tight">
          LinawLetra
        </Link>

        <div className="relative z-10 flex flex-col gap-6">
          <p className="text-3xl leading-snug font-bold">Tulong sa pagbasa ng Tagalog, para sa bawat bata.</p>
          <ul className="flex flex-col gap-4">
            {PITCH_POINTS.map((p) => (
              <li key={p.label} className="flex items-start gap-3 text-white/90">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg"
                  aria-hidden="true"
                >
                  {p.icon}
                </span>
                <span className="pt-1.5 text-sm">{p.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-white/70">
          Ginawa para sa mga mag-aaral na may dyslexia, Grade 1–6.
        </p>
      </div>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 lg:justify-end">
          <Link to="/" className="text-xl font-bold text-[var(--color-primary)] lg:hidden">
            LinawLetra
          </Link>
          <AccessibilityBar />
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
          <div>
            <h1 className="text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-[var(--color-text-muted)]">{subtitle}</p>}
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-card sm:p-8">
            {children}
          </div>
          {footer && <div className="text-center text-sm text-[var(--color-text-muted)]">{footer}</div>}
        </main>
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]"
    >
      <span aria-hidden="true">⚠️</span>
      <span>{message}</span>
    </p>
  );
}

export function FieldSuccess({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] px-3 py-2 text-sm text-[var(--color-success)]"
    >
      <span aria-hidden="true">✅</span>
      <span>{message}</span>
    </p>
  );
}

export const inputClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-base text-[var(--color-text)] transition-colors placeholder:text-[var(--color-text-muted)] focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25';

export const primaryButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-3 text-base font-semibold text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-raised disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none';

export function ButtonSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

type IconInputProps = { icon: string } & InputHTMLAttributes<HTMLInputElement>;

export function IconInput({ icon, className, ...props }: IconInputProps) {
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-text-muted)]"
        aria-hidden="true"
      >
        {icon}
      </span>
      <input {...props} className={`${inputClass} pl-11 ${className ?? ''}`} />
    </div>
  );
}

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
}

export function PasswordInput({ id, value, onChange, autoComplete, placeholder }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} pr-12`}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Itago ang password' : 'Ipakita ang password'}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  );
}

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  let score: 0 | 1 | 2 | 3 = 0;
  if (pw.length >= 8) score = 1;
  if (score === 1 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)) score = 2;
  if (score === 2 && pw.length >= 12 && /[^A-Za-z0-9]/.test(pw)) score = 3;
  const meta = [
    { label: 'Masyadong maikli', color: 'var(--color-danger)' },
    { label: 'Mahina', color: 'var(--color-danger)' },
    { label: 'Katamtaman', color: 'var(--color-brand-amber)' },
    { label: 'Malakas', color: 'var(--color-success)' },
  ][score];
  return { score, ...meta };
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color } = passwordStrength(password);
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: i < score ? color : 'var(--color-border)' }}
          />
        ))}
      </div>
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}
