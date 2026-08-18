import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { dashboardPathForRole, resolveRole } from '../../lib/auth/resolveRole';
import {
  AuthShell,
  ButtonSpinner,
  FieldError,
  IconInput,
  PasswordInput,
  isValidEmail,
  primaryButtonClass,
} from '../../components/auth/AuthShell';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (cleanEmail: string): FieldErrors => {
    const errors: FieldErrors = {};
    if (!cleanEmail) errors.email = 'Kailangan ang email.';
    else if (!isValidEmail(cleanEmail)) errors.email = 'Hindi valid ang email.';
    if (!password) errors.password = 'Kailangan ang password.';
    return errors;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const errors = validate(cleanEmail);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (signInError) throw signInError;
      if (!data.user) throw new Error('Hindi makumpleto ang pag-login.');

      if (!data.user.email_confirmed_at) {
        // Not yet verified: keep the session so /verify-email can act on it.
        navigate('/verify-email', { state: { email: cleanEmail } });
        return;
      }

      const identity = await resolveRole(data.user);
      navigate(identity ? dashboardPathForRole(identity.role) : '/verify-email', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hindi matagumpay ang pag-login.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Maligayang pagbabalik"
      cardColorVar="--color-brand-lavender"
      footer={
        <>
          Wala pang account?{' '}
          <Link to="/signup" className="font-medium text-[var(--color-primary)] underline">
            Mag-sign up
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
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
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="block text-base font-medium">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs text-[var(--color-primary)] underline">
              Nakalimutan?
            </Link>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={!!fieldErrors.password}
          />
          {fieldErrors.password && (
            <div className="mt-2">
              <FieldError message={fieldErrors.password} />
            </div>
          )}
        </div>
        <FieldError message={error ?? undefined} />
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting && <ButtonSpinner />}
          {submitting ? 'Naglo-login...' : 'Mag-login'}
        </button>
      </form>
    </AuthShell>
  );
}
