import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

type Role = 'student' | 'parent' | 'teacher';
type User = { id: string; name: string | null; email: string; account_status: string; lastLoginAt: string | null; profile: { gradeLevel?: number | null } };
type Module = { id: string; title?: string; module_number?: number; state?: 'completed' | 'in_progress' | 'not_started' | 'locked' };
type Detail = { progress?: { level?: string; activities_completed?: number; accuracy_sum?: number; total_attempts?: number; updated_at?: string }; modules?: Module[]; sessions?: Array<{ word?: string; accuracy_percentage?: number; created_at: string }>; activity?: Array<{ id: string; action: string; created_at: string }> };

const copy: Record<Role, [string, string]> = { student: ['Students', 'Student'], parent: ['Parents', 'Parent'], teacher: ['Teachers', 'Teacher'] };
const initials = (text?: string | null) => (text || '?').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const dateTime = (date?: string | null) => date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }).format(new Date(date)) : 'No recorded activity';
const label = (state?: string) => state === 'completed' ? 'Completed' : state === 'in_progress' ? 'In Progress' : state === 'locked' ? 'Locked' : 'Not Started';
const badge = (state?: string) => state === 'completed' ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : state === 'in_progress' ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning-text)]' : state === 'locked' ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]' : 'bg-slate-100 text-slate-600';

