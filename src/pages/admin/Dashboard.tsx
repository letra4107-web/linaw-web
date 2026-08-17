import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface AnalyticsResponse {
  enrollmentTrend: { month: string; count: number }[];
  usageTrend: { month: string; count: number }[];
  roleCounts: Record<string, number>;
  totals: {
    children: number;
    users: number;
    totalXp: number;
    badgeUnlockCount: number;
    practiceSessions: number;
  };
}

const CARDS: { key: keyof AnalyticsResponse['totals']; icon: string; label: string }[] = [
  { key: 'users', icon: '👥', label: 'Kabuuang User' },
  { key: 'children', icon: '🧒', label: 'Mga Mag-aaral' },
  { key: 'practiceSessions', icon: '🎙️', label: 'Practice Sessions' },
  { key: 'badgeUnlockCount', icon: '🏅', label: 'Nakuhang Badge' },
];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api<AnalyticsResponse>('/admin/analytics', { auth: true }),
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="mt-1 text-[var(--color-text-muted)]">Buod ng LinawLetra sa lahat ng role.</p>
      </div>

      {isLoading && <p>Naglo-load...</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CARDS.map((c) => (
              <div key={c.key} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-2xl" aria-hidden="true">{c.icon}</p>
                <p className="mt-2 text-2xl font-semibold">{data.totals[c.key]}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h2 className="mb-3 font-medium">Bilang ng User bawat Role</h2>
            <ul className="flex flex-wrap gap-4">
              {Object.entries(data.roleCounts).map(([role, count]) => (
                <li key={role} className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm">
                  <span className="font-semibold capitalize">{role}</span>: {count}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/admin/users" className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm text-white">
          Pamahalaan ang mga User
        </Link>
        <Link to="/admin/teachers" className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-primary)]">
          Gumawa ng Guro
        </Link>
        <Link to="/admin/analytics" className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-primary)]">
          Tingnan ang Analytics
        </Link>
      </div>
    </div>
  );
}
