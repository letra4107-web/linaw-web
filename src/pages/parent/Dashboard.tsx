import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';

interface Child {
  id: string;
  name: string;
  grade_level: number;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: children } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('children').select('id, name, grade_level').order('name');
      if (error) throw error;
      return data as Child[];
    },
    enabled: Boolean(user),
  });

  const { data: upcomingCount } = useQuery({
    queryKey: ['parent-upcoming-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('scheduled_activities')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(user),
  });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Buod ng Magulang</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/parent/children"
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 hover:border-[var(--color-primary)]"
        >
          <p className="text-3xl font-semibold text-[var(--color-primary)]">{(children ?? []).length}</p>
          <p className="mt-1">
            <IconLabel icon="👧" label="Mga Anak" />
          </p>
        </Link>
        <Link
          to="/parent/schedule"
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 hover:border-[var(--color-primary)]"
        >
          <p className="text-3xl font-semibold text-[var(--color-primary)]">{upcomingCount ?? 0}</p>
          <p className="mt-1">
            <IconLabel icon="🗓️" label="Paparating na Iskedyul" />
          </p>
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-3 text-lg font-semibold">Mga Anak</h2>
        {children && children.length === 0 && (
          <p className="text-[var(--color-text-muted)]">
            Wala ka pang naka-enroll na anak.{' '}
            <Link to="/parent/children" className="text-[var(--color-primary)] underline">
              Mag-enroll ngayon
            </Link>
            .
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {(children ?? []).map((c) => (
            <li key={c.id} className="rounded-lg border border-[var(--color-border)] px-4 py-2">
              {c.name} · Grade {c.grade_level}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
