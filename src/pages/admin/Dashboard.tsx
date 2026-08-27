import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { cardStyle } from '../../lib/cardStyle';

interface AnalyticsResponse {
  enrollmentTrend: { month: string; count: number }[];
  usageTrend: { month: string; count: number }[];
  roleCounts: Record<string, number>;
  totals: { children: number; users: number; totalXp: number; badgeUnlockCount: number; practiceSessions: number };
}
interface UserRow { id: string; email: string; name: string | null; role: string; account_status: string; is_active: boolean; created_at: string; lastLoginAt: string | null }

const QUICK_ACTIONS = [
  { to: '/admin/users', icon: '👥', label: 'Pamahalaan ang users', desc: 'Search, filter, at account actions', brand: '--color-brand-lavender' },
  { to: '/admin/teachers', icon: '🎓', label: 'Magdagdag ng guro', desc: 'Gumawa ng teacher account', brand: '--color-brand-sun' },
  { to: '/admin/analytics', icon: '▥', label: 'Buksan ang analytics', desc: 'Trends at system performance', brand: '--color-brand-teal' },
];

function LoadingCard() { return <div className="h-28 animate-pulse rounded-3xl border border-white/60 bg-white/45" />; }
function formatDate(value: string) { return new Date(value).toLocaleString('fil-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }

export default function AdminDashboard() {
  const { identity } = useAuth();
  const analytics = useQuery({ queryKey: ['admin-analytics'], queryFn: () => api<AnalyticsResponse>('/admin/analytics', { auth: true }) });
  const usersQuery = useQuery({ queryKey: ['admin-users', '', ''], queryFn: () => api<{ users: UserRow[] }>('/admin/users?', { auth: true }) });
  const data = analytics.data;
  const users = usersQuery.data?.users ?? [];
  const activeUsers = users.filter((user) => user.account_status === 'active' && user.is_active).length;
  const stats = data ? [
    { icon: '👥', label: 'Kabuuang users', value: data.totals.users, detail: `${activeUsers} aktibong account`, brand: '--color-brand-lavender' },
    { icon: '🧒', label: 'Mga mag-aaral', value: data.totals.children, detail: 'Enrolled children', brand: '--color-brand-coral' },
    { icon: '🎓', label: 'Mga guro', value: data.roleCounts.teacher ?? 0, detail: 'Teacher accounts', brand: '--color-brand-sun' },
    { icon: '👪', label: 'Mga magulang', value: data.roleCounts.parent ?? 0, detail: 'Parent accounts', brand: '--color-brand-sage' },
    { icon: '●', label: 'Active users', value: activeUsers, detail: `${users.length ? Math.round((activeUsers / users.length) * 100) : 0}% ng visible accounts`, brand: '--color-brand-teal' },
    { icon: '🎙', label: 'Practice sessions', value: data.totals.practiceSessions, detail: `${data.totals.totalXp.toLocaleString()} total XP`, brand: '--color-brand-violet' },
  ] : [];
  const recent = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="relative overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-[var(--color-brand-navy)] via-[var(--color-brand-violet)] to-[var(--color-primary)] p-5 text-white shadow-raised sm:p-7">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold tracking-[.14em] text-white/70 uppercase">System overview</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Kumusta, {identity?.displayName ?? 'Admin'}!</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">Narito ang malinaw na buod ng users, engagement, at pinakabagong aktibidad ng LinawLetra.</p></div><Link to="/admin/users" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-extrabold text-[var(--color-brand-navy)] shadow-card transition-transform hover:-translate-y-0.5">Tingnan ang users →</Link></div>
      </header>

      {(analytics.isLoading || usersQuery.isLoading) ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <LoadingCard key={index} />)}</div> : data && <section aria-label="Pangunahing statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{stats.map((stat) => <article key={stat.label} className="min-w-0 rounded-3xl border p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised" style={cardStyle(stat.brand, 7, 26)}><div className="flex items-start justify-between gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-lg" aria-hidden="true">{stat.icon}</span><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `var(${stat.brand})` }} /></div><p className="mt-3 text-2xl font-extrabold tabular-nums sm:text-3xl">{stat.value.toLocaleString()}</p><p className="mt-1 text-sm font-bold">{stat.label}</p><p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{stat.detail}</p></article>)}</section>}

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-5">
        <section className="min-w-0 rounded-3xl border p-4 shadow-card sm:p-6 xl:col-span-3" style={cardStyle('--color-brand-lavender', 6, 24)}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold tracking-wide text-[var(--color-brand-violet)] uppercase">Growth</p><h2 className="text-xl font-extrabold">Enrollment trend</h2></div><span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[var(--color-text-muted)]">Bawat buwan</span></div><div className="mt-4 h-64 w-full">{data?.enrollmentTrend.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.enrollmentTrend} margin={{ left: -20, right: 8 }}><defs><linearGradient id="enrollmentFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="4 4" stroke="rgba(60,60,100,.12)" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 14, border: '1px solid var(--color-border)' }} /><Area type="monotone" dataKey="count" name="Enrollees" stroke="var(--color-primary)" strokeWidth={3} fill="url(#enrollmentFill)" /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">Wala pang enrollment data.</div>}</div></section>

        <section className="rounded-3xl border p-4 shadow-card sm:p-6 xl:col-span-2" style={cardStyle('--color-brand-sage', 6, 24)}><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-wide text-[var(--color-brand-teal)] uppercase">System activity</p><h2 className="text-xl font-extrabold">Bagong accounts</h2></div><Link to="/admin/users" className="text-sm font-bold text-[var(--color-primary)]">Lahat →</Link></div><div className="mt-4 flex flex-col gap-2">{recent.length ? recent.map((user) => <div key={user.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/70 bg-white/60 p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-sm font-extrabold text-[var(--color-primary)]">{(user.name ?? user.email).slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user.name ?? user.email}</p><p className="truncate text-xs text-[var(--color-text-muted)]"><span className="capitalize">{user.role}</span> · Account created</p></div><time dateTime={user.created_at} className="shrink-0 text-[0.68rem] font-semibold text-[var(--color-text-muted)]">{formatDate(user.created_at)}</time></div>) : <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">Wala pang account activity.</div>}</div></section>
      </div>

      <section><div className="mb-3"><p className="text-xs font-bold tracking-wide text-[var(--color-text-muted)] uppercase">Shortcuts</p><h2 className="text-xl font-extrabold">Mabilisang aksyon</h2></div><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{QUICK_ACTIONS.map((action) => <Link key={action.to} to={action.to} className="group flex min-w-0 items-center gap-4 rounded-3xl border p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised" style={cardStyle(action.brand, 6, 24)}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-xl" aria-hidden="true">{action.icon}</span><span className="min-w-0 flex-1"><span className="block font-extrabold">{action.label}</span><span className="block truncate text-xs text-[var(--color-text-muted)]">{action.desc}</span></span><span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></Link>)}</div></section>
    </div>
  );
}
