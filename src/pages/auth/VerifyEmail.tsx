import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { AuthShell, FieldError, inputClass, primaryButtonClass } from '../../components/auth/AuthShell';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });
      if (verifyError) throw verifyError;

      await supabase.from('users').update({ email_verified: true }).eq('email', email);

      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mali ang code. Subukan ulit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="I-verify ang iyong email"
      cardColorVar="--color-brand-violet"
      subtitle={
        email
          ? `Ipinadala namin ang code sa ${email}.`
          : 'Ilagay ang code na natanggap mo sa email.'
      }
      footer={
        <Link to="/resend-verification" state={{ email }} className="text-[var(--color-primary)] underline">
          Hindi natanggap ang code?
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="code" className="mb-2 block text-base font-medium">
            Verification code
          </label>
          <input
            id="code"
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={inputClass}
          />
        </div>
        <FieldError message={error ?? undefined} />
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? 'Nagve-verify...' : 'I-verify'}
        </button>
      </form>
    </AuthShell>
  );
}
