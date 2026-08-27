import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { cardStyle } from '../../lib/cardStyle';
import { IconLabel } from '../../components/a11y/IconLabel';

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '🧑‍🏫';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function Settings() {
  const { user, identity, refreshIdentity } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState(identity?.displayName ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: teacherProfile } = useQuery({
    queryKey: ['teacher-profile-settings', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('teacher_profiles')
        .select('notify_by_email, grade_levels')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (err) throw err;
      return data as { notify_by_email: boolean; grade_levels: number[] } | null;
    },
    enabled: Boolean(user),
  });

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

  const toggleNotify = useMutation({
    mutationFn: async (value: boolean) => {
      const { error: err } = await supabase
        .from('teacher_profiles')
        .update({ notify_by_email: value })
        .eq('user_id', user!.id);
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-profile-settings'] }),
    onError: (err: Error) => setError(err.message),
  });

  const passwordChecks = [
    { label: '8+ characters', met: newPassword.length >= 8 },
    { label: 'May malaking letra (A-Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'May numero (0-9)', met: /[0-9]/.test(newPassword) },
  ];

  const gradeLevels = teacherProfile?.grade_levels ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      <div
        className="relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl p-6 text-center text-white shadow-hero sm:flex-row sm:p-8 sm:text-left"
        style={{ backgroundImage: 'linear-gradient(135deg, #5c8047, #0d9488)' }}
      >
        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] border-4 border-white/40 bg-white/20 text-3xl font-bold shadow-lg backdrop-blur">
          {initialsFor(identity?.displayName ?? 'Guro')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-[0.12em] text-white/70 uppercase">Teacher profile</p>
          <h1 className="truncate text-2xl font-bold sm:text-3xl">{identity?.displayName ?? 'Aking Profile'}</h1>
          <p className="truncate text-white/85">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold backdrop-blur">
            <IconLabel icon="🧑‍🏫" label={`Guro · Grade ${gradeLevels.join(', ') || '-'}`} />
          </span>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-sage')}>
          <h2 className="mb-4 text-xl font-bold">
            <IconLabel icon="✏️" label="Profile Ko" />
          </h2>
          <form
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
              className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4"
            />
            {profileMsg && <p className="text-sm font-medium text-[var(--color-success)]">{profileMsg}</p>}
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="inline-flex min-h-11 items-center self-start rounded-xl bg-[var(--color-brand-sage)] px-5 font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {updateProfile.isPending ? 'Sine-save...' : 'I-save'}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-teal')}>
          <h2 className="mb-4 text-xl font-bold">
            <IconLabel icon="🔔" label="Mga Abiso" />
          </h2>
          <label className="flex items-center gap-3 rounded-lg border border-white/60 bg-white/60 px-4 py-3">
            <input
              type="checkbox"
              checked={teacherProfile?.notify_by_email ?? true}
              onChange={(e) => toggleNotify.mutate(e.target.checked)}
              className="h-4 w-4"
            />
            Ipadala sa email ang mga update
          </label>
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            Naka-assign kang mag-turo sa <span className="font-medium">Grade {gradeLevels.join(', ') || '-'}</span>.
            Awtomatikong idinaragdag sa iyong roster ang bawat mag-aaral sa mga grade na ito.
          </p>
        </div>

        <div className="rounded-3xl border p-5 shadow-card sm:p-6 lg:col-span-2" style={cardStyle('--color-brand-coral')}>
          <h2 className="mb-4 text-xl font-bold">
            <IconLabel icon="🔒" label="Palitan ang Password" />
          </h2>
          <form
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
                className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4"
              />
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Kumpirmahin ang Bagong Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4"
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
              className="inline-flex min-h-11 items-center self-start rounded-xl bg-[var(--color-brand-coral)] px-5 font-bold text-white hover:opacity-90 disabled:opacity-60 lg:col-span-2"
            >
              {updatePassword.isPending ? 'Ina-update...' : 'I-update ang Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
