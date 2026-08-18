import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  account_status: string;
  is_active: boolean;
  created_at: string;
  lastLoginAt: string | null;
}

const ROLES = ['admin', 'teacher', 'parent', 'student'];
const STATUSES = ['active', 'disabled'];

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (status) params.set('status', status);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', role, status],
    queryFn: () => api<{ users: UserRow[] }>(`/admin/users?${params.toString()}`, { auth: true }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const disable = useMutation({
    mutationFn: (payload: { id: string; reason: string }) =>
      api(`/admin/users/${payload.id}/disable`, { method: 'POST', auth: true, body: { reason: payload.reason } }),
    onSuccess: () => {
      invalidate();
      setReasonFor(null);
      setReason('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const restore = useMutation({
    mutationFn: (id: string) => api(`/admin/users/${id}/restore`, { method: 'POST', auth: true }),
    onSuccess: invalidate,
    onError: (err: Error) => setError(err.message),
  });

  const archive = useMutation({
    mutationFn: (payload: { id: string; reason: string }) =>
      api(`/admin/users/${payload.id}/archive`, { method: 'POST', auth: true, body: { reason: payload.reason } }),
    onSuccess: () => {
      invalidate();
      setReasonFor(null);
      setReason('');
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mga User</h1>
        <p className="text-[var(--color-text-muted)]">Pamahalaan ang mga account sa buong LinawLetra.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          <option value="">Lahat ng Role</option>
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          <option value="">Lahat ng Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      {isLoading && <p>Naglo-load...</p>}

      <div className="flex flex-col gap-3">
        {(data?.users ?? []).map((u, i) => (
          <div
            key={u.id}
            className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            style={cardStyle(CARD_COLORS[i % CARD_COLORS.length])}
          >
            <div>
              <p className="font-medium">{u.name ?? u.email}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {u.email} · <span className="capitalize">{u.role}</span> ·{' '}
                <span className="capitalize">{u.account_status}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {u.account_status === 'disabled' ? (
                <button
                  type="button"
                  onClick={() => restore.mutate(u.id)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)]"
                >
                  <IconLabel icon="↩️" label="I-restore" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setReasonFor(reasonFor === `disable-${u.id}` ? null : `disable-${u.id}`)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-danger)]"
                >
                  <IconLabel icon="⛔" label="I-disable" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setReasonFor(reasonFor === `archive-${u.id}` ? null : `archive-${u.id}`)}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-danger)]"
              >
                <IconLabel icon="🗄️" label="I-archive" />
              </button>
            </div>

            {(reasonFor === `disable-${u.id}` || reasonFor === `archive-${u.id}`) && (
              <div className="flex w-full flex-col gap-2 border-t border-white/60 pt-3 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor={`reason-${u.id}`}>
                  Dahilan (opsyonal)
                </label>
                <div className="flex gap-2">
                  <input
                    id={`reason-${u.id}`}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                    placeholder="Ilagay ang dahilan..."
                  />
                  <button
                    type="button"
                    onClick={() =>
                      reasonFor === `disable-${u.id}`
                        ? disable.mutate({ id: u.id, reason })
                        : archive.mutate({ id: u.id, reason })
                    }
                    className="rounded-full bg-[var(--color-danger)] px-4 py-2 text-sm text-white"
                  >
                    Kumpirmahin
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {data && data.users.length === 0 && (
          <p className="text-[var(--color-text-muted)]">Walang user na tumugma sa filter.</p>
        )}
      </div>
    </div>
  );
}
