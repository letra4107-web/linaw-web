import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';
import { cardStyle, CARD_COLORS } from '../../lib/cardStyle';

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

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api<AnalyticsResponse>('/admin/analytics', { auth: true }),
  });

  const roleChartData = data ? Object.entries(data.roleCounts).map(([role, count]) => ({ role, count })) : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Estadistika</h1>
        <p className="text-[var(--color-text-muted)]">Tunay na datos mula sa buong LinawLetra.</p>
      </div>

      {isLoading && <p>Naglo-load...</p>}

      {data && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border p-4" style={cardStyle(CARD_COLORS[0])}>
              <p className="text-2xl font-semibold">{data.totals.users}</p>
              <p className="text-sm text-[var(--color-text-muted)]">User</p>
            </div>
            <div className="rounded-xl border p-4" style={cardStyle(CARD_COLORS[1])}>
              <p className="text-2xl font-semibold">{data.totals.children}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Mag-aaral</p>
            </div>
            <div className="rounded-xl border p-4" style={cardStyle(CARD_COLORS[2])}>
              <p className="text-2xl font-semibold">{data.totals.practiceSessions}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Mga Pagsasanay</p>
            </div>
            <div className="rounded-xl border p-4" style={cardStyle(CARD_COLORS[3])}>
              <p className="text-2xl font-semibold">{data.totals.totalXp}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Kabuuang XP</p>
            </div>
            <div className="rounded-xl border p-4" style={cardStyle(CARD_COLORS[4])}>
              <p className="text-2xl font-semibold">{data.totals.badgeUnlockCount}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Nakuhang Badge</p>
            </div>
          </div>

          <div className="h-72 rounded-xl border p-4" style={cardStyle('--color-brand-lavender')}>
            <h2 className="mb-2 font-medium">Enrollment Trend (bawat buwan)</h2>
            {data.enrollmentTrend.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Wala pang datos.</p>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={data.enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="h-72 rounded-xl border p-4" style={cardStyle('--color-brand-teal')}>
            <h2 className="mb-2 font-medium">Paggamit — Mga Pagsasanay (bawat buwan)</h2>
            {data.usageTrend.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Wala pang datos.</p>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={data.usageTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="var(--color-accent)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="h-72 rounded-xl border p-4" style={cardStyle('--color-brand-violet')}>
            <h2 className="mb-2 font-medium">Bilang ng User bawat Role</h2>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={roleChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="role" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
