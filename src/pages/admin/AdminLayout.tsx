import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Archive, Bell, BookOpen, ChartNoAxesColumnIncreasing, ClipboardList, GraduationCap, Home, IdCard, Layers, LogOut, Menu, Settings, UserPlus, UserRound, UsersRound, X } from 'lucide-react';
import { signOutWithAudit } from '../../lib/auth/authEvents';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNotifications } from '../../lib/useNotifications';
import { DashboardShell } from '../../components/DashboardShell';
import { adminEmblem, initials } from './AdminPrimitives';

const PRIMARY_TABS = [
  { to: '/admin', end: true, Icon: Home, label: 'Home' },
  { to: '/admin/students', Icon: UsersRound, label: 'Students' },
  { to: '/admin/parents', Icon: UsersRound, label: 'Parents' },
  { to: '/admin/teachers-monitoring', Icon: GraduationCap, label: 'Teachers' },
  { to: '/admin/users', Icon: IdCard, label: 'Users' },
  { to: '/admin/teachers', Icon: UserPlus, label: 'Create Teacher' },
  { to: '/admin/sections', Icon: Layers, label: 'Sections' },
  { to: '/admin/analytics', Icon: ChartNoAxesColumnIncreasing, label: 'Analytics' },
  { to: '/admin/audit-logs', Icon: ClipboardList, label: 'Audit Trail' },
  { to: '/admin/archived', Icon: Archive, label: 'Archive' },
  { to: '/admin/notifications', Icon: Bell, label: 'Notifications' },
  { to: '/admin/settings', Icon: Settings, label: 'Settings' },
  { to: '/admin/profile', Icon: UserRound, label: 'Profile' },
];
export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { identity } = useAuth();
  const { unreadCount } = useNotifications();
  return <DashboardShell roleLabel="Admin" hideHeader roleTheme="admin">
    <div className={`admin-console ${mobileOpen ? 'menu-open' : ''}`}>
      {mobileOpen && <button className="admin-menu-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className="admin-reference-sidebar dashboard-sidebar">
        <div className="admin-reference-brand"><BookOpen aria-hidden="true" /><div><b>LinawLetra</b><span>ADMIN CONSOLE</span></div><button type="button" onClick={() => setMobileOpen(false)} className="admin-mobile-close" aria-label="Close menu"><X /></button></div>
        <nav aria-label="Admin sections"><p>MAIN MENU</p>{PRIMARY_TABS.map(({ Icon, ...tab }) => <NavLink key={tab.to} to={tab.to} end={tab.end} onClick={() => setMobileOpen(false)}><span><Icon /></span><b>{tab.label}</b>{tab.to === '/admin/notifications' && unreadCount > 0 && <em>{unreadCount > 99 ? '99+' : unreadCount}</em>}</NavLink>)}</nav>
        <div className="admin-sidebar-mascot"><img src={adminEmblem} alt="" /></div>
        <div className="admin-sidebar-account"><NavLink to="/admin/profile" aria-label="Admin profile"><span>{initials(identity?.displayName || 'Admin User')}</span><b>{identity?.displayName || 'Admin User'}<small>Administrator</small></b></NavLink><button type="button" aria-label="Sign out" title="Sign out" onClick={() => void signOutWithAudit()}><LogOut /></button></div>
      </aside>
      <div className="admin-console-content">
        <div className="admin-mobile-navigation"><button type="button" aria-label="Open menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}><Menu aria-hidden="true" />Menu</button></div>
        <main className="admin-reference-main"><Outlet /></main>
        <svg className="admin-page-waves" viewBox="0 0 1300 130" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="adminFooterWave"><stop stopColor="#bce8ff"/><stop offset=".55" stopColor="#0399f8"/><stop offset="1" stopColor="#0062e7"/></linearGradient></defs><path fill="#ffcf00" d="M550 130C820 115 980-65 1300 48V130Z"/><path fill="#8edcff" d="M0 130C210 110 290-15 530 82S860 32 1040 78S1210 102 1300 50V130Z"/><path fill="url(#adminFooterWave)" d="M0 130C210 140 260 32 510 103S800 16 1010 92S1180 59 1300 80V130Z"/></svg>
      </div>
    </div>
  </DashboardShell>;
}
