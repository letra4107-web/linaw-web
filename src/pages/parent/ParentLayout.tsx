import { NavLink, Outlet } from 'react-router-dom';
import { DashboardShell } from '../../components/DashboardShell';
import { IconLabel } from '../../components/a11y/IconLabel';

const TABS = [
  { to: '/parent', end: true, icon: '🏠', label: 'Bahay' },
  { to: '/parent/children', icon: '👧', label: 'Mga Anak Ko' },
  { to: '/parent/progress', icon: '📊', label: 'Ulat ng Progreso' },
  { to: '/parent/schedule', icon: '🗓️', label: 'Iskedyul' },
  { to: '/parent/messages', icon: '✉️', label: 'Mga Mensahe' },
];

export default function ParentLayout() {
  return (
    <DashboardShell roleLabel="Magulang">
      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Parent sections">
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
