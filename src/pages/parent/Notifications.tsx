import { useState } from 'react';
import { useNotifications, type NotificationRow } from '../../lib/useNotifications';
import { cardStyle } from '../../lib/cardStyle';

const TYPE_META: Record<string, { color: string; icon: string; label: string }> = {
  pdf_assignment: { color: '--color-brand-lavender', icon: '📄', label: 'Takdang-aralin' },
  assessment_graded: { color: '--color-brand-teal', icon: '📝', label: 'Assessment' },
  streak: { color: '--color-brand-coral', icon: '🔥', label: 'Streak' },
  lesson: { color: '--color-brand-lavender', icon: '📖', label: 'Aralin' },
  achievement: { color: '--color-brand-sun', icon: '🏅', label: 'Parangal' },
  xp: { color: '--color-brand-sun', icon: '★', label: 'XP' },
  practice: { color: '--color-brand-sage', icon: '🎙', label: 'Pagsasanay' },
  student_login: { color: '--color-brand-violet', icon: '●', label: 'Account' },
};
const LEARNING_TYPES = new Set(['lesson', 'pdf_assignment', 'assessment_graded', 'practice']);
const PROGRESS_TYPES = new Set(['streak', 'achievement', 'xp']);
type Filter = 'all' | 'unread' | 'learning' | 'progress';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Lahat' }, { value: 'unread', label: 'Hindi pa nabasa' }, { value: 'learning', label: 'Pag-aaral' }, { value: 'progress', label: 'Progreso' },
];
function isToday(iso: string) { return new Date(iso).toDateString() === new Date().toDateString(); }
function formatTime(iso: string) { return new Date(iso).toLocaleString('fil-PH', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }); }
function matchesFilter(notification: NotificationRow, filter: Filter) { if (filter === 'all') return true; if (filter === 'unread') return !notification.is_read; if (filter === 'learning') return LEARNING_TYPES.has(notification.type); if (filter === 'progress') return PROGRESS_TYPES.has(notification.type); return true; }

export default function ParentNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = notifications.filter((notification) => matchesFilter(notification, filter));
  const today = filtered.filter((notification) => isToday(notification.created_at));
  const earlier = filtered.filter((notification) => !isToday(notification.created_at));

  const renderGroup = (label: string, rows: NotificationRow[]) => rows.length > 0 && (
    <section key={label} aria-labelledby={`notification-${label}`}>
      <h2 id={`notification-${label}`} className="mb-3 text-sm font-bold tracking-[0.1em] text-[var(--color-text-muted)] uppercase">{label} <span className="ml-1 rounded-full bg-white/65 px-2 py-0.5 text-xs">{rows.length}</span></h2>
      <div className="flex flex-col gap-3">
        {rows.map((notification) => {
          const meta = TYPE_META[notification.type] ?? { color: '--color-brand-lavender', icon: '🔔', label: 'Update' };
          return (
            <button key={notification.id} type="button" onClick={() => !notification.is_read && markAsRead.mutate(notification.id)} className={`group relative flex min-w-0 items-start gap-3 overflow-hidden rounded-3xl border p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised sm:gap-4 sm:p-5 ${notification.is_read ? 'opacity-85' : 'border-[var(--color-primary)]/45'}`} style={cardStyle(meta.color, notification.is_read ? 5 : 10, notification.is_read ? 22 : 35)}>
              {!notification.is_read && <span className="absolute inset-y-0 left-0 w-1 bg-[var(--color-primary)]" aria-hidden="true" />}
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-xl shadow-sm" aria-hidden="true">{meta.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[0.68rem] font-bold" style={{ color: `var(${meta.color})` }}>{meta.label}</span>{!notification.is_read && <span className="text-[0.68rem] font-bold text-[var(--color-primary)]">BAGO</span>}</span>
                <span className="mt-2 block font-bold leading-snug">{notification.title}</span>
                {(notification.body ?? notification.message) && <span className="mt-1 block text-sm leading-relaxed text-[var(--color-text-muted)]">{notification.body ?? notification.message}</span>}
                <time dateTime={notification.created_at} className="mt-2 block text-xs font-semibold text-[var(--color-text-muted)]">{formatTime(notification.created_at)}</time>
              </span>
              {!notification.is_read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-primary)]" aria-label="Hindi pa nabasa" />}
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5 shadow-card sm:p-6" style={cardStyle('--color-brand-coral', 8, 28)}>
        <div><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-brand-coral)] uppercase">Updates</p><h1 className="text-2xl font-bold sm:text-3xl">Mga Abiso</h1><p className="text-sm text-[var(--color-text-muted)]">Mahahalagang update tungkol sa pag-aaral ng iyong anak.</p></div>
        <div className="rounded-2xl bg-white/70 px-4 py-2 text-center"><p className="text-2xl font-bold text-[var(--color-primary)]">{unreadCount}</p><p className="text-xs font-bold text-[var(--color-text-muted)]">Hindi pa nabasa</p></div>
      </header>

      {unreadCount > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] p-4"><p className="text-sm font-bold">May {unreadCount} bago kang update na dapat tingnan.</p><button type="button" onClick={() => markAllAsRead.mutate()} className="min-h-10 rounded-full border border-[var(--color-primary)] bg-white/70 px-4 text-sm font-bold text-[var(--color-primary)]">Markahan lahat bilang nabasa</button></div>}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="toolbar" aria-label="Salain ang mga abiso">{FILTERS.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition-all ${filter === item.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-card' : 'border-[var(--color-border)] bg-white/55 hover:border-[var(--color-primary)]'}`}>{item.label}{item.value === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}</button>)}</div>

      {!filtered.length ? <div className="rounded-3xl border border-dashed border-[var(--color-border)] bg-white/45 p-10 text-center"><p className="text-4xl" aria-hidden="true">🔔</p><h2 className="mt-3 text-xl font-bold">Walang abiso sa view na ito</h2><p className="mt-1 text-[var(--color-text-muted)]">Makikita rito ang mga update tungkol sa progreso at pag-aaral.</p></div> : <div className="flex flex-col gap-7">{renderGroup('Ngayon', today)}{renderGroup('Mas Nauna', earlier)}</div>}
    </div>
  );
}
