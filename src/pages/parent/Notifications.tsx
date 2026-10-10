import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Bell, BookOpen, ChevronDown, ChevronRight, FileText, GraduationCap, Mail, Search, Settings2, X } from 'lucide-react';
import { useNotifications, type NotificationRow } from '../../lib/useNotifications';
import './notifications-reference.css';
import './secondary-tabs-reference.css';

const TYPE_META: Record<string, { Icon: typeof Bell; tone: string; label: string }> = {
  pdf_assignment: { Icon: FileText, tone: 'bg-orange-50 text-orange-500', label: 'Takdang-aralin' }, assessment_graded: { Icon: GraduationCap, tone: 'bg-rose-50 text-rose-500', label: 'Assessment' }, streak: { Icon: Award, tone: 'bg-amber-50 text-amber-500', label: 'Streak' }, lesson: { Icon: BookOpen, tone: 'bg-blue-50 text-blue-500', label: 'Aralin' }, achievement: { Icon: Award, tone: 'bg-emerald-50 text-emerald-500', label: 'Nakamit' }, xp: { Icon: Award, tone: 'bg-amber-50 text-amber-500', label: 'XP' }, practice: { Icon: BookOpen, tone: 'bg-sky-50 text-sky-500', label: 'Pagsasanay' }, student_login: { Icon: Settings2, tone: 'bg-indigo-50 text-indigo-500', label: 'Account' },
};
const LEARNING_TYPES = new Set(['lesson', 'pdf_assignment', 'assessment_graded', 'practice']); const PROGRESS_TYPES = new Set(['streak', 'achievement', 'xp']);
type Filter = 'all' | 'unread' | 'learning' | 'progress' | 'messages' | 'system';
function isToday(iso: string) { return new Date(iso).toDateString() === new Date().toDateString(); }
function formatTime(iso: string) { return new Date(iso).toLocaleString('fil-PH', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }); }
function matchesFilter(row: NotificationRow, filter: Filter) { return filter === 'all' || (filter === 'unread' && !row.is_read) || (filter === 'learning' && LEARNING_TYPES.has(row.type)) || (filter === 'progress' && PROGRESS_TYPES.has(row.type)) || (filter === 'messages' && /mensahe|message/i.test(`${row.title} ${row.body ?? row.message ?? ''}`)) || (filter === 'system' && row.type === 'student_login'); }

function NotificationModal({ row, onClose, updateError }: { row: NotificationRow; onClose: () => void; updateError?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>('button')?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab' || !dialog) return;
      const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, []);
  const meta = TYPE_META[row.type] ?? { Icon: Bell, tone: 'bg-blue-50 text-blue-500', label: 'Update' };
  const Icon = meta.Icon;
  return <div ref={dialogRef} className="notification-modal-backdrop fixed inset-0 z-[100] grid place-items-center bg-[#102b4d]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="notification-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <article className="notification-modal-card max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-2xl sm:p-7">
      <header className="flex items-start gap-3"><span className={`notification-modal-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${meta.tone}`}><Icon size={27} /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[var(--color-text-muted)]">{meta.label}</p><h2 id="notification-modal-title" className="mt-1 break-words text-xl font-bold">{row.title}</h2></div><button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-primary-soft)]" onClick={onClose} aria-label="Isara ang abiso"><X size={21} /></button></header>
      <div className="notification-modal-content mt-5"><time className="text-xs text-[var(--color-text-muted)]">{formatTime(row.created_at)}</time><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{row.body ?? row.message ?? 'Walang karagdagang detalye para sa abisong ito.'}</p></div>
      <footer className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">{updateError && <p role="alert" className="w-full text-sm text-[var(--color-danger)]">Hindi namarkahang nabasa ang abiso. Isara at subukan muli.</p>}<button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-bold text-white">Isara</button></footer>
    </article>
  </div>;
}

