import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownUp, BarChart3, Bell, BookOpen, CalendarDays, CheckCheck, ChevronDown, ChevronRight, GraduationCap, Heart, Mail, MessageSquare, Play, Search, Settings, ShieldPlus, Star, Trophy, X } from 'lucide-react';
import { useNotifications, type NotificationRow } from '../../lib/useNotifications';
import { matchesNoticeFilter, notificationPresentation, type NoticeFilter, type NoticeIcon } from './notificationPresentation';
import notificationHeroArt from '../../assets/parent/messages-family-reading.png';
import noActivitiesArt from '../../assets/parent/no activities.png';
import './notifications-reference.css';

const ICONS = { book: BookOpen, trophy: Trophy, calendar: CalendarDays, play: Play, star: Star, mail: Mail, shield: ShieldPlus, graduation: GraduationCap } satisfies Record<NoticeIcon, typeof Bell>;
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('fil-PH', { hour: 'numeric', minute: '2-digit' });

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
  const meta = notificationPresentation(row), Icon = ICONS[meta.icon];
  return <div ref={dialogRef} className="notice-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="notification-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <article className="notice-modal-card">
      <header><span className={`notice-icon notice-tone-${meta.tone}`}><Icon size={27} aria-hidden="true" /></span><div><p>{meta.label}</p><h2 id="notification-modal-title">{row.title}</h2></div><button type="button" onClick={onClose} aria-label="Isara ang abiso"><X size={21} /></button></header>
      <div className="notice-modal-content"><time dateTime={row.created_at}>{dateLabel(row.created_at)} · {timeLabel(row.created_at)}</time><p>{row.body ?? row.message ?? 'Walang karagdagang detalye para sa abisong ito.'}</p></div>
      <footer>{updateError && <p role="alert">Hindi namarkahang nabasa ang abiso. Isara at subukan muli.</p>}<button type="button" onClick={onClose}>Isara</button></footer>
    </article>
  </div>;
}

export default function ParentNotifications() {
  const { notifications, unreadCount, isLoading, error, refetch, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<NoticeFilter>('all');
  const [search, setSearch] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);
  const [selected, setSelected] = useState<NotificationRow | null>(null);
  const filtered = useMemo(() => notifications.filter((row) => matchesNoticeFilter(row, filter) && `${row.title} ${row.body ?? row.message ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).sort((left, right) => newestFirst ? new Date(right.created_at).getTime() - new Date(left.created_at).getTime() : new Date(left.created_at).getTime() - new Date(right.created_at).getTime()), [filter, newestFirst, notifications, search]);
  const count = (value: NoticeFilter) => notifications.filter((row) => matchesNoticeFilter(row, value)).length;
  const tabs = [
    { value: 'all', label: 'Lahat', count: notifications.length, Icon: Bell, tone: 'teal' },
    { value: 'unread', label: 'Mga Bagong Abiso', count: unreadCount, Icon: Star, tone: 'gold' },
    { value: 'progress', label: 'Progreso', count: count('progress'), Icon: BarChart3, tone: 'violet' },
    { value: 'schedule', label: 'Iskedyul', count: count('schedule'), Icon: CalendarDays, tone: 'blue' },
    { value: 'messages', label: 'Mga Mensahe', count: count('messages'), Icon: MessageSquare, tone: 'violet' },
    { value: 'system', label: 'System', count: count('system'), Icon: Settings, tone: 'blue' },
  ] as const;
  const busy = markAsRead.isPending || markAllAsRead.isPending;
  return <div className="parent-notice-reference">
    <header className="notice-hero">
      <img className="notice-hero-art" src={notificationHeroArt} alt="" aria-hidden="true" fetchPriority="high" decoding="sync" />
      <div className="notice-hero-copy"><p>NOTIFICATIONS</p><h1>Mga <em>Abiso</em> <Bell aria-hidden="true" /></h1><span>Manatiling updated sa mahahalagang impormasyon tungkol sa iyong mga anak.</span></div>
      <aside className="notice-hero-note">Sama-sama sa bawat pag-unlad! <Heart fill="currentColor" aria-hidden="true" /></aside>
    </header>
    <nav className="notice-filters" aria-label="Salain ang mga abiso">{tabs.map(({ value, label, count: total, Icon, tone }) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`notice-filter-${tone}`}><Icon aria-hidden="true" /><span>{label} ({total})</span></button>)}</nav>
    <div className="notice-tools"><label className="notice-search"><Search size={21} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Maghanap ng abiso..." aria-label="Maghanap ng abiso" /></label><label className="notice-sort"><ArrowDownUp size={22} aria-hidden="true" /><select value={newestFirst ? 'newest' : 'oldest'} onChange={(event) => setNewestFirst(event.target.value === 'newest')} aria-label="Ayos ng mga abiso"><option value="newest">Pinakabagong Una</option><option value="oldest">Pinakaluma Una</option></select><ChevronDown size={18} aria-hidden="true" /></label></div>
    {isLoading && <p className="notice-state" role="status">Kinukuha ang mga abiso...</p>}
    {error && <div className="notice-error" role="alert">Hindi ma-load ang mga abiso. <button type="button" onClick={() => void refetch()}>Subukan muli</button></div>}
    {(markAsRead.error || markAllAsRead.error) && <p className="notice-error" role="alert">Hindi na-update ang mga abiso. Subukan muli.</p>}
    {!isLoading && !error && (!filtered.length ? <section className="notice-empty"><img src={noActivitiesArt} alt="" /><h2>{notifications.length ? 'Walang tugmang abiso' : 'Wala pang abiso'}</h2><p>{notifications.length ? 'Subukan ang ibang salita o filter.' : 'Makikita rito ang mga update tungkol sa progreso at pag-aaral ng iyong mga anak.'}</p></section> : <section className="notice-list" aria-label="Mga abiso"><h2 className="sr-only">Listahan ng mga abiso</h2>{filtered.map((row) => {
      const meta = notificationPresentation(row), Icon = ICONS[meta.icon];
      return <button key={row.id} type="button" disabled={busy} data-read={row.is_read} onClick={() => { if (!row.is_read) markAsRead.mutate(row.id); setSelected(row); }} className={`notice-row notice-tone-${meta.tone}`}>
        <span className="notice-icon"><Icon aria-hidden="true" /></span><span className={`notice-unread${row.is_read ? ' is-read' : ''}`} aria-hidden="true" />{!row.is_read && <span className="sr-only">Hindi pa nababasa. </span>}
        <span className="notice-row-copy"><b>{row.title}</b><small>{row.body ?? row.message ?? meta.label}</small></span><span className="notice-category">{meta.label}</span><time dateTime={row.created_at}><span>{dateLabel(row.created_at)}</span><span>{timeLabel(row.created_at)}</span></time><ChevronRight className="notice-row-chevron" size={21} aria-hidden="true" />
      </button>;
    })}</section>)}
    <footer className="notice-footer"><button type="button" onClick={() => markAllAsRead.mutate()} disabled={isLoading || Boolean(error) || !unreadCount || busy}><CheckCheck size={19} aria-hidden="true" />{markAllAsRead.isPending ? 'Ina-update...' : 'Markahan lahat bilang nabasa'}</button>{markAllAsRead.isSuccess && <span role="status">Namarkahan na bilang nabasa ang mga abiso.</span>}</footer>
    {selected && <NotificationModal row={selected} updateError={Boolean(markAsRead.error)} onClose={() => setSelected(null)} />}
  </div>;
}
