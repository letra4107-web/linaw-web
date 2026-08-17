import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { IconLabel } from '../../components/a11y/IconLabel';

interface ArchivedRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  archived_at: string | null;
  archived_reason: string | null;
}

export default function AdminArchived() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/users/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Archive</h1>
        <p className="text-[var(--color-text-muted)]">
          Mga na-archive na account. Maaaring i-restore o permanenteng burahin (hindi na maibabalik).
        </p>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      {isLoading && <p>Naglo-load...</p>}

      <div className="flex flex-col gap-3">
        {(data?.users ?? []).map((u) => (
          <div
            key={u.id}
            className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{u.name ?? u.email}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {u.email} · <span className="capitalize">{u.role}</span>
                {u.archived_at && <> · Na-archive: {new Date(u.archived_at).toLocaleDateString()}</>}
              </p>
              {u.archived_reason && (
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Dahilan: {u.archived_reason}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => restore.mutate(u.id)}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-primary)]"
              >
                <IconLabel icon="↩️" label="I-restore" />
              </button>
              {confirmDelete === u.id ? (
                <button
                  type="button"
                  onClick={() => remove.mutate(u.id)}
                  className="rounded-full bg-[var(--color-danger)] px-3 py-1 text-sm text-white"
                >
                  <IconLabel icon="⚠️" label="Kumpirmahin ang burahin" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(u.id)}
                  className="rounded-full border border-[var(--color-danger)] px-3 py-1 text-sm text-[var(--color-danger)]"
                >
                  <IconLabel icon="🗑️" label="Permanenteng burahin" />
                </button>
              )}
            </div>
          </div>
        ))}
        {data && data.users.length === 0 && (
          <p className="text-[var(--color-text-muted)]">Walang na-archive na account.</p>
        )}
      </div>
    </div>
  );
}
