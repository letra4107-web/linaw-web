import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { api } from '../../lib/api';
import {
  AuthShell,
  ButtonSpinner,
  FieldError,
  IconInput,
  PasswordInput,
  isValidEmail,
  primaryButtonClass,
} from '../../components/auth/AuthShell';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError('Ilagay ang valid na email.');
      return;
    }
    if (!password) {
      setError('Ilagay ang password.');
      return;
    }

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

      // Step up to a second factor before granting a persisted dashboard session.
      await supabase.auth.signOut();
      await api('/auth/login-otp/send', { method: 'POST', body: { email: cleanEmail } });
      navigate('/verify-login', { state: { email: cleanEmail, password } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hindi matagumpay ang pag-login.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Maligayang pagbabalik"
      subtitle="Para sa magulang, guro, mag-aaral, at admin."
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
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
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
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs text-[var(--color-primary)] underline">
              Nakalimutan?
            </Link>
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
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
