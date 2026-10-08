import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import { cardStyle } from '../../lib/cardStyle';
import { AppIcon } from '../../components/a11y/AppIcon';
import heroBackground from '../../assets/admin_design/admin-hero-background.png';
import adminMascot from '../../assets/admin_design/owl-admin-mascot.png';

const mascot = adminMascot;

interface AnalyticsResponse {
  enrollmentTrend: { month: string; count: number }[];
  usageTrend: { month: string; count: number }[];
  roleCounts: Record<string, number>;
  totals: { children: number; studentAccounts: number; users: number; totalXp: number; badgeUnlockCount: number; practiceSessions: number };
}
interface UserRow { id: string; email: string; name: string | null; role: string; account_status: string; is_active: boolean; created_at: string; lastLoginAt: string | null }
interface CredentialSecurity { totalStudents: number; legacy: number; rotatedPending: number; secure: number; fullyRetired: number; missing: number; requiresRotation: number; }

const QUICK_ACTIONS = [
  { to: '/admin/users', icon: '👥', label: 'Manage users', desc: 'Search, filter, and account actions', brand: '--color-brand-lavender' },
  { to: '/admin/teachers', icon: '🎓', label: 'Create a teacher', desc: 'Create a teacher account', brand: '--color-brand-sun' },
  { to: '/admin/analytics', icon: '▥', label: 'Open analytics', desc: 'Trends and system performance', brand: '--color-brand-teal' },
];

const FILIPINO_QUICK_ACTIONS = [
  { to: '/admin/users', icon: '👥', label: 'Manage Accounts', desc: 'Search, filter, and manage accounts', brand: '--color-brand-lavender' },
  { to: '/admin/teachers', icon: '🎓', label: 'Create Teacher', desc: 'Add a new teacher account', brand: '--color-brand-sun' },
  { to: '/admin/analytics', icon: '▥', label: 'View Analytics', desc: 'System trends and performance', brand: '--color-brand-teal' },
];
void FILIPINO_QUICK_ACTIONS;

function LoadingCard() { return <div className="h-28 animate-pulse rounded-3xl border border-white/60 bg-white/45" />; }
function formatDate(value: string) { return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }

