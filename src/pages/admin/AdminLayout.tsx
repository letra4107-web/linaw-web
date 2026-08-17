import { NavLink, Outlet } from 'react-router-dom';
import { DashboardShell } from '../../components/DashboardShell';
import { IconLabel } from '../../components/a11y/IconLabel';

const TABS = [
  { to: '/admin', end: true, icon: '🏠', label: 'Dashboard' },
  { to: '/admin/users', icon: '👥', label: 'Mga User' },
  { to: '/admin/archived', icon: '🗄️', label: 'Archive' },
  { to: '/admin/teachers', icon: '🧑‍🏫', label: 'Mga Guro' },
  { to: '/admin/analytics', icon: '📊', label: 'Analytics' },
];

export default function AdminLayout() {
  return (
    <DashboardShell roleLabel="Admin">
      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Admin sections">
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
