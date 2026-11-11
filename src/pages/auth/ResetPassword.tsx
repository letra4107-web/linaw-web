import {showFormFeedback} from '../../lib/formFeedback';
import { tagalogError } from '../../lib/validationMessages';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Link } from 'react-router-dom';
import {
  AuthShell,
  ButtonSpinner,
  FieldError,
  PasswordInput,
  PasswordStrengthMeter,
  IconInput,
  isValidEmail,
  primaryButtonClass,
} from '../../components/auth/AuthShell';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError('Ilagay ang email na ginamit sa pag-reset.');
      return;
    }
    if (!/^(?:\d{6}|\d{8})$/.test(code)) {
      setError("Ilagay ang code sa pagpapatunay mula sa email.");
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Kailangang may hindi bababa sa 8 karakter, malaking letra, at numero ang password.");
      return;
    }
    if (password !== confirmPassword) {
      setError('Hindi magkatugma ang password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api('/auth/complete-password-reset',{method:'POST',body:{email:cleanEmail,code,password}});
      showFormFeedback('Matagumpay na napalitan ang iyong password. Mag-login gamit ang bagong password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? tagalogError(err) : 'Hindi na-reset ang password. Humiling ulit ng code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="I-reset ang iyong password"
      subtitle="Ilagay ang code mula sa email at pumili ng bagong password."
      cardColorVar="--color-brand-teal"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-2 block text-base font-medium">Email</label>
          <IconInput id="email" icon="✉" type="email" required value={email} onChange={(event) => { setEmail(event.target.value); setError(null); }} autoComplete="email" />
        </div>
        <div>
          <label htmlFor="code" className="mb-2 block text-base font-medium">Verification code</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 8)); setError(null); }} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4 text-center text-xl font-bold tracking-[0.35em] text-[var(--color-text)] focus-visible:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25" />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-base font-medium">
            Bagong Password
          </label>
          <div className="flex flex-col gap-2">
            <PasswordInput id="password" value={password} onChange={(value) => { setPassword(value); setError(null); }} autoComplete="new-password" />
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
            onChange={(value) => { setConfirmPassword(value); setError(null); }}
            autoComplete="new-password"
          />
        </div>
        <p>Para sa student username, tingnan ang inbox ng naka-link na magulang. <Link to="/forgot-password">Humiling ulit ng code</Link></p>
        <FieldError message={error ?? undefined} />
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting && <ButtonSpinner />}
          {submitting ? 'Sine-save...' : 'I-save ang password'}
        </button>
      </form>
    </AuthShell>
  );
}
