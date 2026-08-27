import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNotifications } from '../../lib/useNotifications';
import { DashboardShell } from '../../components/DashboardShell';
import { cardStyle } from '../../lib/cardStyle';
import logo from '../../assets/Logo.jpg';
import navBg from '../../assets/pds.webp';
import parentBg from '../../assets/pd.webp';

const PRIMARY_TABS = [
  { to: '/parent', end: true, icon: '⌂', label: 'Simula' },
  { to: '/parent/progress', icon: '▥', label: 'Progreso' },
  { to: '/parent/schedule', icon: '▦', label: 'Kalendaryo' },
  { to: '/parent/children', icon: '♟', label: 'Mga Anak Ko' },
  { to: '/parent/messages', icon: '✉', label: 'Mga Mensahe' },
];

function navClass(collapsed: boolean) {
  return ({ isActive }: { isActive: boolean }) =>
    `group flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-bold transition-all ${collapsed ? 'justify-center px-2' : ''} ${
      isActive
        ? 'border-white/25 bg-[var(--color-brand-coral)] text-white shadow-card'
        : 'border-transparent bg-black/10 text-white/90 hover:border-white/15 hover:bg-black/20'
    }`;
}

function NavItem({ to, end, icon, label, collapsed, onNavigate }: { to: string; end?: boolean; icon: string; label: string; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <NavLink to={to} end={end} title={label} className={navClass(collapsed)} onClick={onNavigate}>
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg transition-transform group-hover:scale-105">{icon}</span>
      <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
    </NavLink>
  );
}

function ProfileMenu({ collapsed, mobile = false }: { collapsed: boolean; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, identity } = useAuth();
  const { unreadCount } = useNotifications();
  const displayName = identity?.displayName ?? 'Magulang';
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || 'M';

  const { data: parentRow } = useQuery({
    queryKey: ['parent-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('parents').select('avatar_url').eq('auth_uid', user!.id).maybeSingle();
      if (error) throw error;
      return data as { avatar_url: string | null } | null;
    },
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Aking profile"
        className={`relative flex min-h-12 w-full min-w-0 items-center gap-3 rounded-2xl border p-2 text-left transition-all ${mobile ? 'border-[var(--color-border)] bg-white/75 text-[var(--color-text)]' : 'border-white/20 bg-black/10 text-white hover:bg-black/20'} ${collapsed ? 'justify-center' : ''}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-brand-coral)] font-bold text-white shadow-sm">
          {parentRow?.avatar_url ? <img src={parentRow.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{displayName}</span>
            <span className={`block text-xs ${mobile ? 'text-[var(--color-text-muted)]' : 'text-white/65'}`}>Parent account</span>
          </span>
        )}
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[0.65rem] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div role="menu" className={`absolute z-50 w-72 max-w-[calc(100vw-2rem)] rounded-3xl border p-3 shadow-raised ${mobile ? 'top-full right-0 mt-2' : 'bottom-full left-0 mb-2'}`} style={cardStyle('--color-brand-coral', 8, 36)}>
          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-white/70 p-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-brand-coral)] font-bold text-white">
              {parentRow?.avatar_url ? <img src={parentRow.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
            </span>
            <div className="min-w-0"><p className="truncate font-bold">{displayName}</p><p className="truncate text-xs text-[var(--color-text-muted)]">{user?.email}</p></div>
          </div>
          <NavLink to="/parent/settings" onClick={() => setOpen(false)} role="menuitem" className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/70"><span aria-hidden="true">🙂</span> Aking Detalye</NavLink>
          <NavLink to="/parent/notifications" onClick={() => setOpen(false)} role="menuitem" className="flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/70"><span className="flex items-center gap-2"><span aria-hidden="true">🔔</span> Mga Abiso</span>{unreadCount > 0 && <span className="rounded-full bg-[var(--color-danger)] px-2 py-0.5 text-xs text-white">{unreadCount}</span>}</NavLink>
          <NavLink to="/parent/app-settings" onClick={() => setOpen(false)} role="menuitem" className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/70"><span aria-hidden="true">⚙</span> Mga Setting</NavLink>
          <div className="my-2 border-t border-white/70" />
          <button type="button" onClick={() => supabase.auth.signOut()} role="menuitem" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><span aria-hidden="true">↪</span> Mag-sign out</button>
        </div>
      )}
    </div>
  );
}

function NavContents({ collapsed }: { collapsed: boolean }) {
  return (
    <>
      <nav aria-label="Mga bahagi ng parent dashboard" className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">
        {PRIMARY_TABS.map((tab) => <NavItem key={tab.to} {...tab} collapsed={collapsed} />)}
      </nav>
      <div className="border-t border-white/20 p-3"><ProfileMenu collapsed={collapsed} /></div>
    </>
  );
}

export default function ParentLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <DashboardShell roleLabel="Magulang" hideHeader bgImage={parentBg}>
      <div className="flex min-h-screen min-w-0">
        <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/15 transition-[width] duration-300 lg:flex ${collapsed ? 'w-[4.75rem]' : 'w-56'}`} style={{ backgroundImage: `url(${navBg})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}>
          <div className={`flex h-16 items-center gap-2 border-b border-white/20 px-3 ${collapsed ? 'justify-center' : ''}`}>
            <button type="button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? 'Palawakin ang sidebar' : 'Paliitin ang sidebar'} className="flex min-w-0 items-center gap-2 rounded-xl p-1 text-white transition-colors hover:bg-white/10">
              <img src={logo} alt="LinawLetra" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm" />
              {!collapsed && <span className="truncate font-bold">LinawLetra</span>}
            </button>
          </div>
          <NavContents collapsed={collapsed} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 shadow-sm backdrop-blur lg:hidden">
            <div className="flex min-w-0 items-center gap-2"><img src={logo} alt="LinawLetra" className="h-10 w-10 shrink-0 rounded-xl object-cover" /><span className="truncate font-bold text-[var(--color-primary)]">LinawLetra</span></div>
            <div className="flex items-center gap-2">
              <ProfileMenu collapsed mobile />
              <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-controls="parent-mobile-nav" className="flex h-12 min-w-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/75 text-xl font-bold"><span aria-hidden="true">☰</span><span className="sr-only">Menu</span></button>
            </div>
          </header>
          {mobileOpen && (
            <div id="parent-mobile-nav" className="sticky top-16 z-30 border-b border-[var(--color-border)] p-3 shadow-card lg:hidden" style={{ backgroundImage: `url(${navBg})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}>
              <nav aria-label="Mga bahagi ng parent dashboard" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRIMARY_TABS.map((tab) => <NavItem key={tab.to} {...tab} collapsed={false} onNavigate={() => setMobileOpen(false)} />)}
              </nav>
            </div>
          )}
          <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8"><Outlet /></main>
        </div>
      </div>
    </DashboardShell>
  );
}
