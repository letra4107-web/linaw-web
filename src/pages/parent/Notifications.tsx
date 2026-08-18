import { useState } from 'react';
import { useNotifications, type NotificationRow } from '../../lib/useNotifications';
import { cardStyle } from '../../lib/cardStyle';

const TYPE_COLOR: Record<string, string> = {
  pdf_assignment: '--color-brand-lavender',
  assessment_graded: '--color-brand-teal',
  streak: '--color-brand-coral',
  lesson: '--color-brand-lavender',
  achievement: '--color-brand-sun',
  xp: '--color-brand-sun',
  practice: '--color-brand-sage',
  student_login: '--color-brand-violet',
};

const TYPE_ICON: Record<string, string> = {
  pdf_assignment: '📄',
  assessment_graded: '📝',
  streak: '🔥',
  lesson: '📖',
  achievement: '🏅',
  xp: '⭐',
  practice: '🎙️',
  student_login: '🔔',
};

const LEARNING_TYPES = new Set(['lesson', 'pdf_assignment', 'assessment_graded', 'practice']);
const PROGRESS_TYPES = new Set(['streak', 'achievement', 'xp']);

type Filter = 'all' | 'unread' | 'learning' | 'progress';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Lahat' },
  { value: 'unread', label: 'Hindi Pa Nabasa' },
  { value: 'learning', label: 'Pag-aaral' },
  { value: 'progress', label: 'Progreso' },
];

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('fil-PH', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' });
}

function matchesFilter(n: NotificationRow, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unread') return !n.is_read;
  if (filter === 'learning') return LEARNING_TYPES.has(n.type);
  if (filter === 'progress') return PROGRESS_TYPES.has(n.type);
  return true;
}

export default function ParentNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = notifications.filter((n) => matchesFilter(n, filter));
  const today = filtered.filter((n) => isToday(n.created_at));
  const earlier = filtered.filter((n) => !isToday(n.created_at));

  const renderGroup = (label: string, rows: NotificationRow[]) =>
    rows.length > 0 && (
      <div key={label}>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">{label}</h2>
        <div className="flex flex-col gap-2">
          {rows.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.is_read && markAsRead.mutate(n.id)}
              className={`flex items-start gap-4 rounded-xl border p-5 text-left transition-colors ${
                n.is_read ? '' : 'border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]'
              }`}
              style={n.is_read ? cardStyle(TYPE_COLOR[n.type] ?? '--color-brand-lavender') : undefined}
            >
              <span className="text-2xl" aria-hidden="true">
                {TYPE_ICON[n.type] ?? '🔔'}
              </span>
              <span className="flex-1">
                <span className="block font-medium">{n.title}</span>
                {(n.body ?? n.message) && (
                  <span className="mt-1 block text-sm text-[var(--color-text-muted)]">{n.body ?? n.message}</span>
                )}
                <span className="mt-2 block text-xs text-[var(--color-text-muted)]">{formatTime(n.created_at)}</span>
              </span>
              {!n.is_read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mga Abiso</h1>
        <p className="text-[var(--color-text-muted)]">Manatiling updated sa paglalakbay ng iyong anak sa pag-aaral.</p>
      </div>

      {unreadCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] p-4">
          <p className="text-sm font-medium">
            You have {unreadCount} new notification{unreadCount > 1 ? 's' : ''}. Narito ang pinakabagong update tungkol sa
            progreso ng iyong anak sa pag-aaral.
          </p>
          <button
            type="button"
            onClick={() => markAllAsRead.mutate()}
            className="shrink-0 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-primary)]"
          >
            Markahan lahat bilang nabasa
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={`rounded-full border px-4 py-2 text-sm ${
              filter === f.value
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={cardStyle('--color-brand-lavender')}>
          <p className="text-4xl">🔔</p>
          <p className="mt-3 text-lg font-medium">Wala ka pang notifications.</p>
          <p className="mt-1 text-[var(--color-text-muted)]">
            Makikita mo dito ang mga update tungkol sa progress ng iyong anak sa pag-aaral.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {renderGroup('Ngayon', today)}
          {renderGroup('Kanina', earlier)}
        </div>
      )}
    </div>
  );
}
