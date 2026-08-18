import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle } from '../../lib/cardStyle';

interface ArchivedRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  archived_at: string | null;
  archived_reason: string | null;
}

const PAGE_SIZE = 10;

export default function AdminArchived() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users-archived'],
    queryFn: () => api<{ users: ArchivedRow[] }>('/admin/users/archived', { auth: true }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users-archived'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const restore = useMutation({
    mutationFn: (id: string) => api(`/admin/users/${id}/restore`, { method: 'POST', auth: true }),
    onSuccess: invalidate,
    onError: (err: Error) => setError(err.message),
  });

  const rows = data?.users ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Arkibo</h1>
        <p className="text-[var(--color-text-muted)]">Mga na-archive na account. Maaaring i-restore anumang oras.</p>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      {isLoading && <p>Naglo-load...</p>}

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr style={cardStyle('--color-brand-navy', 10, 30)}>
                <th className="px-4 py-3 font-semibold">Pangalan</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Na-archive</th>
                <th className="px-4 py-3 font-semibold">Dahilan</th>
                <th className="px-4 py-3 font-semibold">Aksyon</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-bg)]'}>
                  <td className="border-t border-[var(--color-border)] px-4 py-3">
                    <p className="font-medium">{u.name ?? u.email}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{u.email}</p>
                  </td>
                  <td className="border-t border-[var(--color-border)] px-4 py-3 capitalize">{u.role}</td>
                  <td className="border-t border-[var(--color-border)] px-4 py-3 text-[var(--color-text-muted)]">
                    {u.archived_at ? new Date(u.archived_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="border-t border-[var(--color-border)] px-4 py-3 text-[var(--color-text-muted)]">
                    {u.archived_reason ?? '—'}
                  </td>
                  <td className="border-t border-[var(--color-border)] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => restore.mutate(u.id)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold hover:border-[var(--color-primary)]"
                    >
                      <IconLabel icon="↩️" label="I-restore" />
                    </button>
                  </td>
                </tr>
              ))}
              {data && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                    Walang na-archive na account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            Ipinapakita {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} ng {rows.length}
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