export default function AdminDashboard() {
  const { identity } = useAuth();
  const analytics = useQuery({ queryKey: ['admin-analytics'], queryFn: () => api<AnalyticsResponse>('/admin/analytics', { auth: true }) });
  const usersQuery = useQuery({ queryKey: ['admin-users', '', ''], queryFn: () => api<{ users: UserRow[] }>('/admin/users?', { auth: true }) });
  const credentialsQuery = useQuery({ queryKey: ['admin-credential-security'], queryFn: () => api<{ credentials: CredentialSecurity }>('/admin/credential-security', { auth: true }) });
  const loadError = [analytics.error, usersQuery.error, credentialsQuery.error].find(Boolean);
  const data = analytics.data;
  const users = usersQuery.data?.users ?? [];
  const activeUsers = users.filter((user) => user.account_status === 'active' && user.is_active).length;
  const localizedStats = data ? [
    { icon: '👥', label: 'Total Users', value: data.totals.users, detail: `${activeUsers} active accounts`, brand: '--color-brand-sage' },
    { icon: '🧒', label: 'Students', value: data.totals.studentAccounts, detail: 'Student accounts', brand: '--color-brand-sun' },
    { icon: '🎓', label: 'Teachers', value: data.roleCounts.teacher ?? 0, detail: 'Teacher accounts', brand: '--color-brand-coral' },
    { icon: '👪', label: 'Parents', value: data.roleCounts.parent ?? 0, detail: 'Supporting families', brand: '--color-brand-lavender' },
    { icon: '📖', label: 'Practice Sessions', value: data.totals.practiceSessions, detail: `${data.totals.totalXp.toLocaleString()} total XP`, brand: '--color-brand-violet' },
  ] : [];
  const stats = data ? [
    { icon: '👥', label: 'Total users', value: data.totals.users, detail: `${activeUsers} active accounts`, brand: '--color-brand-sage' },
    { icon: '🧒', label: 'Student accounts', value: data.totals.studentAccounts, detail: 'Matches the Users list', brand: '--color-brand-violet' },
    { icon: '🎓', label: 'Teachers', value: data.roleCounts.teacher ?? 0, detail: 'Teacher accounts', brand: '--color-brand-sun' },
    { icon: '👪', label: 'Parents', value: data.roleCounts.parent ?? 0, detail: 'Supporting families', brand: '--color-brand-lavender' },
    { icon: '🎙', label: 'Practice sessions', value: data.totals.practiceSessions, detail: `${data.totals.totalXp.toLocaleString()} total XP`, brand: '--color-brand-teal' },
  ] : [];
  void stats;
  const recent = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <header className="admin-home-banner relative isolate overflow-hidden rounded-3xl border p-5 shadow-hero ring-1 ring-black/5 sm:p-7">
        <img src={heroBackground} alt="" aria-hidden="true" className="admin-banner-background" />
        <img src={adminMascot} alt="" aria-hidden="true" className="admin-banner-mascot" />
        <div className="admin-banner-reference-copy">
          <p>Good morning,</p>
          <h1>Admin!</h1>
          <span>Here is a quick summary of LinawLetra users<br className="hidden sm:block" /> and activity today.</span>
        </div>
        <span className="admin-banner-letter" aria-hidden="true">ABC ✦</span><span className="admin-banner-pencil" aria-hidden="true">✎</span><img src={mascot} alt="" aria-hidden="true" className="admin-banner-mascot" />
        <div className="relative flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold tracking-[.14em] text-white/70 uppercase">Good morning! ✦</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Welcome back, {identity?.displayName ?? 'Admin'}!</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">Here is the quick story of LinawLetra today: learner progress, new accounts, and reading activity.</p></div><Link to="/admin/users" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-extrabold text-[var(--color-brand-navy)] shadow-card transition-transform hover:-translate-y-0.5">View users →</Link></div>
      </header>

      {import.meta.env.DEV && loadError instanceof Error && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          Unable to load admin data: {loadError.message}
        </div>
      )}

      {(analytics.isLoading || usersQuery.isLoading) ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <LoadingCard key={index} />)}</div> : data ? <section aria-label="Key statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-5">{localizedStats.map((stat) => <article key={stat.label} className="admin-stat-card min-w-0 rounded-3xl border p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised" style={cardStyle(stat.brand, 7, 26)}><div className="flex items-start justify-between gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-[var(--color-primary)]" aria-hidden="true"><AppIcon name={stat.icon} className="h-5 w-5" /></span><span className="admin-stat-arrow" aria-hidden="true">›</span></div><p className="mt-3 text-2xl font-extrabold tabular-nums sm:text-3xl">{stat.value.toLocaleString()}</p><p className="mt-1 text-sm font-bold">{stat.label}</p><p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{stat.detail}</p></article>)}</section> : <section role="alert" className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Unable to load dashboard data. Check your admin session and refresh the page.</section>}

      {credentialsQuery.data && <section className="rounded-3xl border p-4 shadow-card sm:p-5" style={cardStyle(credentialsQuery.data.credentials.requiresRotation ? '--color-brand-sun' : '--color-brand-sage', 5, 20)}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-wide uppercase">Credential security</p><h2 className="text-lg font-extrabold">{credentialsQuery.data.credentials.requiresRotation ? `${credentialsQuery.data.credentials.requiresRotation} student account(s) need password rotation` : 'All recorded student credentials are retired'}</h2><p className="text-sm text-[var(--color-text-muted)]">Aggregate only—no password or hash values are exposed.</p></div><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/70 px-3 py-1">Legacy: {credentialsQuery.data.credentials.legacy}</span><span className="rounded-full bg-white/70 px-3 py-1">Retired: {credentialsQuery.data.credentials.fullyRetired}</span><span className="rounded-full bg-white/70 px-3 py-1">Missing metadata: {credentialsQuery.data.credentials.missing}</span></div></div></section>}

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-5">
        <section className="min-w-0 rounded-3xl border p-4 shadow-card sm:p-6 xl:col-span-3" style={cardStyle('--color-brand-lavender', 6, 24)}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold tracking-wide text-[var(--color-brand-violet)] uppercase">Growth</p><h2 className="text-xl font-extrabold">Enrollment trend</h2></div><span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[var(--color-text-muted)]">Monthly</span></div><div className="mt-4 h-64 w-full">{data?.enrollmentTrend.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.enrollmentTrend} margin={{ left: -20, right: 8 }}><defs><linearGradient id="enrollmentFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="4 4" stroke="rgba(60,60,100,.12)" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 14, border: '1px solid var(--color-border)' }} /><Area type="monotone" dataKey="count" name="Enrollees" stroke="var(--color-primary)" strokeWidth={3} fill="url(#enrollmentFill)" /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">No enrollment data yet.</div>}</div></section>

        <section className="rounded-3xl border p-4 shadow-card sm:p-6 xl:col-span-2" style={cardStyle('--color-brand-sage', 6, 24)}><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-wide text-[var(--color-brand-teal)] uppercase">System activity</p><h2 className="text-xl font-extrabold">New accounts</h2></div><Link to="/admin/users" className="text-sm font-bold text-[var(--color-primary)]">View all →</Link></div><div className="mt-4 flex flex-col gap-2">{recent.length ? recent.map((user) => <div key={user.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/70 bg-white/60 p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-sm font-extrabold text-[var(--color-primary)]">{(user.name ?? user.email).slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user.name ?? user.email}</p><p className="truncate text-xs text-[var(--color-text-muted)]"><span className="capitalize">{user.role}</span> · Account created</p></div><time dateTime={user.created_at} className="shrink-0 text-[0.68rem] font-semibold text-[var(--color-text-muted)]">{formatDate(user.created_at)}</time></div>) : <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">No account activity yet.</div>}</div></section>
      </div>

      <section><div className="mb-3"><p className="text-xs font-bold tracking-wide text-[var(--color-text-muted)] uppercase">Shortcuts</p><h2 className="text-xl font-extrabold">Quick actions</h2></div><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{QUICK_ACTIONS.map((action) => <Link key={action.to} to={action.to} className="group flex min-w-0 items-center gap-4 rounded-3xl border p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised" style={cardStyle(action.brand, 6, 24)}><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-xl" aria-hidden="true">{action.icon}</span><span className="min-w-0 flex-1"><span className="block font-extrabold">{action.label}</span><span className="block truncate text-xs text-[var(--color-text-muted)]">{action.desc}</span></span><span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></Link>)}</div></section>
    </div>
  );
}
