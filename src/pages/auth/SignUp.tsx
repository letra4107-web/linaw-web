import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  AuthShell,
  ButtonSpinner,
  FieldError,
  IconInput,
  PasswordInput,
  PasswordStrengthMeter,
  inputClass,
  isValidEmail,
  primaryButtonClass,
} from '../../components/auth/AuthShell';

const ROLE = 'parent' as const;

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  agreedToTerms?: string;
}

export default function SignUp() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (cleanEmail: string): FieldErrors => {
    const errors: FieldErrors = {};
    if (firstName.trim().length < 2) errors.firstName = 'Ilagay ang iyong pangalan.';
    if (lastName.trim().length < 2) errors.lastName = 'Ilagay ang iyong apelyido.';
    if (!cleanEmail) errors.email = 'Kailangan ang email.';
    else if (!isValidEmail(cleanEmail)) errors.email = 'Hindi valid ang email.';
    if (!password) errors.password = 'Kailangan ang password.';
    else if (password.length < 8) errors.password = 'Kailangang 8 characters pataas ang password.';
    else if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = 'Kailangan ng malaking letra at numero ang password.';
    }
    if (!confirmPassword) errors.confirmPassword = 'Kumpirmahin ang password.';
    else if (password !== confirmPassword) errors.confirmPassword = 'Hindi magkatugma ang password.';
    if (!agreedToTerms) errors.agreedToTerms = 'Kailangan mong sumang-ayon sa Mga Tuntunin at Kundisyon.';
    return errors;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const errors = validate(cleanEmail);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Normalized once here, not on every keystroke, so the input still shows
    // exactly what the user typed while they're typing it.
    const cleanMiddle = middleInitial.trim().replace(/\.$/, '');
    const cleanName = [firstName.trim(), cleanMiddle ? `${cleanMiddle}.` : '', lastName.trim()]
      .filter(Boolean)
      .join(' ');
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { role: ROLE, full_name: cleanName } },
      });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Hindi nagawa ang account.');

      const { error: profileError } = await supabase.from('users').upsert({
        id: data.user.id,
        email: cleanEmail,
        name: cleanName,
        role: ROLE,
        email_verified: false,
      });
      if (profileError) throw profileError;

      navigate('/verify-email', { state: { email: cleanEmail } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hindi matagumpay ang pag-sign up.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Gumawa ng account"
      maxWidthClassName="max-w-2xl"
      cardColorVar="--color-brand-sage"
      footer={
        <>
          May account ka na?{' '}
          <Link to="/login" className="font-medium text-[var(--color-primary)] underline">
            Mag-login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem_1fr]">
          <div>
            <label htmlFor="firstName" className="mb-2 block text-base font-medium">
              Pangalan
            </label>
            <IconInput
              id="firstName"
              icon="🧑"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              invalid={!!fieldErrors.firstName}
            />
            {fieldErrors.firstName && (
              <div className="mt-2">
                <FieldError message={fieldErrors.firstName} />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="middleInitial" className="mb-2 block text-base font-medium whitespace-nowrap">
              Gitnang Inisyal
            </label>
            <input
              id="middleInitial"
              value={middleInitial}
              onChange={(e) => setMiddleInitial(e.target.value)}
              maxLength={2}
              autoComplete="additional-name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-2 block text-base font-medium">
              Apelyido
            </label>
            <IconInput
              id="lastName"
              icon="🧑"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              invalid={!!fieldErrors.lastName}
            />
            {fieldErrors.lastName && (
              <div className="mt-2">
                <FieldError message={fieldErrors.lastName} />
              </div>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-base font-medium">
            Email
          </label>
          <IconInput
            id="email"
            icon="✉️"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            invalid={!!fieldErrors.email}
          />
          {fieldErrors.email && (
            <div className="mt-2">
              <FieldError message={fieldErrors.email} />
            </div>
          )}
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-base font-medium">
            Password
          </label>
          <div className="flex flex-col gap-2">
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              invalid={!!fieldErrors.password}
            />
            <p className="text-sm text-[var(--color-text-muted)]">
              Dapat 8+ characters ang haba, may malaking titik (A-Z) at numero (0-9).
            </p>
            <PasswordStrengthMeter password={password} />
            {fieldErrors.password && <FieldError message={fieldErrors.password} />}
          </div>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-base font-medium">
            Kumpirmahin ang Password
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            invalid={!!fieldErrors.confirmPassword}
          />
          {fieldErrors.confirmPassword && (
            <div className="mt-2">
              <FieldError message={fieldErrors.confirmPassword} />
            </div>
          )}
        </div>
        <div>
          <label htmlFor="agreedToTerms" className="flex items-start gap-3 text-base">
            <input
              id="agreedToTerms"
              type="checkbox"
              required
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 rounded border-[var(--color-border)] text-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
            />
            <span className="text-[var(--color-text-muted)]">
              Sumasang-ayon ako sa <span className="font-medium text-[var(--color-primary)]">Mga Tuntunin at Kundisyon</span>{' '}
              at sa <span className="font-medium text-[var(--color-primary)]">Patakaran sa Privacy</span>.
            </span>
          </label>
          {fieldErrors.agreedToTerms && (
            <div className="mt-2">
              <FieldError message={fieldErrors.agreedToTerms} />
            </div>
          )}
        </div>
        <FieldError message={error ?? undefined} />
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting && <ButtonSpinner />}
          {submitting ? 'Gumagawa ng account...' : 'Mag-sign up'}
        </button>
      </form>
    </AuthShell>
  );
}
