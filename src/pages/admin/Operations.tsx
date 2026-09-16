import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { cardStyle } from '../../lib/cardStyle';

type Row = Record<string, unknown>;
interface Operations { schedules: Row[]; messages: Row[]; materials: Row[]; assignments: Row[]; rosterLinks: Row[]; progress: Row[]; readingLevels: Row[]; studentSettings: Row[]; names: Record<string, string>; children: Record<string, { name: string; parent: string | null }> }
const TABS = [{ key: 'schedules', label: 'Iskedyul ng magulang' }, { key: 'readingLevels', label: 'Reading level' }, { key: 'studentSettings', label: 'Student settings' }, { key: 'messages', label: 'Mensahe ng guro' }, { key: 'materials', label: 'Materyal ng guro' }, { key: 'assignments', label: 'Takdang-gawain' }, { key: 'rosterLinks', label: 'Roster ng guro' }, { key: 'progress', label: 'Progreso' }] as const;
type Tab = (typeof TABS)[number]['key'];
function date(value: unknown) { return value ? new Date(String(value)).toLocaleString('fil-PH') : '—'; }

export default function Operations() {
  const [tab, setTab] = useState<Tab>('schedules');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-operations'], queryFn: () => api<Operations>('/admin/operations', { auth: true }) });
  const rows = data?.[tab] ?? [];
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
  return <div className="flex flex-col gap-5"><header><p className="text-xs font-extrabold tracking-[.12em] text-[var(--color-primary)] uppercase">Central monitoring</p><h1 className="text-2xl font-extrabold sm:text-3xl">Mga Operasyon</h1><p className="mt-1 text-sm text-[var(--color-text-muted)]">Read-only na tanaw sa kasalukuyang parent, teacher, at student records.</p></header><div className="flex gap-2 overflow-x-auto pb-1">{TABS.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold ${tab === item.key ? 'bg-[var(--color-primary)] text-white' : 'bg-white/65'}`}>{item.label}</button>)}</div>{error ? <p role="alert" className="rounded-xl bg-[var(--color-danger-soft)] p-3 text-[var(--color-danger)]">{(error as Error).message}</p> : <section className="rounded-3xl border p-4 shadow-card" style={cardStyle('--color-brand-lavender', 5, 20)}>{isLoading ? <p>Naglo-load...</p> : <><p className="mb-3 text-sm font-bold text-[var(--color-text-muted)]">Pinakabagong {rows.length} record</p><ul className="space-y-2">{rows.map((row) => <li key={String(row.id)} className="rounded-2xl bg-white/65 p-3"><p className="font-semibold">{summary(row)}</p><time className="mt-1 block text-xs text-[var(--color-text-muted)]">{date(timestamp(row))}</time></li>)}{!rows.length && <li className="p-6 text-center text-sm text-[var(--color-text-muted)]">Wala pang record.</li>}</ul></>}</section>}</div>;
}
