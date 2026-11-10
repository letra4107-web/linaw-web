import { api } from '../../lib/api';
import { tagalogError } from '../../lib/validationMessages';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  AuthShell,
  ButtonSpinner,
  FieldError,
  IconInput,
  PasswordInput,
  inputClass,
  isValidEmail,
  primaryButtonClass,
} from '../../components/auth/AuthShell';
import { trackEvent } from '../../lib/analytics';

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

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setError(null);
  };

  const validate = (cleanEmail: string): FieldErrors => {
    const errors: FieldErrors = {};
    if (firstName.trim().length < 2) errors.firstName = 'Ilagay ang iyong pangalan.';
    if (lastName.trim().length < 2) errors.lastName = 'Ilagay ang iyong apelyido.';
    if (!cleanEmail) errors.email = 'Kailangan ang email.';
    else if (!isValidEmail(cleanEmail)) errors.email = "Hindi wasto ang email address.";
    if (!password) errors.password = 'Kailangan ang password.';
    else if (password.length < 8) errors.password = "Kailangang may hindi bababa sa 8 karakter ang password.";
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
    trackEvent('signup_started', { role: ROLE });

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

      // Email confirmation normally returns a user without a session. Profile
      // writes then fail RLS even though the Auth account was created. The
      // confirmed sign-in repairs a missing profile from this signup metadata.
      if (data.session) {
        const { error: profileError } = await supabase.from('users').upsert({
          id: data.user.id,
          email: cleanEmail,
          name: cleanName,
          role: ROLE,
          email_verified: false,
        });
        if (profileError) throw profileError;
      }

      let deliveryPending = false;
      if (data.session) try { await api('/auth/email-verification/request', {method:'POST',body:{email:cleanEmail,userId:data.user.id}}); } catch { deliveryPending = true; }
      trackEvent('signup_completed', { role: ROLE });

      navigate('/verify-email', { state: { email: cleanEmail, userId: data.user.id, deliveryPending } });
    } catch (err) {
      setError(err instanceof Error ? tagalogError(err) : 'Hindi matagumpay ang pag-sign up.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Gumawa ng account"
      eyebrow="Simulan ang Paglalakbay!"
      subtitle="Gumawa ng iyong LinawLetra account at simulan ang mas masayang paglalakbay sa pagbasa."
      maxWidthClassName="max-w-2xl"
      cardColorVar="--color-brand-sage"
      variant="signup"
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
        <p className="auth-signup-welcome" role="status">🦉 Tara, magsimula tayo!</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem_1fr]">
          <div>
            <label htmlFor="firstName" className="mb-2 block text-base font-medium">
              Pangalan
            </label>
            <input
              id="firstName"
              required
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); clearFieldError('firstName'); }}
              autoComplete="given-name"
              aria-invalid={!!fieldErrors.firstName || undefined}
              aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
              className={`${inputClass} ${fieldErrors.firstName ? 'border-[var(--color-danger)] focus-visible:border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]/25' : ''}`}
            />
            {fieldErrors.firstName && (
              <div className="mt-2">
                <FieldError id="firstName-error" message={fieldErrors.firstName} />
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
              onChange={(e) => { setMiddleInitial(e.target.value); setError(null); }}
              maxLength={2}
              autoComplete="additional-name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-2 block text-base font-medium">
              Apelyido
            </label>
            <input
              id="lastName"
              required
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); clearFieldError('lastName'); }}
              autoComplete="family-name"
              aria-invalid={!!fieldErrors.lastName || undefined}
              aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
              className={`${inputClass} ${fieldErrors.lastName ? 'border-[var(--color-danger)] focus-visible:border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]/25' : ''}`}
            />
            {fieldErrors.lastName && (
              <div className="mt-2">
                <FieldError id="lastName-error" message={fieldErrors.lastName} />
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
            onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
            autoComplete="email"
            invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            placeholder="halimbawa@email.com"
          />
          {fieldErrors.email && (
            <div className="mt-2">
              <FieldError id="email-error" message={fieldErrors.email} />
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
              onChange={(value) => { setPassword(value); clearFieldError('password'); clearFieldError('confirmPassword'); }}
              autoComplete="new-password"
              invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            <p className="auth-password-helper">Gumamit ng hindi bababa sa 8 karakter na may malaking titik (A–Z) at numero (0–9).</p>
            <ul className="auth-password-checklist" aria-label="Mga kailangan sa password">
              <li className={password.length >= 8 ? 'complete' : ''}>{password.length >= 8 ? '✓' : '○'} Hindi bababa sa 8 karakter</li>
              <li className={/[A-Z]/.test(password) ? 'complete' : ''}>{/[A-Z]/.test(password) ? '✓' : '○'} May malaking titik (A–Z)</li>
              <li className={/[0-9]/.test(password) ? 'complete' : ''}>{/[0-9]/.test(password) ? '✓' : '○'} May numero (0–9)</li>
            </ul>
            {fieldErrors.password && <FieldError id="password-error" message={fieldErrors.password} />}
          </div>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-base font-medium">
            Kumpirmahin ang Password
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(value) => { setConfirmPassword(value); clearFieldError('confirmPassword'); }}
            autoComplete="new-password"
            invalid={!!fieldErrors.confirmPassword}
            aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
          />
          {fieldErrors.confirmPassword && (
            <div className="mt-2">
              <FieldError id="confirmPassword-error" message={fieldErrors.confirmPassword} />
            </div>
          )}
          {confirmPassword && password === confirmPassword && !fieldErrors.confirmPassword && <p className="auth-password-match" role="status">✓ Magkatugma ang password</p>}
        </div>
        <div>
          <label htmlFor="agreedToTerms" className="flex items-start gap-3 text-base">
            <input
              id="agreedToTerms"
              type="checkbox"
              required
              checked={agreedToTerms}
              aria-invalid={!!fieldErrors.agreedToTerms || undefined}
              aria-describedby={fieldErrors.agreedToTerms ? 'agreedToTerms-error' : undefined}
              onChange={(e) => { setAgreedToTerms(e.target.checked); clearFieldError('agreedToTerms'); }}
              className="mt-1 h-5 w-5 shrink-0 rounded border-[var(--color-border)] text-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
            />
            <span className="text-[var(--color-text-muted)]">
              Sumasang-ayon ako sa <Link to="/terms" className="font-medium text-[var(--color-primary)] underline">Mga Tuntunin at Kundisyon</Link>{' '}
              at sa <Link to="/privacy" className="font-medium text-[var(--color-primary)] underline">Patakaran sa Privacy</Link>.
            </span>
          </label>
          {fieldErrors.agreedToTerms && (
            <div className="mt-2">
              <FieldError id="agreedToTerms-error" message={fieldErrors.agreedToTerms} />
            </div>
          )}
        </div>
        <FieldError message={error ?? undefined} />
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting && <ButtonSpinner />}
          {submitting ? 'Gumagawa ng account...' : 'Gumawa ng Account'}
        </button>
      </form>
    </AuthShell>
  );
}
