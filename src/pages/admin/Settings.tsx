import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { cardStyle } from '../../lib/cardStyle';
import { IconLabel } from '../../components/a11y/IconLabel';

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '🛡️';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function Settings() {
  const { user, identity, refreshIdentity } = useAuth();
  const [name, setName] = useState(identity?.displayName ?? '');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error: err } = await supabase.from('users').update({ name: name.trim() }).eq('id', user!.id);
      if (err) throw err;
    },
    onSuccess: async () => {
      setProfileMsg('Na-save ang pangalan.');
      setError(null);
      await refreshIdentity();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateEmail = useMutation({
    mutationFn: async () => {
      const trimmed = newEmail.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        throw new Error('Maglagay ng valid na email address.');
      }
      const { error: err } = await supabase.auth.updateUser({ email: trimmed });
      if (err) throw err;
    },
    onSuccess: () => {
      setEmailMsg('Nagpadala kami ng kumpirmasyon sa parehong luma at bagong email — buksan ang link para tapusin ang pagbabago.');
      setNewEmail('');
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const updatePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        throw new Error('Kailangang 8+ characters, may malaking letra at numero.');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('Hindi magkatugma ang dalawang password.');
      }
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) throw err;
    },
    onSuccess: () => {
      setPasswordMsg('Na-update ang password.');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const passwordChecks = [
    { label: '8+ characters', met: newPassword.length >= 8 },
    { label: 'May malaking letra (A-Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'May numero (0-9)', met: /[0-9]/.test(newPassword) },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div
        className="relative flex min-w-0 flex-col items-start gap-4 overflow-hidden rounded-3xl border border-white/30 p-5 text-white shadow-raised sm:flex-row sm:items-center sm:p-7"
        style={{ backgroundImage: 'linear-gradient(135deg, #1e3a8a, #5f52b0, #7c3aed)' }}
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/20 text-2xl font-extrabold shadow-card backdrop-blur">
          {initialsFor(identity?.displayName ?? 'Admin')}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-extrabold tracking-[.12em] text-white/65 uppercase">Admin profile</p>
          <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{identity?.displayName ?? 'Aking Profile'}</h1>
          <p className="truncate text-sm text-white/80">{user?.email}</p>
          <span className="mt-2 inline-block rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
            <IconLabel icon="🛡️" label="Admin Account" />
          </span>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-[var(--color-danger)]/35 bg-[var(--color-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-sage', 6, 24)}>
          <h2 className="mb-1 text-xl font-extrabold">
            <IconLabel icon="✏️" label="Profile Ko" />
          </h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Ito ang pangalang makikita sa iyong admin account.</p><form
            onSubmit={(e) => {
              e.preventDefault();
              updateProfile.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <label htmlFor="name" className="text-sm font-medium">
              Pangalan
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11 rounded-xl border border-[var(--color-border)] bg-white/75 px-4 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
            />
            {profileMsg && <p className="text-sm font-medium text-[var(--color-success)]">{profileMsg}</p>}
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="min-h-11 self-start rounded-xl bg-[var(--color-brand-sage)] px-5 font-extrabold text-white shadow-card hover:opacity-90 disabled:opacity-60"
            >
              {updateProfile.isPending ? 'Sine-save...' : 'I-save'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-teal', 6, 24)}>
          <h2 className="mb-4 text-xl font-extrabold">
            <IconLabel icon="📧" label="Palitan ang Email" />
          </h2>
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">
            Kasalukuyang email: <span className="font-medium">{user?.email}</span>. Magpapadala kami ng kumpirmasyon
            link bago ito magbago.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateEmail.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <label htmlFor="newEmail" className="text-sm font-medium">
              Bagong Email
            </label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="bagong-email@halimbawa.com"
              className="min-h-11 rounded-xl border border-[var(--color-border)] bg-white/75 px-4 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
            />
            {emailMsg && <p className="text-sm font-medium text-[var(--color-success)]">{emailMsg}</p>}
            <button
              type="submit"
              disabled={updateEmail.isPending || !newEmail.trim()}
              className="min-h-11 self-start rounded-xl bg-[var(--color-brand-teal)] px-5 font-extrabold text-white shadow-card hover:opacity-90 disabled:opacity-60"
            >
              {updateEmail.isPending ? 'Ipinapadala...' : 'I-update ang Email'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border p-5 shadow-card sm:p-6 lg:col-span-2" style={cardStyle('--color-brand-coral', 6, 24)}>
          <h2 className="mb-1 text-xl font-extrabold">
            <IconLabel icon="🔒" label="Palitan ang Password" />
          </h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Gumamit ng matibay at natatanging password para sa admin access.</p><form
            onSubmit={(e) => {
              e.preventDefault();
              updatePassword.mutate();
            }}
            className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            <div className="flex flex-col gap-3">
              <label htmlFor="password" className="text-sm font-medium">
                Bagong Password
              </label>
              <input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="min-h-11 rounded-xl border border-[var(--color-border)] bg-white/75 px-4 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
              />
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Kumpirmahin ang Bagong Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="min-h-11 rounded-xl border border-[var(--color-border)] bg-white/75 px-4 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
              />
            </div>
            <div className="flex flex-col justify-center gap-2">
              <p className="text-sm font-medium text-[var(--color-text-muted)]">Kailangan ng password:</p>
              {passwordChecks.map((c) => (
                <p
                  key={c.label}
                  className={`flex items-center gap-2 text-sm ${c.met ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}
                >
                  <span aria-hidden="true">{c.met ? '✅' : '⬜'}</span> {c.label}
                </p>
              ))}
              {confirmPassword && (
                <p className={`flex items-center gap-2 text-sm ${newPassword === confirmPassword ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                  <span aria-hidden="true">{newPassword === confirmPassword ? '✅' : '⬜'}</span> Magkatugma ang password
                </p>
              )}
            </div>
            {passwordMsg && (
              <p className="text-sm font-medium text-[var(--color-success)] lg:col-span-2">{passwordMsg}</p>
            )}
            <button
              type="submit"
              disabled={updatePassword.isPending || !newPassword || !confirmPassword}
              className="min-h-11 self-start rounded-xl bg-[var(--color-brand-coral)] px-5 font-extrabold text-white shadow-card hover:opacity-90 disabled:opacity-60 lg:col-span-2"
            >
              {updatePassword.isPending ? 'Ina-update...' : 'I-update ang Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