export default function ParentNotifications() {
  const { notifications, unreadCount, isLoading, error, refetch, markAsRead, markAllAsRead } = useNotifications(); const [filter, setFilter] = useState<Filter>('all'); const [search, setSearch] = useState(''); const [newestFirst, setNewestFirst] = useState(true); const [selected, setSelected] = useState<NotificationRow | null>(null);
  const filtered = useMemo(() => notifications.filter((row) => matchesFilter(row, filter) && `${row.title} ${row.body ?? row.message ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).sort((left, right) => newestFirst ? new Date(right.created_at).getTime() - new Date(left.created_at).getTime() : new Date(left.created_at).getTime() - new Date(right.created_at).getTime()), [filter, newestFirst, notifications, search]);
  const groups = [['Ngayon', filtered.filter((row) => isToday(row.created_at))], ['Mga Nauna', filtered.filter((row) => !isToday(row.created_at))]] as const;
  const count = (value: Filter) => notifications.filter((row) => matchesFilter(row, value)).length;
  const tabs: { value: Filter; label: string; count: number }[] = [{ value: 'all', label: 'Lahat', count: notifications.length }, { value: 'unread', label: 'Mga Bagong Abiso', count: unreadCount }, { value: 'progress', label: 'Progreso', count: count('progress') }, { value: 'learning', label: 'Iskedyul', count: count('learning') }, { value: 'messages', label: 'Mga Mensahe', count: count('messages') }, { value: 'system', label: 'System', count: count('system') }];
  return <div className="parent-notifications-page mx-auto flex w-full max-w-[48rem] flex-col gap-3 text-[#183260]">
    {isLoading && <p role="status">Kinukuha ang mga abiso...</p>}
    {error && <p role="alert">Hindi ma-load ang mga abiso. <button type="button" onClick={() => void refetch()}>Subukan muli</button></p>}
    {(markAsRead.error || markAllAsRead.error) && <p role="alert">Hindi na-update ang mga abiso. Subukan muli.</p>}
    <header className="notification-hero relative min-h-36 overflow-hidden rounded-2xl border border-[#d9edf9] bg-gradient-to-r from-[#f8fdff] via-[#eaf8ff] to-[#c9ebff] px-4 py-4 shadow-sm sm:px-5"><div className="relative z-10"><p className="text-[11px] font-extrabold tracking-[.12em] text-[#396393]">NOTIFICATIONS</p><h1 className="mt-2 text-[30px] font-extrabold leading-none tracking-tight text-[#173260]">Mga Abiso</h1><p className="mt-2 max-w-[27rem] text-[14px] leading-5 text-[#5d78a2]">Manatiling updated sa mga mahahalagang impormasyon<br className="hidden sm:block" /> tungkol sa iyong mga anak.</p></div><div aria-hidden="true" className="absolute -right-8 -bottom-12 h-44 w-44 rounded-full bg-[#d2edff]" /><div aria-hidden="true" className="notification-bell absolute right-10 top-5 grid h-24 w-24 place-items-center rounded-full bg-[#e9f7ff]"><Bell size={57} className="text-[#ffc846]" fill="currentColor" /><span className="absolute -right-2 top-1 grid h-9 w-9 place-items-center rounded-full bg-[#fa5a59] text-sm font-extrabold text-white">{unreadCount}</span></div></header>
    <nav className="notification-tabs grid grid-flow-col auto-cols-max gap-1.5 overflow-x-auto pb-1" aria-label="Salain ang mga abiso">{tabs.map((tab) => <button type="button" key={tab.value} onClick={() => setFilter(tab.value)} className={`h-10 rounded-xl border px-3 text-[11px] font-extrabold shadow-sm transition ${filter === tab.value ? 'is-active border-[#1979d8] bg-gradient-to-r from-[#288ee5] to-[#3d94e4] text-white' : 'border-[#d8e6f1] bg-white text-[#25406e] hover:border-[#80b9ee]'}`}>{tab.label} ({tab.count})</button>)}</nav>
    <div className="notification-tools flex gap-3"><label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#d8e6f1] bg-white px-3 shadow-sm"><Search size={18} className="text-[#4c78ae]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Maghanap ng abiso..." aria-label="Maghanap ng abiso" className="min-w-0 w-full border-0 bg-transparent text-[13px] outline-none placeholder:text-[#778cac]" /></label><button type="button" onClick={() => setNewestFirst((value) => !value)} aria-label="Baguhin ang ayos ng mga abiso" className="flex h-10 shrink-0 items-center justify-center gap-3 rounded-xl border border-[#d8e6f1] bg-white px-3 text-[12px] font-bold text-[#25406e] shadow-sm">{newestFirst ? 'Pinakabagong Una' : 'Pinakaluma Una'} <ChevronDown size={16} /></button></div>
    {isLoading || error ? null : !filtered.length ? <section className="rounded-2xl border border-dashed border-[#cbddeb] bg-white p-10 text-center"><Bell className="mx-auto text-blue-400" size={36} /><h2 className="mt-3 text-xl font-bold">Walang abiso sa view na ito</h2><p className="mt-1 text-sm text-[#6680a1]">Makikita rito ang mga update tungkol sa progreso at pag-aaral.</p></section> : groups.map(([label, rows]) => rows.length > 0 && <section className="notification-group" key={label}><h2 className="mb-2 mt-1 text-[17px] font-extrabold text-[#426492]">{label}</h2><div className="space-y-1.5">{rows.map((row) => { const meta = TYPE_META[row.type] ?? { Icon: Bell, tone: 'bg-blue-50 text-blue-500', label: 'Update' }; const Icon = meta.Icon; return <button key={row.id} type="button" disabled={markAsRead.isPending || markAllAsRead.isPending} onClick={() => { if (!row.is_read) markAsRead.mutate(row.id); setSelected(row); }} className={`notification-row group flex min-h-[76px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-px hover:shadow-md ${row.is_read ? 'border-[#e1edf5] bg-white' : 'border-[#ffe1df] bg-[#fff9f8]'}`}><span className={`notification-row-icon notification-icon-${row.type} grid h-11 w-11 shrink-0 place-items-center rounded-full ${meta.tone}`}><Icon size={22} />{!row.is_read && <span aria-label="Hindi pa nabasa" className="notification-unread h-2 w-2 rounded-full bg-[#f2503e]" />}</span><span className="notification-row-copy min-w-0 flex-1"><b className="block truncate text-[13px] text-[#172e59]">{row.title}</b><small className="mt-1 block truncate text-[12px] text-[#60779d]">{row.body ?? row.message ?? meta.label}</small></span><time className="notification-row-time hidden shrink-0 text-right text-[11px] font-medium leading-4 text-[#60779d] sm:block">{formatTime(row.created_at)}</time><ChevronRight size={19} className="notification-row-chevron shrink-0 text-[#2580da]" /></button>; })}</div></section>)}
    <button type="button" onClick={() => markAllAsRead.mutate()} disabled={isLoading || Boolean(error) || !unreadCount || markAsRead.isPending || markAllAsRead.isPending} className="mx-auto mt-2 flex min-h-10 items-center gap-2 rounded-full border border-[#d6e5f0] bg-white px-6 text-sm font-bold text-[#2f79c6] shadow-sm disabled:opacity-50"><Mail size={17} />{markAllAsRead.isPending ? 'Ina-update...' : 'Markahan lahat bilang nabasa'}</button>
    {selected && <NotificationModal row={selected} updateError={Boolean(markAsRead.error)} onClose={() => setSelected(null)} />}
  </div>;
}
