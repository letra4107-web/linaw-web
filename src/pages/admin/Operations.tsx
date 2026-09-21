import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { cardStyle } from '../../lib/cardStyle';

type Row = Record<string, unknown>;
interface Operations { schedules: Row[]; messages: Row[]; materials: Row[]; assignments: Row[]; rosterLinks: Row[]; progress: Row[]; readingLevels: Row[]; studentSettings: Row[]; names: Record<string, string>; children: Record<string, { name: string; parent: string | null }> }
const TABS = [
  { key: 'schedules', label: 'Mga iskedyul', icon: '📅', description: 'Mga naka-planong gawain para sa mag-aaral.' },
  { key: 'readingLevels', label: 'Reading level', icon: '📖', description: 'Mga pagbabago sa antas ng pagbasa.' },
  { key: 'studentSettings', label: 'Accessibility', icon: '⚙️', description: 'Mga setting na tumutulong sa pagbasa.' },
  { key: 'messages', label: 'Mga mensahe', icon: '💬', description: 'Komunikasyon ng guro at magulang.' },
  { key: 'materials', label: 'Mga materyal', icon: '📄', description: 'Reading materials na in-upload ng guro.' },
  { key: 'assignments', label: 'Assignments', icon: '📝', description: 'Mga materyal na naka-assign sa mag-aaral.' },
  { key: 'rosterLinks', label: 'Teacher roster', icon: '👥', description: 'Ugnayan ng guro at mag-aaral.' },
  { key: 'progress', label: 'Progreso', icon: '📈', description: 'XP, streak, at natapos na gawain.' },
] as const;
type Tab = (typeof TABS)[number]['key'];
const PAGE_SIZE = 10;
const formatDate = (value: unknown) => value ? new Intl.DateTimeFormat('fil-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(String(value))) : 'Walang petsa';

export default function Operations() {
  const [tab, setTab] = useState<Tab>('schedules'); const [page, setPage] = useState(1); const [search, setSearch] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-operations'], queryFn: () => api<Operations>('/admin/operations', { auth: true }) });
  const active = TABS.find((item) => item.key === tab)!;
  const child = (id: unknown) => data?.children[String(id)]?.name || 'Hindi tukoy na mag-aaral';
  const name = (id: unknown) => data?.names[String(id)] || 'Hindi tukoy na user';
  const detail = (row: Row) => {
    if (tab === 'schedules') return { title: String(row.title || 'Walang pamagat'), meta: `${child(row.child_id)} · ${String(row.activity_type || 'Gawain')}`, badge: String(row.status || 'pending'), when: row.scheduled_date };
    if (tab === 'readingLevels') return { title: child(row.student_id), meta: `Level: ${String(row.override_level || '—')} · Itinakda ni ${name(row.created_by_auth_uid)}`, badge: 'Updated', when: row.created_at };
    if (tab === 'studentSettings') return { title: name(row.auth_uid), meta: `Font ${String(row.font_size || 'default')} · TTS ${row.tts_enabled ? 'naka-on' : 'naka-off'} · Guide ${row.reading_guide ? 'naka-on' : 'naka-off'}`, badge: row.dyslexia_font ? 'Dyslexia font' : 'Default', when: row.updated_at };
    if (tab === 'messages') return { title: name(row.teacher_id), meta: String(row.message || 'Walang mensahe').slice(0, 140), badge: row.read ? 'Nabasa' : 'Bago', when: row.created_at };
    if (tab === 'materials') return { title: String(row.title || 'Walang pamagat'), meta: `${name(row.teacher_id)} · Grade ${String(row.grade_level || '—')} · ${String(row.level || 'General')}`, badge: 'Material', when: row.created_at };
    if (tab === 'assignments') return { title: child(row.student_id), meta: `Itinakda ni ${name(row.assigned_by)}`, badge: String(row.status || 'Naka-assign'), when: row.assigned_at };
    if (tab === 'rosterLinks') return { title: child(row.student_id), meta: `Guro: ${name(row.teacher_id)}`, badge: 'Naka-roster', when: row.assigned_at };
    return { title: child(row.child_id), meta: `${Number(row.activities_completed || 0)} gawain · ${Number(row.xp || 0).toLocaleString()} XP · ${Number(row.streak || 0)} araw na streak`, badge: 'Progress', when: row.updated_at };
  };
  const rows = data?.[tab] ?? [];
  const filtered = useMemo(() => { const query = search.trim().toLowerCase(); return query ? rows.filter((row) => { const item = detail(row); return `${item.title} ${item.meta} ${item.badge}`.toLowerCase().includes(query); }) : rows; }, [rows, search, tab, data]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [tab, search]);
  return <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 pb-8">
    <header className="rounded-3xl border p-5 shadow-card sm:p-7" style={cardStyle('--color-brand-lavender', 7, 26)}><p className="text-xs font-extrabold tracking-[.14em] text-[var(--color-primary)] uppercase">Central monitoring</p><div className="mt-2 flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-extrabold sm:text-3xl">Mga Operasyon</h1><p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">Read-only na tanaw sa aktibong gawain, learning support, at records ng sistema.</p></div><div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3"><p className="text-xs font-bold text-[var(--color-text-muted)]">Operational records</p><p className="text-2xl font-extrabold">{data ? TABS.reduce((sum, item) => sum + data[item.key].length, 0).toLocaleString() : '—'}</p></div></div></header>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{TABS.slice(0, 4).map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`rounded-2xl border p-4 text-left shadow-card transition hover:-translate-y-0.5 ${tab === item.key ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary-soft)]' : 'bg-white/60'}`} style={cardStyle(tab === item.key ? '--color-brand-lavender' : '--color-brand-sage', 4, 18)}><span className="text-xl">{item.icon}</span><p className="mt-2 font-extrabold">{item.label}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{data?.[item.key].length ?? 0} records</p></button>)}</section>
    <nav aria-label="Operational categories" className="flex gap-2 overflow-x-auto pb-2">{TABS.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold ${tab === item.key ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'bg-white/70 hover:border-[var(--color-primary)]'}`}>{item.icon} {item.label}</button>)}</nav>
    {error ? <div role="alert" className="rounded-2xl bg-[var(--color-danger-soft)] p-4 text-[var(--color-danger)]"><b>Hindi ma-load ang operations.</b> {(error as Error).message}</div> : <section className="overflow-hidden rounded-3xl border bg-white/65 shadow-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5"><div><h2 className="font-extrabold">{active.icon} {active.label}</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">{active.description}</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="Maghanap sa listahan..." /></div>{isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-[var(--color-primary-soft)]" />)}</div> : <><ul className="divide-y divide-[var(--color-border)]">{shown.map((row) => { const item = detail(row); return <li key={String(row.id)} className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-[var(--color-primary-soft)]/30 sm:px-5"><div className="min-w-0 flex-1"><p className="truncate font-extrabold">{item.title}</p><p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.meta}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">{item.badge}</span><time className="text-xs font-medium text-[var(--color-text-muted)]">{formatDate(item.when)}</time></div></li>; })}{!shown.length && <li className="p-12 text-center"><p className="text-lg font-extrabold">Walang tumugmang record.</p><p className="mt-1 text-sm text-[var(--color-text-muted)]">Subukang baguhin ang search o pumili ng ibang kategorya.</p></li>}</ul>{filtered.length > 0 && <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><p className="text-sm text-[var(--color-text-muted)]">Ipinapakita {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} ng {filtered.length}</p><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-40">← Nakaraan</button><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-xl bg-[var(--color-brand-navy)] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Susunod →</button></div></footer>}</>}</section>}
  </div>;
}
