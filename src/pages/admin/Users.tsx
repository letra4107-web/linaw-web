import { Fragment, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle } from '../../lib/cardStyle';

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
const PAGE_SIZE = 10;

function StatusPill({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        isActive ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-warning)]/20 text-[var(--color-warning-text)]'
      }`}
    >
      {status}
    </span>
  );
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
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

  useEffect(() => {
    setPage(1);
  }, [role, status]);

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

  const users = data?.users ?? [];
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const pageUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr style={cardStyle('--color-brand-navy', 10, 30)}>
                <th className="px-4 py-3 font-semibold">Pangalan</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Aksyon</th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.map((u, i) => (
                <Fragment key={u.id}>
                  <tr className={i % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-bg)]'}>
                    <td className="border-t border-[var(--color-border)] px-4 py-3 font-medium">{u.name ?? '—'}</td>
                    <td className="border-t border-[var(--color-border)] px-4 py-3 text-[var(--color-text-muted)]">{u.email}</td>
                    <td className="border-t border-[var(--color-border)] px-4 py-3 capitalize">{u.role}</td>
                    <td className="border-t border-[var(--color-border)] px-4 py-3">
                      <StatusPill status={u.account_status} />
                    </td>
                    <td className="border-t border-[var(--color-border)] px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {u.account_status === 'disabled' ? (
                          <button
                            type="button"
                            onClick={() => restore.mutate(u.id)}
                            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold hover:border-[var(--color-primary)]"
                          >
                            <IconLabel icon="↩️" label="I-restore" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReasonFor(reasonFor === `disable-${u.id}` ? null : `disable-${u.id}`)}
                            className="rounded-full bg-[var(--color-warning)] px-3 py-1 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                          >
                            <IconLabel icon="⛔" label="I-disable" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setReasonFor(reasonFor === `archive-${u.id}` ? null : `archive-${u.id}`)}
                          className="rounded-full bg-[var(--color-danger)] px-3 py-1 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                        >
                          <IconLabel icon="🗄️" label="I-archive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {(reasonFor === `disable-${u.id}` || reasonFor === `archive-${u.id}`) && (
                    <tr className={i % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-bg)]'}>
                      <td colSpan={5} className="border-t border-[var(--color-border)] px-4 py-3">
                        <label className="mb-1 block text-sm font-medium" htmlFor={`reason-${u.id}`}>
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
                            className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
                              reasonFor === `disable-${u.id}` ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-danger)]'
                            }`}
                          >
                            Kumpirmahin
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {data && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                    Walang user na tumugma sa filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {users.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            Ipinapakita {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, users.length)} ng {users.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:border-[var(--color-primary)] disabled:opacity-40"
            >
              ← Nakaraan
            </button>
            <span className="text-sm font-medium">
              Pahina {page} ng {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:border-[var(--color-primary)] disabled:opacity-40"
            >
              Susunod →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
