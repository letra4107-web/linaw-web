import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, BookOpen, CalendarDays, CheckCircle2, FileText, LogIn, Monitor, Pencil, ShieldAlert, Smartphone, UserPlus, UsersRound, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import auditHero from '../../assets/admin_design/admin-hero-background.png';
import mascot from '../../assets/admin_design/owl-admin-mascot.png';

type Log = {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  module: string;
  status: 'successful' | 'failed';
  metadata: { platform?: string; device?: string; sessionStatus?: string };
  created_at: string;
};

const dateTime = (value: string) => new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
}).format(new Date(value));

const day = (value?: string) => value ? new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila',
}).format(new Date(value)) : '—';

const roleClass = (role: string | null) => `audit-role ${role || 'system'}`;

const actionIcon = (action: string) => {
  const value = action.toLowerCase();
  if (value.includes('login')) return <LogIn />;
  if (value.includes('create') || value.includes('register')) return <UserPlus />;
  if (value.includes('update') || value.includes('edit')) return <Pencil />;
  if (value.includes('module') || value.includes('material')) return <BookOpen />;
  if (value.includes('progress')) return <Award />;
  return <FileText />;
};

export default function AuditLogs() {
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Log | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: '25' });
  if (role) params.set('role', role);
  if (status) params.set('status', status);

  const query = useQuery({
    queryKey: ['audit', params.toString()],
    queryFn: () => api<{ logs: Log[]; total: number; pageSize: number }>(`/admin/audit-logs?${params}`, { auth: true }),
  });
  const logs = query.data?.logs ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (query.data?.pageSize ?? 25)));
  const activeUsers = new Set(logs.map((log) => log.actor_name || log.actor_role || 'System')).size;
  const failed = logs.filter((log) => log.status === 'failed').length;
  const latest = logs[0]?.created_at;

  const resetFilters = () => { setRole(''); setStatus(''); setPage(1); };

  return (
    <div className="audit-reference mx-auto flex max-w-[1500px] flex-col gap-4 pb-8">
      <header className="audit-reference-hero relative overflow-hidden rounded-[1.4rem] border px-7 py-5 shadow-card">
        <img src={auditHero} alt="" aria-hidden="true" />
        <img src={mascot} alt="" aria-hidden="true" />
        <div>
          <p>Monitoring and security</p>
          <h1>Audit Trail</h1>
          <span>Track and review important activities in your system. Your records remain clear, secure, and easy to manage.</span>
        </div>
      </header>

      <section className="audit-kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article><span><FileText /></span><div><b>{total.toLocaleString()}</b><p>Total records</p><small>All recorded activities</small></div><i>↗</i></article>
        <article><span><UsersRound /></span><div><b>{activeUsers}</b><p>Active users</p><small>On this page of records</small></div><i>↗</i></article>
        <article><span><ShieldAlert /></span><div><b>{failed}</b><p>Needs attention</p><small>Unsuccessful activities</small></div><i>↗</i></article>
        <article><span><CalendarDays /></span><div><b>{latest ? 'Latest' : '—'}</b><p>{day(latest)}</p><small>Latest activity recorded</small></div><i>↗</i></article>
      </section>

      <section className="audit-filterbar rounded-2xl border p-3 shadow-card">
        <label>
          <span>Role</span>
          <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
            <option value="">All users</option><option value="student">Students</option><option value="parent">Parents</option><option value="teacher">Teachers</option><option value="admin">Admin</option>
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">All activities</option><option value="successful">Successful</option><option value="failed">Failed</option>
          </select>
        </label>
        <button type="button" onClick={resetFilters}>Reset</button>
      </section>

      {query.error && <p role="alert" className="rounded-2xl bg-[var(--color-danger-soft)] p-4 text-[var(--color-danger)]">Unable to load the Audit Trail.</p>}

      <section className="audit-table-card overflow-hidden rounded-[1.25rem] border shadow-card">
        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead><tr><th>Date &amp; time</th><th>User</th><th>Role</th><th>Action</th><th>Platform</th><th>Session</th><th>Status</th><th>Details</th></tr></thead>
            <tbody>
              {query.isLoading && Array.from({ length: 7 }, (_, index) => <tr key={index}><td colSpan={8}><div className="audit-skeleton animate-pulse" /></td></tr>)}
              {!query.isLoading && logs.map((log) => <tr key={log.id}>
                <td><span className="audit-date-icon"><CalendarDays /></span><b>{dateTime(log.created_at)}</b></td>
                <td><span className="audit-user-avatar">{(log.actor_name || log.actor_role || 'S').slice(0, 2).toUpperCase()}</span><span><b>{log.actor_name || 'System'}</b><small>{log.actor_role ? `${log.actor_role} account` : 'System activity'}</small></span></td>
                <td><span className={roleClass(log.actor_role)}>{log.actor_role || 'system'}</span></td>
                <td><span className="audit-action-icon">{actionIcon(log.action)}</span><span><b>{log.action.replaceAll('.', ' · ')}</b><small>{log.module || 'System'}</small></span></td>
                <td><span className="audit-platform">{log.metadata.platform?.toLowerCase() === 'mobile' ? <Smartphone /> : <Monitor />}{log.metadata.platform || 'Web'}</span></td>
                <td className="audit-session">{log.metadata.sessionStatus || 'No active session'}</td>
                <td><span className={log.status === 'successful' ? 'audit-status success' : 'audit-status failed'}>{log.status === 'successful' ? <CheckCircle2 /> : <XCircle />}{log.status === 'successful' ? 'Successful' : 'Failed'}</span></td>
                <td><button type="button" onClick={() => setSelected(log)}>View details&nbsp; →</button></td>
              </tr>)}
              {!query.isLoading && !logs.length && <tr><td colSpan={8} className="audit-empty">There are no audit records for these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <footer>
          <span>Showing {(total ? ((page - 1) * (query.data?.pageSize ?? 25)) + 1 : 0)}–{Math.min(page * (query.data?.pageSize ?? 25), total)} of {total.toLocaleString()} records</span>
          <div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>← Previous</button><b>{page}</b><button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button></div>
        </footer>
      </section>

      {selected && <div role="dialog" aria-modal="true" className="audit-modal" onMouseDown={() => setSelected(null)}>
        <article onMouseDown={(event) => event.stopPropagation()}>
          <header><div><p>Audit record</p><h2>Activity details</h2></div><button type="button" aria-label="Close" onClick={() => setSelected(null)}>×</button></header>
          <dl>
            <div><dt>User</dt><dd>{selected.actor_name || 'System'}</dd></div><div><dt>Role</dt><dd className="capitalize">{selected.actor_role || 'system'}</dd></div>
            <div><dt>Date &amp; time</dt><dd>{dateTime(selected.created_at)}</dd></div><div><dt>Status</dt><dd className="capitalize">{selected.status}</dd></div>
            <div><dt>Action</dt><dd>{selected.action.replaceAll('.', ' · ')}</dd></div><div><dt>Platform</dt><dd>{selected.metadata.platform || 'Web'}</dd></div>
            <div className="wide"><dt>Session</dt><dd>{selected.metadata.sessionStatus || 'No active session'}</dd></div>
            <div className="wide"><dt>Device / browser</dt><dd>{selected.metadata.device || 'Not available'}</dd></div>
          </dl>
        </article>
      </div>}
    </div>
  );
}
