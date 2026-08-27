import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNotifications } from '../../lib/useNotifications';
import { cardStyle } from '../../lib/cardStyle';
import { DashboardShell } from '../../components/DashboardShell';
import logo from '../../assets/Logo.jpg';
import navBg from '../../assets/ads.webp';
import adminBg from '../../assets/ad.webp';

const PRIMARY_TABS = [
  { to: '/admin', end: true, icon: '⌂', label: 'Dashboard' },
  { to: '/admin/users', icon: '👥', label: 'Mga User' },
  { to: '/admin/teachers', icon: '🎓', label: 'Mga Guro' },
  { to: '/admin/analytics', icon: '▥', label: 'Analytics' },
  { to: '/admin/archived', icon: '▣', label: 'Arkibo' },
  { to: '/admin/notifications', icon: '🔔', label: 'Mga Abiso' },
  { to: '/admin/settings', icon: '⚙', label: 'Profile' },
];

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? `${parts[0][0]}${parts[1]?.[0] ?? ''}`.toUpperCase() : 'A';
}

function NavContents({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { unreadCount } = useNotifications();
  return (
    <nav aria-label="Admin sections" className="flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-3">
      {PRIMARY_TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} onClick={onNavigate} title={collapsed ? tab.label : undefined} className={({ isActive }) => `group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-all ${collapsed ? 'justify-center px-0' : ''} ${isActive ? 'bg-white text-[var(--color-brand-navy)] shadow-card' : 'text-white/85 hover:bg-white/15 hover:text-white'}`}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center text-base" aria-hidden="true">{tab.icon}</span>
          <span className={collapsed ? 'sr-only' : 'truncate'}>{tab.label}</span>
          {tab.to === '/admin/notifications' && unreadCount > 0 && <span className={`${collapsed ? 'absolute right-1 top-1' : 'ml-auto'} flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[0.65rem] text-white`}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { identity, user } = useAuth();
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => menuRef.current && !menuRef.current.contains(event.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const name = identity?.displayName ?? 'Admin';
  return (
    <div ref={menuRef} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/20 px-2 text-left text-white transition-colors hover:bg-white/15 ${collapsed ? 'justify-center' : ''}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-sm font-extrabold">{initialsFor(name)}</span>
        {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{name}</span><span className="block truncate text-xs text-white/65">Administrator</span></span>}
        {!collapsed && <span aria-hidden="true" className="text-xs">⌃</span>}
      </button>
      {open && <div className="absolute bottom-full left-0 z-30 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border p-3 shadow-raised" style={cardStyle('--color-brand-lavender', 6, 28)}>
        <div className="flex items-center gap-3 p-2"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary)] font-extrabold text-white">{initialsFor(name)}</span><span className="min-w-0"><span className="block truncate font-bold">{name}</span><span className="block truncate text-xs text-[var(--color-text-muted)]">{user?.email}</span></span></div>
        <NavLink to="/admin/settings" onClick={() => setOpen(false)} className="mt-2 flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold hover:bg-white/70"><span aria-hidden="true">⚙</span> Account settings</NavLink>
        <button type="button" onClick={() => supabase.auth.signOut()} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-bold text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><span aria-hidden="true">↪</span> Mag-sign out</button>
      </div>}
    </div>
  );
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const current = PRIMARY_TABS.find((tab) => tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to));
  return (
    <DashboardShell roleLabel="Admin" hideHeader bgImage={adminBg}>
      <div className="flex min-h-screen min-w-0">
        <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/15 transition-[width] duration-200 lg:flex ${collapsed ? 'w-[4.75rem]' : 'w-60'}`} style={{ backgroundImage: `linear-gradient(rgba(28,45,105,.9),rgba(52,47,118,.88)),url(${navBg})`, backgroundSize: 'cover' }}>
          <div className={`relative flex h-16 items-center gap-2 border-b border-white/15 px-3 ${collapsed ? 'justify-center' : ''}`}><img src={logo} alt="LinawLetra" className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />{!collapsed && <div className="min-w-0"><p className="truncate text-sm font-extrabold text-white">LinawLetra</p><p className="truncate text-[0.68rem] font-semibold tracking-wide text-white/60 uppercase">Admin Console</p></div>}<button type="button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? 'Palawakin ang sidebar' : 'Paliitin ang sidebar'} className={`${collapsed ? 'absolute top-[4.4rem] right-[-.75rem]' : 'ml-auto'} flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-[var(--color-brand-navy)] text-xs text-white shadow-sm`}><span aria-hidden="true">{collapsed ? '›' : '‹'}</span></button></div>
          <NavContents collapsed={collapsed} />
          <div className="border-t border-white/15 p-2.5"><ProfileMenu collapsed={collapsed} /></div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 backdrop-blur lg:hidden"><div className="flex min-w-0 items-center gap-3"><img src={logo} alt="LinawLetra" className="h-9 w-9 rounded-xl object-cover" /><div className="min-w-0"><p className="truncate text-sm font-extrabold">{current?.label ?? 'Admin'}</p><p className="text-[0.65rem] font-bold tracking-wide text-[var(--color-text-muted)] uppercase">Admin Console</p></div></div><button type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-label="Buksan ang menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white/65 text-lg"><span aria-hidden="true">{mobileOpen ? '×' : '☰'}</span></button></header>
          {mobileOpen && <div className="sticky top-16 z-20 flex max-h-[calc(100vh-4rem)] flex-col border-b border-white/15 lg:hidden" style={{ backgroundImage: `linear-gradient(rgba(28,45,105,.94),rgba(52,47,118,.94)),url(${navBg})`, backgroundSize: 'cover' }}><NavContents collapsed={false} onNavigate={() => setMobileOpen(false)} /><div className="border-t border-white/15 p-2.5"><ProfileMenu collapsed={false} /></div></div>}
          <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 xl:px-8"><Outlet /></main>
        </div>
      </div>
    </DashboardShell>
  );
}
