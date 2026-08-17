import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';

export default function Settings() {
  const { user, identity, refreshIdentity } = useAuth();
  const [name, setName] = useState(identity?.displayName ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
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

  const updatePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        throw new Error('Kailangang 8+ characters, may malaking letra at numero.');
      }
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) throw err;
    },
    onSuccess: () => {
      setPasswordMsg('Na-update ang password.');
      setNewPassword('');
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Mga Setting</h1>
        <p className="text-[var(--color-text-muted)]">Pamahalaan ang iyong profile at account.</p>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateProfile.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h2 className="text-lg font-semibold">Profile Ko</h2>
        <label htmlFor="name" className="text-sm font-medium">
          Pangalan
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        {profileMsg && <p className="text-sm text-[var(--color-primary)]">{profileMsg}</p>}
        <button type="submit" className="self-start rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white">
          I-save
        </button>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updatePassword.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h2 className="text-lg font-semibold">Password</h2>
        <label htmlFor="password" className="text-sm font-medium">
          Bagong Password
        </label>
        <input
          id="password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        {passwordMsg && <p className="text-sm text-[var(--color-primary)]">{passwordMsg}</p>}
        <button type="submit" className="self-start rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white">
          I-update ang Password
        </button>
      </form>
    </div>
  );
}
