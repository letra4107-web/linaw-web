import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { cardStyle } from '../../lib/cardStyle';
import { DashboardShell } from '../../components/DashboardShell';
import logo from '../../assets/Logo.jpg';
import navBg from '../../assets/tds.webp';
import teacherBg from '../../assets/td.webp';

const PRIMARY_TABS = [
  { to: '/teacher', end: true, icon: '⌂', label: 'Dashboard' },
  { to: '/teacher/students', icon: '♟', label: 'Mga Mag-aaral' },
  { to: '/teacher/lessons', icon: '▤', label: 'Mga Aralin' },
  { to: '/teacher/progress-reports', icon: '▥', label: 'Analytics' },
  { to: '/teacher/messages', icon: '✉', label: 'Mga Mensahe' },
];

function navClass(collapsed: boolean) {
  return ({ isActive }: { isActive: boolean }) => `group flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-bold transition-all ${collapsed ? 'justify-center px-2' : ''} ${isActive ? 'border-white/25 bg-white text-[var(--color-brand-sage)] shadow-card' : 'border-transparent text-white/90 hover:border-white/15 hover:bg-white/15'}`;
}
function NavItem({ to, end, icon, label, collapsed, onNavigate }: { to: string; end?: boolean; icon: string; label: string; collapsed: boolean; onNavigate?: () => void }) {
  return <NavLink to={to} end={end} title={label} className={navClass(collapsed)} onClick={onNavigate}><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg transition-transform group-hover:scale-105">{icon}</span><span className={collapsed ? 'sr-only' : undefined}>{label}</span></NavLink>;
}

function ProfileMenu({ collapsed, mobile = false }: { collapsed: boolean; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { identity, user } = useAuth();
  const name = identity?.displayName ?? 'Guro';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || 'G';
  useEffect(() => { if (!open) return; const handler = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler); }, [open]);
  return (
    <div ref={menuRef} className="relative min-w-0">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" className={`flex min-h-12 w-full min-w-0 items-center gap-3 rounded-2xl border p-2 text-left transition-colors ${mobile ? 'border-[var(--color-border)] bg-white/75' : 'border-white/20 bg-white/10 text-white hover:bg-white/15'} ${collapsed ? 'justify-center' : ''}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-sage)] font-bold text-white shadow-sm">{initials}</span>
        {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{name}</span><span className={`block text-xs ${mobile ? 'text-[var(--color-text-muted)]' : 'text-white/65'}`}>Teacher account</span></span>}
      </button>
      {open && <div role="menu" className={`absolute z-50 w-72 max-w-[calc(100vw-2rem)] rounded-3xl border p-3 shadow-raised ${mobile ? 'top-full right-0 mt-2' : 'bottom-full left-0 mb-2'}`} style={cardStyle('--color-brand-sage', 8, 35)}><div className="mb-2 flex items-center gap-3 rounded-2xl bg-white/70 p-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-brand-sage)] font-bold text-white">{initials}</span><div className="min-w-0"><p className="truncate font-bold">{name}</p><p className="truncate text-xs text-[var(--color-text-muted)]">{user?.email}</p></div></div><NavLink to="/teacher/settings" onClick={() => setOpen(false)} role="menuitem" className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/70"><span aria-hidden="true">⚙</span> Profile at Settings</NavLink><div className="my-2 border-t border-white/70" /><button type="button" onClick={() => supabase.auth.signOut()} role="menuitem" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><span aria-hidden="true">↪</span> Mag-sign out</button></div>}
    </div>
  );
}

function NavContents({ collapsed }: { collapsed: boolean }) { return <><nav aria-label="Mga bahagi ng teacher dashboard" className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">{PRIMARY_TABS.map((tab) => <NavItem key={tab.to} {...tab} collapsed={collapsed} />)}</nav><div className="border-t border-white/20 p-3"><ProfileMenu collapsed={collapsed} /></div></>; }

export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <DashboardShell roleLabel="Guro" hideHeader bgImage={teacherBg}>
      <div className="flex min-h-screen min-w-0">
        <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/15 transition-[width] duration-300 lg:flex ${collapsed ? 'w-[4.75rem]' : 'w-56'}`} style={{ backgroundImage: `url(${navBg})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}>
          <div className={`flex h-16 items-center gap-2 border-b border-white/20 px-3 ${collapsed ? 'justify-center' : ''}`}><button type="button" onClick={() => setCollapsed((value) => !value)} className="flex min-w-0 items-center gap-2 rounded-xl p-1 text-white hover:bg-white/10"><img src={logo} alt="LinawLetra" className="h-10 w-10 shrink-0 rounded-xl object-cover" />{!collapsed && <span className="min-w-0 text-left"><span className="block truncate text-sm font-bold">LinawLetra</span><span className="block truncate text-xs text-white/65">Teacher Panel</span></span>}</button></div>
          <NavContents collapsed={collapsed} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 shadow-sm backdrop-blur lg:hidden"><div className="flex items-center gap-2"><img src={logo} alt="LinawLetra" className="h-10 w-10 rounded-xl object-cover" /><span className="font-bold text-[var(--color-brand-sage)]">Teacher Panel</span></div><div className="flex items-center gap-2"><ProfileMenu collapsed mobile /><button type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} className="flex h-12 min-w-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/75 text-xl"><span aria-hidden="true">☰</span><span className="sr-only">Menu</span></button></div></header>
          {mobileOpen && <div className="sticky top-16 z-30 border-b border-[var(--color-border)] p-3 shadow-card lg:hidden" style={{ backgroundImage: `url(${navBg})`, backgroundSize: '100% 100%' }}><nav className="grid grid-cols-2 gap-2 sm:grid-cols-3">{PRIMARY_TABS.map((tab) => <NavItem key={tab.to} {...tab} collapsed={false} onNavigate={() => setMobileOpen(false)} />)}</nav></div>}
          <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8"><Outlet /></main>
        </div>
      </div>
    </DashboardShell>
  );
}
