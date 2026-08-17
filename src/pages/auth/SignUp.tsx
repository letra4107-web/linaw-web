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
  isValidEmail,
  primaryButtonClass,
} from '../../components/auth/AuthShell';

const ROLE = 'parent' as const;

export default function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (name.trim().length < 2) return 'Ilagay ang buong pangalan.';
    if (!isValidEmail(email.trim())) return 'Hindi valid ang email.';
    if (password.length < 8) return 'Kailangang 8 characters pataas ang password.';
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return 'Kailangan ng malaking letra at numero ang password.';
    }
    if (password !== confirmPassword) return 'Hindi magkatugma ang password.';
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    // Normalized once here, not on every keystroke, so the input still shows
    // exactly what the user typed while they're typing it.
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    setError(null);
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
      title="Gumawa ng account ng magulang"
      subtitle="Dito mo ie-enroll ang iyong anak — makukuha ng bata ang sariling login sa email mo."
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
        <div>
          <label htmlFor="name" className="mb-2 block text-base font-medium">
            Buong Pangalan
          </label>
          <IconInput id="name" icon="🧑" required value={name} onChange={(e) => setName(e.target.value)} />
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
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-base font-medium">
            Password
          </label>
          <div className="flex flex-col gap-2">
            <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" />
            <PasswordStrengthMeter password={password} />
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
          />
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
