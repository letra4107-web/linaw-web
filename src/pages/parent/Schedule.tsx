import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle } from '../../lib/cardStyle';

interface Child {
  id: string;
  name: string;
}

interface ScheduledActivity {
  id: string;
  child_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
}

const ACTIVITY_TYPES = [
  { value: 'reading_lesson', label: 'Aralin sa Pagbasa', color: '--color-brand-lavender' },
  { value: 'practice', label: 'Pagsasanay', color: '--color-brand-sage' },
  { value: 'reminder', label: 'Paalala', color: '--color-brand-sun' },
  { value: 'appointment', label: 'Pagpupulong', color: '--color-brand-coral' },
];

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Naka-iskedyul' },
  { value: 'in_progress', label: 'Ginagawa' },
  { value: 'completed', label: 'Nakumpleto' },
  { value: 'missed', label: 'Nalampasan' },
];

const WEEKDAY_LABELS = ['Lin', 'Lun', 'Mar', 'Miy', 'Huw', 'Biy', 'Sab'];
const MONTH_LABELS = [
  'Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo',
  'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre',
];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function colorFor(activityType: string) {
  return ACTIVITY_TYPES.find((t) => t.value === activityType)?.color ?? '--color-brand-lavender';
}

export default function Schedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [childId, setChildId] = useState('');
  const [activityType, setActivityType] = useState('reading_lesson');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: children } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase.from('children').select('id, name').order('name');
      if (err) throw err;
      return data as Child[];
    },
    enabled: Boolean(user),
  });

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['parent-schedule', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('scheduled_activities')
        .select('id, child_id, activity_type, title, description, scheduled_date, start_time, end_time, status')
        .order('scheduled_date', { ascending: true });
      if (err) throw err;
      return data as ScheduledActivity[];
    },
    enabled: Boolean(user),
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!childId) throw new Error('Pumili ng anak.');
      if (!title.trim()) throw new Error('Kailangan ng title.');
      if (!scheduledDate) throw new Error('Kailangan ng petsa.');

      const { error: err } = await supabase.from('scheduled_activities').insert({
        child_id: childId,
        created_by: 'parent',
        created_by_auth_uid: user!.id,
        activity_type: activityType,
        title: title.trim(),
        description: description.trim() || null,
        scheduled_date: scheduledDate,
        start_time: startTime || null,
        end_time: endTime || null,
        status: 'scheduled',
      });
      if (err) throw err;
    },
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setScheduledDate('');
      setStartTime('');
      setEndTime('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['parent-schedule'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await supabase.from('scheduled_activities').delete().eq('id', id);
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parent-schedule'] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error: err } = await supabase.from('scheduled_activities').update({ status }).eq('id', id);
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parent-schedule'] }),
  });

  const nameFor = (id: string) => children?.find((c) => c.id === id)?.name ?? 'Anak';

  const eventsByDate: Record<string, ScheduledActivity[]> = {};
  for (const s of schedule ?? []) {
    (eventsByDate[s.scheduled_date] ??= []).push(s);
  }

  const todayKey = toDateKey(new Date());
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());
  const calendarDays: { date: Date; key: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    calendarDays.push({ date: d, key: toDateKey(d), inMonth: d.getMonth() === viewMonth.getMonth() });
  }

  const selectedDayEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];
  const visibleSchedule = selectedDate
    ? [...selectedDayEvents].sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    : schedule ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Iskedyul</h1>
        <p className="text-[var(--color-text-muted)]">Mag-iskedyul ng reading session o gawain para sa iyong anak.</p>
      </div>

      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-violet')}>
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
            className="rounded-lg border border-white/60 bg-white/60 px-3 py-1.5 hover:border-[var(--color-primary)]"
          >
            ‹
          </button>
          <h2 className="text-lg font-semibold">
            {MONTH_LABELS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </h2>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            className="rounded-lg border border-white/60 bg-white/60 px-3 py-1.5 hover:border-[var(--color-primary)]"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--color-text-muted)]">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, key, inMonth }) => {
            const dayEvents = eventsByDate[key] ?? [];
            const isSelected = selectedDate === key;
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDate(isSelected ? null : key);
                  setScheduledDate(key);
                }}
                className={`flex min-h-16 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                    : 'border-transparent hover:border-[var(--color-border)]'
                } ${inMonth ? 'bg-white/40' : 'opacity-40'}`}
              >
                <span
                  className={`text-xs ${
                    isToday ? 'flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] font-semibold text-white' : ''
                  }`}
                >
                  {date.getDate()}
                </span>
                <div className="flex flex-wrap gap-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      title={ev.title}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: `var(${colorFor(ev.activity_type)})` }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-[var(--color-text-muted)]">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-white/60 pt-3 text-xs text-[var(--color-text-muted)]">
          {ACTIVITY_TYPES.map((t) => (
            <span key={t.value} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(${t.color})` }} />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">
              Mga gawain sa {selectedDate}
              {selectedDayEvents.length === 0 ? ' — wala pang naka-iskedyul' : ` (${selectedDayEvents.length})`}
            </p>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-sm text-[var(--color-primary)] underline"
            >
              Ipakita lahat
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border p-6"
        style={cardStyle('--color-brand-sage')}
      >
        <h2 className="text-lg font-semibold">Bagong Iskedyul</h2>
        <select
          value={childId}
          onChange={(e) => setChildId(e.target.value)}
          required
          className="rounded-lg border border-white/60 bg-white/70 px-4 py-2"
        >
          <option value="">Pumili ng anak</option>
          {(children ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className="rounded-lg border border-white/60 bg-white/70 px-4 py-2"
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Pamagat"
          required
          className="rounded-lg border border-white/60 bg-white/70 px-4 py-2"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsyon"
          className="rounded-lg border border-white/60 bg-white/70 px-4 py-2"
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
            className="rounded-lg border border-white/60 bg-white/70 px-4 py-2"
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-lg border border-white/60 bg-white/70 px-4 py-2"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-lg border border-white/60 bg-white/70 px-4 py-2"
          />
        </div>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <button
          type="submit"
          disabled={create.isPending}
          className="self-start rounded-lg bg-[var(--color-primary)] px-4 py-2 text-white disabled:opacity-60"
        >
          {create.isPending ? 'Ginagawa...' : 'Gumawa ng Iskedyul'}
        </button>
      </form>

      <div>
        {isLoading && <p>Naglo-load...</p>}
        <h2 className="mb-3 text-lg font-semibold">{selectedDate ? `Iskedyul ng ${selectedDate}` : 'Lahat ng Iskedyul'}</h2>
        <ul className="flex flex-col gap-3">
          {visibleSchedule.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border-l-4 px-4 py-3"
              style={{
                borderLeftColor: `var(${colorFor(s.activity_type)})`,
                backgroundColor: `color-mix(in srgb, var(${colorFor(s.activity_type)}) 10%, white)`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {nameFor(s.child_id)} · {ACTIVITY_TYPES.find((t) => t.value === s.activity_type)?.label} ·{' '}
                    {s.scheduled_date} {s.start_time ? `${s.start_time}–${s.end_time ?? ''}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={s.status}
                    onChange={(e) => updateStatus.mutate({ id: s.id, status: e.target.value })}
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => remove.mutate(s.id)}
                    className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm hover:border-[var(--color-danger)]"
                  >
                    <IconLabel icon="🗑️" label="Tanggalin" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {schedule && visibleSchedule.length === 0 && (
            <p className="text-[var(--color-text-muted)]">
              {selectedDate ? 'Walang naka-iskedyul sa araw na ito.' : 'Wala pang naka-iskedyul.'}
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
