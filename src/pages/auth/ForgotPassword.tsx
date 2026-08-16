import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { AuthShell, FieldError, inputClass, primaryButtonClass } from '../../components/auth/AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
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
      footer={
        <Link to="/login" className="text-[var(--color-primary)] underline">
          Bumalik sa Login
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-lg bg-[var(--color-surface)] p-4 text-sm">
          Kung may account na naka-rehistro sa email na iyon, may link kang matatanggap sa
          pag-reset ng password.
        </p>
      ) : (
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
            />
          </div>
          <FieldError message={error ?? undefined} />
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? 'Ipinapadala...' : 'Ipadala ang reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
