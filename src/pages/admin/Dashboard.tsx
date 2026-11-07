import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, BookOpen, CalendarDays, ChartNoAxesColumnIncreasing, ChevronDown, GraduationCap, ShieldCheck, UserRoundCheck, UsersRound, Zap } from 'lucide-react';
import { api } from '../../lib/api';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { AdminHero, AdminStats, EmptyState, PanelHeading } from './AdminPrimitives';

type Analytics = { enrollmentTrend: { month: string; count: number }[]; roleCounts: Record<string, number>; totals: { users: number; studentAccounts: number; practiceSessions: number; totalXp: number } };
type User = { id: string; name: string | null; email: string; role: string; created_at: string; account_status: string };
type Credentials = { requiresRotation: number; legacy: number; fullyRetired: number; missing: number };
const formatDate = (value: string) => new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
const monthName = (value: string) => new Date(`${value}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
export default function AdminDashboard() {
  const analytics = useQuery({ queryKey: ['admin-analytics'], queryFn: () => api<Analytics>('/admin/analytics', { auth: true }) });
  const usersQuery = useQuery({ queryKey: ['admin-users', '', ''], queryFn: () => api<{ users: User[] }>('/admin/users?', { auth: true }) });
  const credentials = useQuery({ queryKey: ['admin-credential-security'], queryFn: () => api<{ credentials: Credentials }>('/admin/credential-security', { auth: true }) });
  const data = analytics.data;
  const users = usersQuery.data?.users || [];
  const recent = [...users].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
  const growth = (role?: string) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const matching = users.filter(user => !role || user.role === role);
    const currentCount = matching.filter(user => new Date(user.created_at) >= start).length;
    const previousCount = matching.filter(user => new Date(user.created_at) >= previous && new Date(user.created_at) < start).length;
    return previousCount ? `${currentCount >= previousCount ? '↗ +' : '↘ '}${Math.round((currentCount - previousCount) / previousCount * 100)}% vs. last month` : `${currentCount} new this month`;
  };
  return <div className="admin-home-reference">
    <AdminHero home title="Admin!" description="Monitor, manage, and keep LinawLetra running smoothly." />
    <QueryErrorNotice error={analytics.error || usersQuery.error || credentials.error} message="Unable to load some dashboard information. Please try again." onRetry={() => { void analytics.refetch(); void usersQuery.refetch(); void credentials.refetch(); }} />
    <AdminStats tall items={[
      { value: data?.totals.users ?? '—', label: 'Total Users', detail: growth(), icon: <UsersRound /> },
      { value: data ? data.totals.studentAccounts : '—', label: 'Students', detail: growth('student'), icon: <GraduationCap /> },
      { value: data?.roleCounts.teacher ?? '—', label: 'Teachers', detail: growth('teacher'), icon: <UserRoundCheck /> },
      { value: data?.roleCounts.parent ?? '—', label: 'Parents', detail: growth('parent'), icon: <UsersRound /> },
      { value: data?.totals.practiceSessions ?? '—', label: 'Practice Sessions', detail: `${data?.totals.totalXp.toLocaleString() ?? '—'} XP earned by students`, icon: <ChartNoAxesColumnIncreasing /> },
    ]} />
    <div className="admin-home-middle">
      <section className="admin-panel admin-enrollment-panel"><PanelHeading icon={<ChartNoAxesColumnIncreasing />} title="Enrollment Trend" description="Number of new enrollments each month." action={<span className="admin-chart-period">Monthly<ChevronDown /></span>} /><div className="admin-chart-eyebrow">GROWTH</div><div className="admin-enrollment-chart">{data?.enrollmentTrend.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.enrollmentTrend} margin={{ left: -15, right: 20, top: 20, bottom: 8 }}><defs><linearGradient id="adminEnrollmentFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#17a5f8" stopOpacity={.5} /><stop offset="1" stopColor="#17a5f8" stopOpacity={.06} /></linearGradient></defs><CartesianGrid stroke="#dde6f5" vertical={false} /><XAxis dataKey="month" tickFormatter={monthName} axisLine={false} tickLine={false} tick={{ fill: '#16365c', fontSize: 13 }} dy={8} /><YAxis allowDecimals={false} axisLine={{ stroke: '#b3c7e0' }} tickLine={false} tick={{ fill: '#16365c', fontSize: 13 }} /><Tooltip contentStyle={{ borderRadius: 17, borderColor: '#b6dbff', fontWeight: 700 }} labelFormatter={label => `${label}`} /><Area isAnimationActive={false} dataKey="count" name="New enrollments" type="linear" stroke="#0076ee" strokeWidth={4} fill="url(#adminEnrollmentFill)" dot={{ r: 5, strokeWidth: 3, fill: '#fff', stroke: '#0076ee' }} activeDot={{ r: 7 }} /></AreaChart></ResponsiveContainer> : <EmptyState>{analytics.isLoading ? 'Loading enrollment data…' : 'No enrollment data yet.'}</EmptyState>}</div></section>
      <section className="admin-panel admin-new-accounts"><PanelHeading icon={<BookOpen />} title="New Accounts" description="The latest members of LinawLetra." action={<Link to="/admin/users">View all <ArrowRight /></Link>} /><div className="admin-chart-eyebrow">SYSTEM ACTIVITY</div><div>{recent.length ? recent.map((user, index) => <article key={user.id}><span className={`admin-account-icon account-${index}`}><UsersRound /></span><div><b>{user.name || user.email}</b><small><span>{user.role}</span> · Account created</small></div><time dateTime={user.created_at}><CalendarDays />{formatDate(user.created_at)}</time></article>) : <EmptyState>{usersQuery.isLoading ? 'Loading accounts…' : 'No account activity yet.'}</EmptyState>}</div></section>
    </div>
    <section className="admin-quick-actions"><h2><Zap />QUICK ACTIONS</h2><div>{[
      { to: '/admin/users', Icon: UsersRound, title: 'Manage Users', description: 'Search, filter, and account actions' },
      { to: '/admin/teachers', Icon: GraduationCap, title: 'Create a Teacher', description: 'Create a teacher account' },
      { to: '/admin/analytics', Icon: ChartNoAxesColumnIncreasing, title: 'Open Analytics', description: 'Trends and system performance' },
    ].map(({ to, Icon, title, description }) => <Link key={to} to={to}><span><Icon /></span><div><b>{title}</b><small>{description}</small></div><ArrowRight /></Link>)}</div></section>
    {credentials.data && <details className="admin-credential-details"><summary><ShieldCheck />Credential security<span>{credentials.data.credentials.requiresRotation ? `${credentials.data.credentials.requiresRotation} accounts need password rotation` : 'Student credential records reviewed'}</span></summary><p>Legacy: {credentials.data.credentials.legacy} · Retired: {credentials.data.credentials.fullyRetired} · Missing metadata: {credentials.data.credentials.missing}</p></details>}
  </div>;
}