export default function RoleMonitoring({ role }: { role: Role }) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'modules' | 'sessions' | 'history'>('modules');
  const [plural, singular] = copy[role];
  const directory = useQuery({ queryKey: ['admin-role-monitoring', role], queryFn: () => api<{ users: User[] }>(`/admin/monitoring/users?role=${role}`, { auth: true }) });
  const users = useMemo(() => (directory.data?.users || []).filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase())), [directory.data, search]);
  useEffect(() => setSelectedId((id) => id && users.some((user) => user.id === id) ? id : users[0]?.id || null), [users]);
  const selected = users.find((user) => user.id === selectedId) || null;
  const details = useQuery({ queryKey: ['admin-monitoring-detail', selectedId], queryFn: () => api<Detail>(`/admin/monitoring/users/${selectedId}`, { auth: true }), enabled: Boolean(selectedId) });
  const data = details.data || {};
  const modules = data.modules || [];
  const sessions = data.sessions || [];
  const history = data.activity || [];
  const completed = modules.filter((module) => module.state === 'completed').length;
  const progress = modules.length ? Math.round((completed / modules.length) * 100) : 0;
  const average = data.progress?.total_attempts ? Math.round((data.progress.accuracy_sum || 0) / data.progress.total_attempts) : null;

  return <div className="mx-auto w-full max-w-[1500px] pb-8">
    <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><span>Home</span><span>/</span><span>{plural}</span>{selected && <><span>/</span><b className="text-[var(--color-text)]">{selected.name || selected.email}</b></>}</div>
    <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="rounded-3xl border bg-white/80 p-4 shadow-card">
        <h2 className="text-lg font-extrabold">{plural}</h2>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${singular.toLowerCase()}...`} className="mt-3 min-h-10 w-full rounded-xl border bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)]" />
        <div className="mt-3 max-h-[65vh] space-y-1 overflow-y-auto pr-1">
          {directory.isLoading && <p className="p-3 text-sm text-[var(--color-text-muted)]">Loading...</p>}
          {users.map((user) => <button key={user.id} type="button" onClick={() => { setSelectedId(user.id); setTab('modules'); }} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selectedId === user.id ? 'bg-[var(--color-primary-soft)] shadow-sm ring-1 ring-[var(--color-primary)]/20' : 'hover:bg-slate-50'}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-xs font-extrabold text-[var(--color-primary)]">{initials(user.name || user.email)}</span>
            <span className="min-w-0 flex-1"><b className="block truncate text-sm">{user.name || user.email}</b><small className="block truncate text-[var(--color-text-muted)]">{role === 'student' ? `Grade ${user.profile.gradeLevel ?? '—'}` : user.email}</small></span>
            <span title={user.account_status === 'active' ? 'Active' : 'Inactive'} className={`h-2.5 w-2.5 rounded-full ${user.account_status === 'active' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'}`} />
          </button>)}
          {!directory.isLoading && !users.length && <p className="p-3 text-sm text-[var(--color-text-muted)]">No matching accounts.</p>}
        </div>
      </aside>
      <main className="min-w-0">
        {!selected ? <section className="grid min-h-80 place-items-center rounded-3xl border bg-white/80 text-sm text-[var(--color-text-muted)] shadow-card">Select a user to monitor.</section> : <>
          <section className="rounded-3xl border bg-white/80 p-5 shadow-card">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,1.15fr)]">
              <div className="flex items-center gap-4"><span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-3xl font-extrabold text-[var(--color-primary)]">{initials(selected.name || selected.email)}</span><div><h1 className="text-3xl font-extrabold">{selected.name || selected.email}</h1><p className="mt-1 text-sm text-[var(--color-text-muted)]">{singular} · {data.progress?.level || 'No current level'} · <span className="rounded-full bg-[var(--color-success-soft)] px-2 py-1 text-xs font-bold text-[var(--color-success)]">{selected.account_status === 'active' ? 'Active' : 'Inactive'}</span></p><p className="mt-3 text-xs text-[var(--color-text-muted)]">Email: {selected.email}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">Last active: {dateTime(selected.lastLoginAt || data.progress?.updated_at)}</p></div></div>
              <div className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between text-sm font-extrabold"><span>Overall Progress</span><span className="text-xl">{progress}%</span></div><div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${progress}%` }} /></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">{[[`${completed} / ${modules.length || '—'}`, 'Modules Completed'], [data.progress?.activities_completed ?? '—', 'Activities Completed'], [average === null ? '—' : `${average}%`, 'Average Score'], [data.progress?.level || '—', 'Current Level']].map(([value, name]) => <div key={String(name)} className="rounded-xl border bg-slate-50 p-2 text-center"><b className="block text-base">{value}</b><small className="text-[11px] text-[var(--color-text-muted)]">{name}</small></div>)}</div></div>
            </div>
          </section>
          <nav className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border bg-white/80 p-2 shadow-sm">{([['modules', 'Module Progress'], ['sessions', 'Practice Sessions'], ['history', 'Activity History']] as const).map(([key, text]) => <button key={key} type="button" onClick={() => setTab(key)} className={`min-h-11 rounded-xl px-3 text-sm font-bold ${tab === key ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-primary-soft)]'}`}>{text}</button>)}</nav>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_18rem]">
            <section className="rounded-3xl border bg-white/80 p-5 shadow-card"><h2 className="text-xl font-extrabold">{tab === 'modules' ? 'Module Progress' : tab === 'sessions' ? 'Practice Sessions' : 'Activity History'}</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">{tab === 'modules' ? 'Current learning path and completion status.' : 'Recorded account data.'}</p>
              {details.isLoading ? <p className="mt-5 text-sm">Loading monitoring data...</p> : tab === 'modules' ? <div className="mt-5 space-y-2">{modules.map((module) => <article key={module.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-white p-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-sm font-bold">{module.module_number || '—'}</span><span className="min-w-0"><b className="block truncate">{module.title || 'Module'}</b><small className="text-[var(--color-text-muted)]">{label(module.state)}</small></span><span className={`rounded-full px-3 py-1 text-xs font-bold ${badge(module.state)}`}>{label(module.state)}</span></article>)}{!modules.length && <p className="mt-5 text-sm text-[var(--color-text-muted)]">No module progress is available yet.</p>}</div> : <ul className="mt-5 divide-y rounded-2xl border bg-white">{(tab === 'sessions' ? sessions.map((item, index) => ({ id: `${item.created_at}-${index}`, title: item.word || 'Practice activity', meta: `${item.accuracy_percentage ?? '—'}% · ${dateTime(item.created_at)}` })) : history.map((item) => ({ id: item.id, title: item.action.replaceAll('.', ' · '), meta: dateTime(item.created_at) }))).map((item) => <li key={item.id} className="p-3"><b className="block text-sm">{item.title}</b><small className="text-[var(--color-text-muted)]">{item.meta}</small></li>)}{(tab === 'sessions' ? !sessions.length : !history.length) && <li className="p-4 text-sm text-[var(--color-text-muted)]">No recorded data yet.</li>}</ul>}</section>
            <aside className="rounded-3xl border bg-white/80 p-5 shadow-card"><h2 className="text-lg font-extrabold">Recent Activity</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">Latest account events</p><div className="mt-5 space-y-4">{history.slice(0, 5).map((item) => <article key={item.id} className="border-l-2 border-[var(--color-primary)] pl-3"><b className="block text-sm">{item.action.replaceAll('.', ' ')}</b><small className="block pt-1 text-[11px] text-[var(--color-text-muted)]">{dateTime(item.created_at)}</small></article>)}{!history.length && <p className="text-sm text-[var(--color-text-muted)]">No recent activity.</p>}</div></aside>
          </div>
        </>}
      </main>
    </div>
  </div>;
}
