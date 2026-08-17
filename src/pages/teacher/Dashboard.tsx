import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: rosterCount } = useQuery({
    queryKey: ['teacher-roster-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('teacher_student_links')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(user),
  });

  const { data: pendingAssignments } = useQuery({
    queryKey: ['teacher-pending-assignments', user?.id],
    queryFn: async () => {
      const { data: materials, error: matErr } = await supabase
        .from('pdf_materials')
        .select('id')
        .eq('teacher_id', user!.id);
      if (matErr) throw matErr;
      const ids = (materials ?? []).map((m) => m.id);
      if (ids.length === 0) return 0;
      const { count, error } = await supabase
        .from('pdf_assignments')
        .select('id', { count: 'exact', head: true })
        .in('pdf_material_id', ids)
        .neq('status', 'completed');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(user),
  });

  const cards = [
    { to: '/teacher/students', icon: '🎒', label: 'Mag-aaral Ko', value: rosterCount ?? 0, hint: 'kabuuang mag-aaral' },
    { to: '/teacher/pdf-reading', icon: '📄', label: 'Pagbasa ng PDF', value: pendingAssignments ?? 0, hint: 'hindi pa tapos' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Buod ng Guro</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 hover:border-[var(--color-primary)]"
          >
            <p className="text-3xl font-semibold text-[var(--color-primary)]">{c.value}</p>
            <p className="mt-1">
              <IconLabel icon={c.icon} label={c.label} />
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">{c.hint}</p>
          </Link>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-2 text-lg font-semibold">Susunod na Hakbang</h2>
        <ul className="flex flex-col gap-2 text-[var(--color-text-muted)]">
          <li>
            1. Magdagdag ng mag-aaral sa{' '}
            <Link to="/teacher/students" className="text-[var(--color-primary)] underline">
              Mag-aaral Ko
            </Link>
            .
          </li>
          <li>
            2. Mag-upload ng aralin sa{' '}
            <Link to="/teacher/lessons" className="text-[var(--color-primary)] underline">
              Mga Aralin
            </Link>{' '}
            o{' '}
            <Link to="/teacher/pdf-reading" className="text-[var(--color-primary)] underline">
              Pagbasa ng PDF
            </Link>
            .
          </li>
          <li>
            3. Suriin ang{' '}
            <Link to="/teacher/progress-reports" className="text-[var(--color-primary)] underline">
              Ulat ng Progreso
            </Link>{' '}
            pagkatapos.
          </li>
        </ul>
      </div>
    </div>
  );
}
