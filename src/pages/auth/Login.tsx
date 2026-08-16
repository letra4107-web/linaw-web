import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { api } from '../../lib/api';
import { AuthShell, FieldError, inputClass, primaryButtonClass } from '../../components/auth/AuthShell';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (!data.user) throw new Error('Hindi makumpleto ang pag-login.');

      if (!data.user.email_confirmed_at) {
        // Not yet verified: keep the session so /verify-email can act on it.
        navigate('/verify-email', { state: { email } });
        return;
      }

      // Step up to a second factor before granting a persisted dashboard session.
      await supabase.auth.signOut();
      await api('/auth/login-otp/send', { method: 'POST', body: { email } });
      navigate('/verify-login', { state: { email, password } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hindi matagumpay ang pag-login.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Mag-login"
      subtitle="Para sa magulang, guro, mag-aaral, at admin."
      footer={
        <>
          Wala pang account?{' '}
          <Link to="/signup" className="text-[var(--color-primary)] underline">
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
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="current-password"
          />
        </div>
        <FieldError message={error ?? undefined} />
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? 'Naglo-login...' : 'Mag-login'}
        </button>
        <Link to="/forgot-password" className="text-center text-sm text-[var(--color-primary)] underline">
          Nakalimutan ang password?
        </Link>
      </form>
    </AuthShell>
  );
}
