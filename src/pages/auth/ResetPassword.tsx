import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  AuthShell,
  ButtonSpinner,
  FieldError,
  PasswordInput,
  PasswordStrengthMeter,
  primaryButtonClass,
} from '../../components/auth/AuthShell';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Kailangang 8+ characters, may malaking letra at numero ang password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Hindi magkatugma ang password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hindi na-reset ang password. Humiling ulit ng link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Gumawa ng bagong password" subtitle="Piliin ang isang malakas na password na hindi mo pa nagamit.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Bagong Password
          </label>
          <div className="flex flex-col gap-2">
            <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" />
            <PasswordStrengthMeter password={password} />
          </div>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
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
          {submitting ? 'Sine-save...' : 'I-save ang password'}
        </button>
      </form>
    </AuthShell>
  );
}
