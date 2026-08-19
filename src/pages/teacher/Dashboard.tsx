import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle } from '../../lib/cardStyle';

const QUICK_ACTIONS = [
  { to: '/teacher/lessons?tab=lessons', icon: '📚', label: 'Mga Aralin', desc: 'Suriin ang mga aralin', brand: '--color-brand-lavender' },
  { to: '/teacher/lessons?tab=pdf', icon: '📄', label: 'Pagbasa ng PDF', desc: 'Mag-upload at mag-assign', brand: '--color-brand-teal' },
  { to: '/teacher/lessons?tab=assessments', icon: '📝', label: 'Mga Pagsusulit', desc: 'Gumawa at markahan', brand: '--color-brand-sun' },
  { to: '/teacher/lessons?tab=paths', icon: '🧭', label: 'Landas ng Pagkatuto', desc: 'Ayusin ang aralin', brand: '--color-brand-coral' },
  { to: '/teacher/progress-reports', icon: '📊', label: 'Ulat ng Progreso', desc: 'Tingnan ang pag-unlad', brand: '--color-brand-violet' },
  { to: '/teacher/messages', icon: '✉️', label: 'Mga Mensahe', desc: 'Makipag-ugnayan sa magulang', brand: '--color-brand-sage' },
];

const STEPS = [
  { icon: '🎒', to: '/teacher/students', label: 'Mag-aaral Ko', text: 'Magdagdag ng mag-aaral sa iyong roster.' },
  { icon: '📚', to: '/teacher/lessons', label: 'Mga Aralin / Pagbasa ng PDF', text: 'Mag-upload ng aralin o PDF na babasahin ng mag-aaral.' },
  { icon: '📊', to: '/teacher/progress-reports', label: 'Ulat ng Progreso', text: 'Suriin ang pag-unlad pagkatapos ng ilang araw.' },
];

export default function Dashboard() {
  const { user, identity } = useAuth();

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

  const { data: materialsCount } = useQuery({
    queryKey: ['teacher-materials-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('pdf_materials')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', user!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: Boolean(user),
  });

  const stats = [
    { icon: '🎒', label: 'Mag-aaral Ko', value: rosterCount ?? 0, brand: '--color-brand-lavender' },
    { icon: '📄', label: 'Mga PDF na Na-upload', value: materialsCount ?? 0, brand: '--color-brand-teal' },
    { icon: '⏳', label: 'Hindi pa Tapos', value: pendingAssignments ?? 0, brand: '--color-brand-sun' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div
        className="overflow-hidden rounded-2xl p-8 text-white shadow-lg"
        style={{ backgroundImage: 'linear-gradient(135deg, #5c8047, #0d9488)' }}
      >
        <h1 className="text-3xl font-bold">
          <IconLabel icon="🧑‍🏫" label={`Kumusta, ${identity?.displayName ?? 'Guro'}!`} />
        </h1>
        <p className="mt-2 text-white/85">Buod ng iyong klase sa LinawLetra.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((c) => (
          <div key={c.label} className="flex flex-col gap-2 rounded-xl border p-5" style={cardStyle(c.brand)}>
            <span className="text-3xl" aria-hidden="true">
              {c.icon}
            </span>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm font-medium text-[var(--color-text-muted)]">{c.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Mabilisang Aksyon</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex flex-col gap-1 rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-card active:scale-95"
              style={cardStyle(action.brand)}
            >
              <span className="text-2xl" aria-hidden="true">
                {action.icon}
              </span>
              <p className="font-semibold">{action.label}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-6" style={cardStyle('--color-brand-sage')}>
        <h2 className="mb-4 text-lg font-semibold">Susunod na Hakbang</h2>
        <div className="flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <Link
              key={step.to}
              to={step.to}
              className="flex items-center gap-4 rounded-xl border border-white/60 bg-white/60 px-4 py-3 transition-colors hover:bg-white/90"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-sage)] text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="text-xl" aria-hidden="true">
                {step.icon}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{step.label}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{step.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
