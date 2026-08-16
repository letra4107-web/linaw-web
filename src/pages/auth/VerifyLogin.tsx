import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { api } from '../../lib/api';
import { AuthShell, FieldError, inputClass, primaryButtonClass } from '../../components/auth/AuthShell';

interface LocationState {
  email?: string;
  password?: string;
}

export default function VerifyLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  if (!state.email || !state.password) {
    return (
      <AuthShell title="Kailangan mong mag-login muna">
        <Link to="/login" className="text-[var(--color-primary)] underline">
          Bumalik sa Login
        </Link>
      </AuthShell>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api('/auth/login-otp/verify', {
        method: 'POST',
        body: { email: state.email, code },
      });
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: state.email!,
        password: state.password!,
      });
      if (signInError) throw signInError;
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mali ang code. Subukan ulit.');
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    try {
      await api('/auth/login-otp/send', { method: 'POST', body: { email: state.email } });
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hindi maipadala ang code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Kumpirmahin ang pag-login"
      subtitle={`Ipinadala namin ang 6-digit na code sa ${state.email}.`}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="code" className="mb-1 block text-sm font-medium">
            6-digit na code
          </label>
          <input
            id="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={inputClass}
          />
        </div>
        <FieldError message={error ?? undefined} />
        <button type="submit" disabled={submitting || code.length !== 6} className={primaryButtonClass}>
          {submitting ? 'Nagve-verify...' : 'Kumpirmahin'}
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="text-center text-sm text-[var(--color-primary)] underline"
        >
          {resent ? 'Naipadala ulit ang code' : 'Muling ipadala ang code'}
        </button>
      </form>
    </AuthShell>
  );
}
