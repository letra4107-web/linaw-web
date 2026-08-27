import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';

interface Child {
  id: string;
  name: string;
  grade_level: number;
}

interface ChildProgress {
  child_id: string;
  level: string;
}

interface ParentRow {
  avatar_url: string | null;
}

function cardStyle(brandVar: string, tintPct = 10, borderPct = 30) {
  return {
    backgroundColor: `color-mix(in srgb, var(${brandVar}) ${tintPct}%, white)`,
    borderColor: `color-mix(in srgb, var(${brandVar}) ${borderPct}%, white)`,
  };
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '👤';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function Settings() {
  const { user, identity, refreshIdentity } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(identity?.displayName ?? '');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: parentRow } = useQuery({
    queryKey: ['parent-profile', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase.from('parents').select('avatar_url').eq('auth_uid', user!.id).maybeSingle();
      if (err) throw err;
      return data as ParentRow | null;
    },
    enabled: Boolean(user),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user!.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('avatar')
        .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type || 'image/jpeg' });
      if (uploadErr) throw uploadErr;

      const { data: pub } = supabase.storage.from('avatar').getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;

      const { error: upsertErr } = await supabase
        .from('parents')
        .upsert({ auth_uid: user!.id, avatar_url: publicUrl }, { onConflict: 'auth_uid' });
      if (upsertErr) throw upsertErr;
      return publicUrl;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['parent-profile', user?.id] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const { data: children } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase.from('children').select('id, name, grade_level').order('name');
      if (err) throw err;
      return data as Child[];
    },
    enabled: Boolean(user),
  });

  const { data: progress } = useQuery({
    queryKey: ['parent-children-progress', (children ?? []).map((c) => c.id)],
    queryFn: async () => {
      const ids = (children ?? []).map((c) => c.id);
      if (ids.length === 0) return [];
      const { data, error: err } = await supabase.from('child_progress').select('child_id, level').in('child_id', ids);
      if (err) throw err;
      return data as ChildProgress[];
    },
    enabled: (children ?? []).length > 0,
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

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      <div
        className="relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border p-5 text-center shadow-card sm:flex-row sm:p-7 sm:text-left"
        style={cardStyle('--color-brand-lavender', 14, 40)}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAvatar.mutate(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Palitan ang larawan"
          className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-[2rem] border-4 border-white/70 text-3xl font-bold text-white shadow-lg"
          style={{ backgroundColor: 'var(--color-brand-lavender-dark)' }}
        >
          {parentRow?.avatar_url ? (
            <img src={parentRow.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              {initialsFor(identity?.displayName ?? 'Magulang')}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-normal opacity-0 transition-opacity group-hover:opacity-100">
            {uploadAvatar.isPending ? '...' : '📷'}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-primary)] uppercase">Parent profile</p>
          <h1 className="truncate text-2xl font-bold sm:text-3xl">{identity?.displayName ?? 'Aking Profile'}</h1>
          <p className="truncate text-[var(--color-text-muted)]">{user?.email}</p>
          <span className="mt-2 inline-block rounded-full bg-[var(--color-brand-lavender-dark)] px-3 py-1 text-xs font-bold text-white">
            Account ng Magulang
          </span>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-sun')}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">
            <IconLabel icon="👧" label="Aking mga Anak" />
          </h2>
          <Link
            to="/parent/children"
            className="inline-flex min-h-10 items-center rounded-full bg-[var(--color-brand-sun)] px-4 text-sm font-bold text-white hover:opacity-90"
          >
            + Mag-enroll ng Bagong Anak
          </Link>
        </div>
        {children && children.length === 0 && (
          <p className="text-[var(--color-text-muted)]">
            Wala ka pang naka-enroll na anak.{' '}
            <Link to="/parent/children" className="text-[var(--color-primary)] underline">
              Mag-enroll ngayon
            </Link>
            .
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {(children ?? []).map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-1 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-sm text-[var(--color-text-muted)]">
                Grade {c.grade_level} · {progress?.find((p) => p.child_id === c.id)?.level ?? '-'}
              </span>
            </li>
          ))}
        </ul>
      </div>

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
            className="min-h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4"
          />
          {emailMsg && <p className="text-sm font-medium text-[var(--color-success)]">{emailMsg}</p>}
          <button
            type="submit"
            disabled={updateEmail.isPending || !newEmail.trim()}
            className="inline-flex min-h-11 items-center self-start rounded-xl bg-[var(--color-brand-teal)] px-5 font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {updateEmail.isPending ? 'Ipinapadala...' : 'I-update ang Email'}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-coral')}>
        <h2 className="mb-4 text-xl font-bold">
          <IconLabel icon="🔒" label="Palitan ang Password" />
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updatePassword.mutate();
          }}
          className="flex flex-col gap-3"
        >
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
          <p className="text-xs text-[var(--color-text-muted)]">
            8+ characters, may malaking letra (A-Z), at numero (0-9).
          </p>
          {passwordMsg && <p className="text-sm font-medium text-[var(--color-success)]">{passwordMsg}</p>}
          <button
            type="submit"
            disabled={updatePassword.isPending || !newPassword || !confirmPassword}
            className="inline-flex min-h-11 items-center self-start rounded-xl bg-[var(--color-brand-coral)] px-5 font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {updatePassword.isPending ? 'Ina-update...' : 'I-update ang Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
