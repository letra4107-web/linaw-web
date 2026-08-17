import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../lib/useNotifications';
import { IconLabel } from './a11y/IconLabel';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ngayon lang';
  if (mins < 60) return `${mins}m ang nakaraan`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ang nakaraan`;
  const days = Math.floor(hrs / 24);
  return `${days}d ang nakaraan`;
}

export function NotificationsBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative rounded-full border border-[var(--color-border)] px-3 py-2 text-sm hover:border-[var(--color-primary)]"
      >
        <IconLabel icon="🔔" label="Mga Abiso" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-xs font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <p className="font-semibold">Mga Abiso</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead.mutate()}
                className="text-sm text-[var(--color-primary)] underline"
              >
                Markahan lahat na nabasa
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">Wala pang abiso.</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.is_read && markAsRead.mutate(n.id)}
                className={`block w-full border-b border-[var(--color-border)] px-4 py-3 text-left last:border-b-0 ${
                  n.is_read ? '' : 'bg-[var(--color-primary-soft)]'
                }`}
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{n.body ?? n.message}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{timeAgo(n.created_at)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
