import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  AuthShell,
  ButtonSpinner,
  FieldError,
  FieldSuccess,
  IconInput,
  isValidEmail,
  primaryButtonClass,
} from '../../components/auth/AuthShell';

export default function ResendVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError('Ilagay ang valid na email.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: cleanEmail });
      if (resendError) throw resendError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hindi maipadala ang code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Muling ipadala ang verification code"
      subtitle="Hindi mo kailangang ulitin ang buong sign up."
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
          />
        </div>
        <FieldError message={error ?? undefined} />
        {sent && <FieldSuccess message="Naipadala ang bagong code. Suriin ang iyong email." />}
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting && <ButtonSpinner />}
          {submitting ? 'Ipinapadala...' : 'Ipadala ang code'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/verify-email', { state: { email } })}
          className="text-center text-sm font-medium text-[var(--color-primary)] underline"
        >
          Mayroon na akong code
        </button>
      </form>
    </AuthShell>
  );
}
