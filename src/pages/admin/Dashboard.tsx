import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { cardStyle } from '../../lib/cardStyle';
import { IconLabel } from '../../components/a11y/IconLabel';

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

const STAT_CARDS: { key: keyof AnalyticsResponse['totals']; icon: string; label: string; brand: string }[] = [
  { key: 'users', icon: '👥', label: 'Kabuuang User', brand: '--color-brand-lavender' },
  { key: 'children', icon: '🧒', label: 'Mga Mag-aaral', brand: '--color-brand-coral' },
  { key: 'practiceSessions', icon: '🎙️', label: 'Mga Pagsasanay', brand: '--color-brand-teal' },
  { key: 'badgeUnlockCount', icon: '🏅', label: 'Nakuhang Badge', brand: '--color-brand-sun' },
  { key: 'totalXp', icon: '⭐', label: 'Kabuuang XP', brand: '--color-brand-violet' },
];

const ROLE_META: Record<string, { icon: string; brand: string }> = {
  admin: { icon: '🛡️', brand: '--color-brand-navy' },
  teacher: { icon: '🧑‍🏫', brand: '--color-brand-sun' },
  parent: { icon: '👪', brand: '--color-brand-coral' },
  student: { icon: '🧒', brand: '--color-brand-lavender' },
};

const QUICK_ACTIONS = [
  { to: '/admin/users', icon: '👥', label: 'Pamahalaan ang mga User', desc: 'Tingnan, i-disable, o i-archive ang mga account', brand: '--color-brand-lavender' },
  { to: '/admin/teachers', icon: '🧑‍🏫', label: 'Gumawa ng Guro', desc: 'Magdagdag ng bagong teacher account', brand: '--color-brand-sun' },
  { to: '/admin/analytics', icon: '📊', label: 'Tingnan ang Estadistika', desc: 'Detalyadong charts at trends', brand: '--color-brand-teal' },
  { to: '/admin/archived', icon: '🗄️', label: 'Buksan ang Arkibo', desc: 'Mga na-archive na account', brand: '--color-brand-coral' },
];

export default function AdminDashboard() {
  const { identity } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api<AnalyticsResponse>('/admin/analytics', { auth: true }),
  });

  const roleEntries = data ? Object.entries(data.roleCounts).sort(([, a], [, b]) => b - a) : [];
  const roleTotal = roleEntries.reduce((sum, [, count]) => sum + count, 0) || 1;

  return (
    <div className="flex flex-col gap-8">
      <div
        className="overflow-hidden rounded-2xl p-8 text-white shadow-lg"
        style={{ backgroundImage: 'linear-gradient(135deg, #1e3a8a, #5f52b0, #7c3aed)' }}
      >
        <h1 className="text-3xl font-bold">
          <IconLabel icon="🛡️" label={`Kumusta, ${identity?.displayName ?? 'Admin'}!`} />
        </h1>
        <p className="mt-2 text-white/85">Buod ng LinawLetra sa lahat ng role — real-time na datos.</p>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
          <p className="text-[var(--color-text-muted)]">Naglo-load...</p>
        </div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {STAT_CARDS.map((c) => (
              <div
                key={c.key}
                className="flex flex-col gap-2 rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
                style={cardStyle(c.brand)}
              >
                <span className="text-3xl" aria-hidden="true">
                  {c.icon}
                </span>
                <p className="text-2xl font-bold">{data.totals[c.key].toLocaleString()}</p>
                <p className="text-sm font-medium text-[var(--color-text-muted)]">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Enrollment trend chart */}
            <div className="h-80 rounded-xl border p-5 lg:col-span-3" style={cardStyle('--color-brand-lavender')}>
              <h2 className="mb-3 font-semibold">
                <IconLabel icon="📈" label="Enrollment Trend (bawat buwan)" />
              </h2>
              {data.enrollmentTrend.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">Wala pang datos.</p>
              ) : (
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={data.enrollmentTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="var(--color-brand-lavender-dark)" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Role distribution */}
            <div className="rounded-xl border p-5 lg:col-span-2" style={cardStyle('--color-brand-sage')}>
              <h2 className="mb-4 font-semibold">
                <IconLabel icon="👥" label="Bilang ng User bawat Role" />
              </h2>
              <div className="flex flex-col gap-4">
                {roleEntries.map(([role, count]) => {
                  const meta = ROLE_META[role] ?? { icon: '❓', brand: '--color-brand-sage' };
                  const pct = Math.round((count / roleTotal) * 100);
                  return (
                    <div key={role}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 font-medium capitalize">
                          <span aria-hidden="true">{meta.icon}</span> {role}
                        </span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/70">
                        <div
                          className="h-full rounded-full transition-[width]"
                          style={{ width: `${pct}%`, backgroundColor: `var(${meta.brand})` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {roleEntries.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Wala pang datos.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Mabilisang Aksyon</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex flex-col gap-1 rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-95"
              style={cardStyle(action.brand)}
            >
              <span className="text-2xl" aria-hidden="true">
                {action.icon}
              </span>
              <p className="font-semibold">{action.label}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
