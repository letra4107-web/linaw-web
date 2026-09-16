import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { cardStyle } from '../../lib/cardStyle';

type Row = Record<string, unknown>;
interface Operations { schedules: Row[]; messages: Row[]; materials: Row[]; assignments: Row[]; rosterLinks: Row[]; progress: Row[]; readingLevels: Row[]; studentSettings: Row[]; names: Record<string, string>; children: Record<string, { name: string; parent: string | null }> }
const TABS = [{ key: 'schedules', label: 'Iskedyul ng magulang' }, { key: 'readingLevels', label: 'Reading level' }, { key: 'studentSettings', label: 'Student settings' }, { key: 'messages', label: 'Mensahe ng guro' }, { key: 'materials', label: 'Materyal ng guro' }, { key: 'assignments', label: 'Takdang-gawain' }, { key: 'rosterLinks', label: 'Roster ng guro' }, { key: 'progress', label: 'Progreso' }] as const;
type Tab = (typeof TABS)[number]['key'];
const PAGE_SIZE = 10;
function date(value: unknown) { return value ? new Date(String(value)).toLocaleString('fil-PH') : '—'; }

export default function Operations() {
  const [tab, setTab] = useState<Tab>('schedules');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-operations'], queryFn: () => api<Operations>('/admin/operations', { auth: true }) });
  const rows = data?.[tab] ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [tab]);
  const child = (id: unknown) => data?.children[String(id)]?.name || String(id || '—');
  const name = (id: unknown) => data?.names[String(id)] || String(id || '—');
  const summary = (row: Row) => {
    if (tab === 'schedules') return `${row.title} · ${child(row.child_id)} · ${row.status}`;
    if (tab === 'readingLevels') return `${child(row.student_id)} · ${row.override_level} · itinakda ni ${name(row.created_by_auth_uid)}`;
    if (tab === 'studentSettings') return `${name(row.auth_uid)} · font: ${row.font_size} · TTS: ${row.tts_enabled ? 'on' : 'off'} · guide: ${row.reading_guide ? 'on' : 'off'}`;
    if (tab === 'messages') return `${name(row.teacher_id)} → ${data?.children[String(row.child_id)]?.parent || 'Magulang'}: ${String(row.message).slice(0, 120)}`;
    if (tab === 'materials') return `${row.title} · ${name(row.teacher_id)} · Grade ${row.grade_level || '—'}`;
    if (tab === 'assignments') return `${child(row.student_id)} · ${row.status} · itinakda ni ${name(row.assigned_by)}`;
    if (tab === 'rosterLinks') return `${name(row.teacher_id)} → ${child(row.student_id)}`;
    return `${child(row.child_id)} · ${row.activities_completed || 0} gawain · ${row.xp || 0} XP · ${row.streak || 0} araw`;
  };
  const timestamp = (row: Row) => row.scheduled_date || row.created_at || row.assigned_at || row.updated_at;
  return <div className="flex min-w-0 flex-col gap-6"><header className="rounded-3xl border p-5 shadow-card sm:p-7" style={cardStyle('--color-brand-lavender', 7, 28)}><p className="text-xs font-extrabold tracking-[.12em] text-[var(--color-primary)] uppercase">Central monitoring</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Mga Operasyon</h1><p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">Read-only na tanaw sa kasalukuyang parent, teacher, at student records.</p></header><nav aria-label="Uri ng operational record" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">{TABS.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} aria-current={tab === item.key ? 'page' : undefined} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition-all ${tab === item.key ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-card' : 'border-[var(--color-border)] bg-white/70 hover:border-[var(--color-primary)]'}`}>{item.label}</button>)}</nav>{error ? <p role="alert" className="rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-4 font-semibold text-[var(--color-danger)]">{(error as Error).message}</p> : <section className="overflow-hidden rounded-3xl border bg-white/55 shadow-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-white/55 px-5 py-4"><div><h2 className="font-extrabold">{TABS.find((item) => item.key === tab)?.label}</h2><p className="text-xs text-[var(--color-text-muted)]">{rows.length} record{rows.length === 1 ? '' : 's'} available</p></div><span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--color-primary)]">Read-only</span></div>{isLoading ? <div className="p-10 text-center text-sm text-[var(--color-text-muted)]">Naglo-load ng records...</div> : <><ul className="divide-y divide-[var(--color-border)]">{visibleRows.map((row) => <li key={String(row.id)} className="p-4 transition-colors hover:bg-white/75 sm:px-5"><p className="font-semibold leading-relaxed">{summary(row)}</p><time className="mt-1 block text-xs font-medium text-[var(--color-text-muted)]">{date(timestamp(row))}</time></li>)}{!visibleRows.length && <li className="p-10 text-center text-sm text-[var(--color-text-muted)]">Wala pang record sa kategoryang ito.</li>}</ul>{rows.length > 0 && <footer className="flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border)] bg-white/45 px-5 py-3 sm:flex-row"><p className="text-sm font-semibold text-[var(--color-text-muted)]">Ipinapakita {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} ng {rows.length}</p><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="min-h-10 rounded-full border bg-white px-4 text-sm font-bold disabled:opacity-40">← Nakaraan</button><span className="px-1 text-sm font-bold">{page} / {totalPages}</span><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="min-h-10 rounded-full border bg-white px-4 text-sm font-bold disabled:opacity-40">Susunod →</button></div></footer>}</>}</section>}</div>;
}
