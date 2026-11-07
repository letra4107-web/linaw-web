import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Archive, Bell, BookOpen, ChartNoAxesColumnIncreasing, ChevronLeft, ClipboardList, GraduationCap, Home, IdCard, Layers, LogOut, Menu, Search, Settings, UserPlus, UserRound, UsersRound, X } from 'lucide-react';
import { signOutWithAudit } from '../../lib/auth/authEvents';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNotifications } from '../../lib/useNotifications';
import { DashboardShell } from '../../components/DashboardShell';
import { AdminNavigationSearch } from '../../components/AdminNavigationSearch';
import { adminOwl, initials } from './AdminPrimitives';

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { identity } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const current = PRIMARY_TABS.find(tab => tab.to === location.pathname);
  return <DashboardShell roleLabel="Admin" hideHeader roleTheme="admin">
    <div className={`admin-console ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'menu-open' : ''}`}>
      {mobileOpen && <button className="admin-menu-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className="admin-reference-sidebar dashboard-sidebar">
        <div className="admin-reference-brand"><BookOpen aria-hidden="true" /><div><b>LinawLetra</b><span>ADMIN CONSOLE</span></div><button type="button" onClick={() => setMobileOpen(false)} className="admin-mobile-close" aria-label="Close menu"><X /></button></div>
        <nav aria-label="Admin sections"><p>MAIN MENU</p>{PRIMARY_TABS.map(({ Icon, ...tab }) => <NavLink key={tab.to} to={tab.to} end={tab.end} title={collapsed ? tab.label : undefined} onClick={() => setMobileOpen(false)}><span><Icon /></span><b>{tab.label}</b>{tab.to === '/admin/notifications' && unreadCount > 0 && <em>{unreadCount > 99 ? '99+' : unreadCount}</em>}</NavLink>)}</nav>
        <div className="admin-sidebar-mascot"><img src={adminOwl} alt="" /></div>
        <div className="admin-sidebar-account"><NavLink to="/admin/profile" aria-label="Admin profile"><span>{initials(identity?.displayName || 'Admin User')}</span><b>{identity?.displayName || 'Admin User'}<small>Administrator</small></b></NavLink><button type="button" aria-label="Sign out" title="Sign out" onClick={() => void signOutWithAudit()}><LogOut /></button></div>
      </aside>
      <div className="admin-console-content">
        <header className="admin-reference-topbar"><button type="button" className="admin-mobile-toggle" aria-label="Open menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}><Menu /></button><button type="button" className="admin-desktop-toggle" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}><ChevronLeft style={{ transform: collapsed ? 'rotate(180deg)' : undefined }} /></button><span className="admin-mobile-title">{current?.label || 'Admin Console'}</span><div className="admin-topbar-actions"><button type="button" aria-label="Search admin pages" aria-expanded={searchOpen} onClick={() => setSearchOpen(!searchOpen)}><Search /></button><NavLink to="/admin/notifications" aria-label="Notifications"><Bell />{unreadCount > 0 && <i />}</NavLink><NavLink to="/admin/profile" className="admin-topbar-avatar" aria-label="Admin profile">{initials(identity?.displayName || 'Admin User')}</NavLink></div>{searchOpen && <div className="admin-search-popover"><AdminNavigationSearch destinations={PRIMARY_TABS} /></div>}</header>
        <main className="admin-reference-main"><Outlet /></main>
        <svg className="admin-page-waves" viewBox="0 0 1300 130" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="adminFooterWave"><stop stopColor="#bce8ff"/><stop offset=".55" stopColor="#0399f8"/><stop offset="1" stopColor="#0062e7"/></linearGradient></defs><path fill="#ffcf00" d="M550 130C820 115 980-65 1300 48V130Z"/><path fill="#8edcff" d="M0 130C210 110 290-15 530 82S860 32 1040 78S1210 102 1300 50V130Z"/><path fill="url(#adminFooterWave)" d="M0 130C210 140 260 32 510 103S800 16 1010 92S1180 59 1300 80V130Z"/></svg>
      </div>
    </div>
  </DashboardShell>;
}
