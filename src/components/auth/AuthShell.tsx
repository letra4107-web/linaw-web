import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AccessibilityBar } from '../a11y/AccessibilityBar';
import lookImage from '../../assets/look.webp';
import bgImage from '../../assets/bg.webp';
import { cardStyle } from '../../lib/cardStyle';

export function isValidEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  cardColorVar?: string;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  maxWidthClassName = 'max-w-lg',
  cardColorVar = '--color-brand-lavender',
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] lg:flex">
      <div className="relative hidden overflow-hidden text-white shadow-hero lg:flex lg:w-[44%] lg:flex-col">
        <img src={lookImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10"
          aria-hidden="true"
        />

        <div className="relative z-10 flex h-full flex-col px-10 py-12">
          <Link to="/" className="text-2xl font-bold tracking-tight drop-shadow-md">
            LinawLetra
          </Link>

          <p className="mt-10 max-w-[15rem] text-2xl leading-snug font-bold drop-shadow-lg sm:text-3xl">
            Tulong sa pagbasa ng Tagalog, para sa bawat bata.
          </p>

          <p className="mt-auto text-sm text-white/90 drop-shadow-md">
            Ginawa para sa mga mag-aaral na may dyslexia, Grade 1–6.
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col">
        <img src={bgImage} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />

        <div className="relative z-10 flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4 lg:justify-end">
            <Link to="/" className="text-xl font-bold text-[var(--color-primary)] lg:hidden">
              LinawLetra
            </Link>
            <AccessibilityBar />
          </header>
          <main className={`mx-auto flex w-full ${maxWidthClassName} flex-1 flex-col justify-center gap-6 px-6 py-12`}>
            <div className="text-center">
              <h1 className="text-4xl">{title}</h1>
              {subtitle && <p className="mt-3 text-lg text-[var(--color-text-muted)]">{subtitle}</p>}
            </div>
            <div className="rounded-xl border p-8 shadow-card sm:p-10" style={cardStyle(cardColorVar, 8, 30)}>
              {children}
            </div>
            {footer && <div className="text-center text-base text-[var(--color-text-muted)]">{footer}</div>}
          </main>
        </div>
      </div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-4 py-3 text-base text-[var(--color-danger)]"
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
      className="flex items-start gap-2 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] px-4 py-3 text-base text-[var(--color-success)]"
    >
      <span aria-hidden="true">✅</span>
      <span>{message}</span>
    </p>
  );
}

export const inputClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4 text-lg text-[var(--color-text)] transition-colors placeholder:text-[var(--color-text-muted)] focus-visible:border-[var(--color-primary)] focus-visible:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25';

export const primaryButtonClass =
  'flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-4 text-lg font-semibold text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] hover:shadow-raised active:scale-95 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none';

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

type IconInputProps = { icon: string; invalid?: boolean } & InputHTMLAttributes<HTMLInputElement>;

const invalidBorderClass = 'border-[var(--color-danger)] focus-visible:border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]/25';

export function IconInput({ icon, invalid, className, ...props }: IconInputProps) {
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-lg text-[var(--color-text-muted)]"
        aria-hidden="true"
      >
        {icon}
      </span>
      <input
        {...props}
        aria-invalid={invalid || undefined}
        className={`${inputClass} pl-13 ${invalid ? invalidBorderClass : ''} ${className ?? ''}`}
      />
    </div>
  );
}

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  icon?: string;
  invalid?: boolean;
}

export function PasswordInput({ id, value, onChange, autoComplete, placeholder, icon = '🔒', invalid }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-lg text-[var(--color-text-muted)]"
        aria-hidden="true"
      >
        {icon}
      </span>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={`${inputClass} pl-13 pr-14 ${invalid ? invalidBorderClass : ''}`}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Itago ang password' : 'Ipakita ang password'}
        className="absolute top-1/2 right-4 -translate-y-1/2 text-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
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
