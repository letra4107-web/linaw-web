import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { AuthShell, FieldError, inputClass, primaryButtonClass } from '../../components/auth/AuthShell';

type SignUpRole = 'parent' | 'teacher';

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
          <Link to="/login" className="text-[var(--color-primary)] underline">
            Mag-login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <fieldset className="flex gap-4">
          <legend className="mb-1 text-sm font-medium">Ako ay:</legend>
          {(['parent', 'teacher'] as const).map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} />
              {r === 'parent' ? 'Magulang' : 'Guro'}
            </label>
          ))}
        </fieldset>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Buong Pangalan
          </label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
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
            autoComplete="new-password"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            Kumpirmahin ang Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
        </div>
        <FieldError message={error ?? undefined} />
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? 'Gumagawa ng account...' : 'Mag-sign up'}
        </button>
      </form>
    </AuthShell>
  );
}
