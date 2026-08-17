import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';

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
  { value: 'reading_lesson', label: 'Reading Lesson' },
  { value: 'practice', label: 'Practice' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'appointment', label: 'Appointment' },
];

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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-[var(--color-text-muted)]">Mag-iskedyul ng reading session o gawain para sa iyong anak.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h2 className="text-lg font-semibold">Bagong Iskedyul</h2>
        <select
          value={childId}
          onChange={(e) => setChildId(e.target.value)}
          required
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
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
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
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
          placeholder="Title"
          required
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsyon"
          className="rounded-lg border border-[var(--color-border)] px-4 py-2"
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2"
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
        <ul className="flex flex-col gap-3">
          {(schedule ?? []).map((s) => (
            <li key={s.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
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
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
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
          {schedule && schedule.length === 0 && (
            <p className="text-[var(--color-text-muted)]">Wala pang naka-iskedyul.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
