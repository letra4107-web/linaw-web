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
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-extrabold tracking-[.12em] text-[var(--color-primary)] uppercase">Account records</p><h1 className="text-2xl font-extrabold sm:text-3xl">Arkibo</h1><p className="mt-1 text-sm text-[var(--color-text-muted)]">Mga na-archive na account na maaari pang ibalik.</p></div>
        {data && <div className="rounded-2xl border px-4 py-2 text-center shadow-card" style={cardStyle('--color-brand-coral', 6, 22)}><p className="text-2xl font-extrabold">{rows.length}</p><p className="text-xs font-bold text-[var(--color-text-muted)]">Archived</p></div>}
      </header>

      {error && <p role="alert" className="rounded-2xl bg-[var(--color-danger-soft)] p-3 text-sm font-bold text-[var(--color-danger)]">{error}</p>}
      {isLoading && <div className="rounded-3xl border bg-white/45 p-10 text-center text-sm text-[var(--color-text-muted)]">Naglo-load ng arkibo...</div>}

      <div className="hidden overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white/55 shadow-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[var(--color-brand-navy)] text-white">
                <th className="px-4 py-3 font-semibold">Pangalan</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Na-archive</th>
                <th className="px-4 py-3 font-semibold">Dahilan</th>
                <th className="px-4 py-3 font-semibold">Aksyon</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-white/70">
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
                      disabled={restore.isPending}
                      className="min-h-9 rounded-full border border-[var(--color-success)]/35 bg-[var(--color-success-soft)] px-3 text-xs font-extrabold text-[var(--color-success)] disabled:opacity-50"
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

      {!isLoading && <div className="grid grid-cols-1 gap-3 md:hidden">{pageRows.map((u) => <article key={u.id} className="rounded-3xl border p-4 shadow-card" style={cardStyle('--color-brand-coral', 4, 18)}><div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70">▣</span><div className="min-w-0 flex-1"><h2 className="truncate font-extrabold">{u.name ?? u.email}</h2><p className="truncate text-xs text-[var(--color-text-muted)]">{u.email}</p><span className="mt-2 inline-block rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold capitalize">{u.role}</span></div></div><dl className="my-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/55 p-3 text-xs"><div><dt className="font-bold text-[var(--color-text-muted)]">Na-archive</dt><dd className="mt-1 font-semibold">{u.archived_at ? new Date(u.archived_at).toLocaleDateString('fil-PH') : '—'}</dd></div><div><dt className="font-bold text-[var(--color-text-muted)]">Dahilan</dt><dd className="mt-1 line-clamp-2 font-semibold">{u.archived_reason ?? 'Walang inilagay'}</dd></div></dl><button type="button" onClick={() => restore.mutate(u.id)} disabled={restore.isPending} className="min-h-10 w-full rounded-xl border border-[var(--color-success)]/35 bg-[var(--color-success-soft)] text-sm font-extrabold text-[var(--color-success)] disabled:opacity-50">↩ I-restore ang account</button></article>)}</div>}

      {data && rows.length === 0 && <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-white/45 p-10 text-center"><p className="text-4xl">▣</p><h2 className="mt-2 text-lg font-extrabold">Walang archived account</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">Malinis ang iyong archive sa ngayon.</p></div>}

      {rows.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
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
