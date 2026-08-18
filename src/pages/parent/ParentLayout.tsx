import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNotifications } from '../../lib/useNotifications';
import { DashboardShell } from '../../components/DashboardShell';
import { IconLabel } from '../../components/a11y/IconLabel';
import logo from '../../assets/Logo.jpg';
import navBg from '../../assets/pds.webp';
import parentBg from '../../assets/pd.webp';
import { cardStyle } from '../../lib/cardStyle';

const PRIMARY_TABS = [
  { to: '/parent', end: true, icon: '🏠', label: 'Simula' },
  { to: '/parent/progress', icon: '📊', label: 'Progreso' },
  { to: '/parent/schedule', icon: '🗓️', label: 'Kalendaryo' },
  { to: '/parent/children', icon: '👧', label: 'Mga Anak Ko' },
  { to: '/parent/messages', icon: '✉️', label: 'Mga Mensahe' },
  { to: '/parent/settings', icon: '🙂', label: 'Aking Detalye' },
];

function navClass(collapsed: boolean) {
  return ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all ${
      collapsed ? 'justify-center px-0' : ''
    } ${
      isActive
        ? 'bg-[var(--color-brand-coral)] text-white shadow-md shadow-black/20'
        : 'bg-black/15 text-white hover:bg-black/25'
    }`;
}

function NavItem({ to, end, icon, label, collapsed }: { to: string; end?: boolean; icon: string; label: string; collapsed: boolean }) {
  return (
    <NavLink to={to} end={end} title={label} className={navClass(collapsed)}>
      <span aria-hidden="true">{icon}</span>
      <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
    </NavLink>
  );
}

function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, identity } = useAuth();
  const { unreadCount } = useNotifications();

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
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Aking menu"
        className={`relative flex w-full items-center gap-3 rounded-xl border border-white/25 bg-black/15 px-4 py-3 text-base text-white transition-colors hover:bg-black/25 ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        {parentRow?.avatar_url ? (
          <img src={parentRow.avatar_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true">🙂</span>
        )}
        <span className={collapsed ? 'sr-only' : 'truncate'}>{identity?.displayName ?? 'Aking menu'}</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-xs font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[90vw] rounded-xl border p-3 shadow-lg"
          style={cardStyle('--color-brand-coral')}
        >
          <NavLink
            to="/parent/app-settings"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-white/60"
          >
            <IconLabel icon="⚙️" label="Mga Setting" />
          </NavLink>

          <NavLink
            to="/parent/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-white/60"
          >
            <IconLabel icon="🔔" label="Mga Abiso" />
            {unreadCount > 0 && (
              <span className="rounded-full bg-[var(--color-danger)] px-2 py-0.5 text-xs font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>

          <div className="my-3 border-t border-white/60" />

          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
          >
            <IconLabel icon="🚪" label="Mag-sign out" />
          </button>
        </div>
      )}
    </div>
  );
}

function NavContents({ collapsed }: { collapsed: boolean }) {
  return (
    <>
      <nav aria-label="Parent sections" className="flex flex-1 flex-col gap-8 overflow-y-auto px-3 py-4">
        {PRIMARY_TABS.map((tab) => (
          <NavItem key={tab.to} to={tab.to} end={tab.end} icon={tab.icon} label={tab.label} collapsed={collapsed} />
        ))}
      </nav>
      <div className="border-t border-white/20 p-3">
        <ProfileMenu collapsed={collapsed} />
      </div>
    </>
  );
}

export default function ParentLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <DashboardShell roleLabel="Magulang" hideHeader bgImage={parentBg}>
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--color-border)] transition-[width] lg:flex ${
            collapsed ? 'w-20' : 'w-64'
          }`}
          style={{ backgroundImage: `url(${navBg})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}
        >
          <div className={`flex items-center gap-2 border-b border-white/20 px-3 py-4 ${collapsed ? 'justify-center' : ''}`}>
            {collapsed ? (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                title="Palawakin ang sidebar"
                className="shrink-0 rounded-lg"
              >
                <img src={logo} alt="Palawakin ang sidebar" className="h-10 w-10 rounded-lg object-cover" />
              </button>
            ) : (
              <>
                <img src={logo} alt="LinawLetra" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  title="Paliitin ang sidebar"
                  className="ml-auto flex shrink-0 items-center justify-center rounded-lg border border-white/25 p-2 text-white hover:bg-white/15"
                >
                  <span aria-hidden="true">«</span>
                  <span className="sr-only">Paliitin ang sidebar</span>
                </button>
              </>
            )}
          </div>
          <NavContents collapsed={collapsed} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 lg:hidden">
            <img src={logo} alt="LinawLetra" className="h-9 w-9 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              className="rounded-lg border border-[var(--color-border)] p-2"
            >
              <IconLabel icon="☰" label="Menu" />
            </button>
          </div>
          {mobileOpen && (
            <div
              className="flex flex-col border-b border-[var(--color-border)] lg:hidden"
              style={{ backgroundImage: `url(${navBg})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}
            >
              <NavContents collapsed={false} />
            </div>
          )}

          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardShell>
  );
}
