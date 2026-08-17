import { NavLink, Outlet } from 'react-router-dom';
import { DashboardShell } from '../../components/DashboardShell';
import { IconLabel } from '../../components/a11y/IconLabel';

const TABS = [
  { to: '/student', end: true, icon: '🏠', label: 'Dashboard' },
  { to: '/student/learn', icon: '📖', label: 'Matuto' },
  { to: '/student/pdf-reading', icon: '📄', label: 'PDF Reading' },
  { to: '/student/profile', icon: '🙂', label: 'Profile Ko' },
];

export default function StudentLayout() {
  return (
    <DashboardShell roleLabel="Mag-aaral">
      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Student sections">
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
