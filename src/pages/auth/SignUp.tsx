import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import {
  AuthShell,
  ButtonSpinner,
  FieldError,
  IconInput,
  PasswordInput,
  PasswordStrengthMeter,
  primaryButtonClass,
} from '../../components/auth/AuthShell';

type SignUpRole = 'parent' | 'teacher';

const ROLE_OPTIONS: { value: SignUpRole; icon: string; label: string }[] = [
  { value: 'parent', icon: '👨‍👩‍👧', label: 'Magulang' },
  { value: 'teacher', icon: '🧑‍🏫', label: 'Guro' },
];

export default function SignUp() {
  const navigate = useNavigate();
  const [role, setRole] = useState<SignUpRole>('parent');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (name.trim().length < 2) return 'Ilagay ang buong pangalan.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Hindi valid ang email.';
    if (password.length < 8) return 'Kailangang 8 characters pataas ang password.';
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return 'Kailangan ng malaking letra at numero ang password.';
    }
    if (password !== confirmPassword) return 'Hindi magkatugma ang password.';
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role, full_name: name } },
      });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Hindi nagawa ang account.');

      const { error: profileError } = await supabase.from('users').upsert({
        id: data.user.id,
        email,
        name,
        role,
        email_verified: false,
      });
      if (profileError) throw profileError;

      navigate('/verify-email', { state: { email } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hindi matagumpay ang pag-sign up.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Gumawa ng account"
      subtitle="Para sa magulang at guro."
      footer={
        <>
          May account ka na?{' '}
          <Link to="/login" className="font-medium text-[var(--color-primary)] underline">
            Mag-login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Ako ay:</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                aria-pressed={role === r.value}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-colors ${
                  role === r.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'
                }`}
              >
                <span className="text-2xl" aria-hidden="true">
                  {r.icon}
                </span>
                {r.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Buong Pangalan
          </label>
          <IconInput id="name" icon="🧑" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
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
          {submitting ? 'Gumagawa ng account...' : 'Mag-sign up'}
        </button>
      </form>
    </AuthShell>
  );
}
