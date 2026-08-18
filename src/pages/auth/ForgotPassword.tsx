import { useState } from 'react';
import { Link } from 'react-router-dom';
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

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      // Always show success (anti-enumeration), matching mobile's backend behavior.
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Nakalimutan ang password?"
      subtitle="Magpapadala kami ng link sa pag-reset sa iyong email."
      cardColorVar="--color-brand-coral"
      footer={
        <Link to="/login" className="font-medium text-[var(--color-primary)] underline">
          ← Bumalik sa Login
        </Link>
      }
    >
      {sent ? (
        <FieldSuccess message="Kung may account na naka-rehistro sa email na iyon, may link kang matatanggap sa pag-reset ng password." />
      ) : (
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
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting && <ButtonSpinner />}
            {submitting ? 'Ipinapadala...' : 'Ipadala ang reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
