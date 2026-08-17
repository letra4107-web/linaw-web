import { NavLink, Outlet } from 'react-router-dom';
import { DashboardShell } from '../../components/DashboardShell';
import { IconLabel } from '../../components/a11y/IconLabel';

const TABS = [
  { to: '/teacher', end: true, icon: '🏠', label: 'Bahay' },
  { to: '/teacher/students', icon: '🎒', label: 'Mag-aaral Ko' },
  { to: '/teacher/lessons', icon: '📚', label: 'Mga Aralin' },
  { to: '/teacher/pdf-reading', icon: '📄', label: 'Pagbasa ng PDF' },
  { to: '/teacher/assessments', icon: '📝', label: 'Mga Pagsusulit' },
  { to: '/teacher/learning-paths', icon: '🧭', label: 'Landas ng Pagkatuto' },
  { to: '/teacher/activities', icon: '🗂️', label: 'Mga Gawain' },
  { to: '/teacher/progress-reports', icon: '📊', label: 'Ulat ng Progreso' },
  { to: '/teacher/settings', icon: '⚙️', label: 'Mga Setting' },
];

export default function TeacherLayout() {
  return (
    <DashboardShell roleLabel="Guro">
      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Teacher sections">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `rounded-full border px-4 py-2 text-sm ${
                isActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
              }`
            }
          >
            <IconLabel icon={tab.icon} label={tab.label} />
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </DashboardShell>
  );
}
