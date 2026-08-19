import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { IconLabel } from '../../components/a11y/IconLabel';
import { cardStyle } from '../../lib/cardStyle';
import { DashboardShell } from '../../components/DashboardShell';
import logo from '../../assets/Logo.jpg';
import navBg from '../../assets/tds.webp';
import teacherBg from '../../assets/td.webp';

const PRIMARY_TABS = [
  { to: '/teacher', end: true, icon: '🏠', label: 'Bahay' },
  { to: '/teacher/students', icon: '🎒', label: 'Mag-aaral Ko' },
  { to: '/teacher/lessons', icon: '📚', label: 'Mga Aralin' },
  { to: '/teacher/progress-reports', icon: '📊', label: 'Ulat ng Progreso' },
  { to: '/teacher/messages', icon: '✉️', label: 'Mga Mensahe' },
];

function navClass(collapsed: boolean) {
  return ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
      collapsed ? 'justify-center px-0' : ''
    } ${isActive ? 'bg-white text-[var(--color-brand-sage)] shadow-md' : 'text-white/85 hover:bg-white/15'}`;
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
  const { identity } = useAuth();

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
        className={`relative flex w-full items-center gap-3 rounded-lg border border-white/20 px-4 py-3 text-base text-white transition-colors hover:bg-white/15 ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        <span aria-hidden="true">🧑‍🏫</span>
        <span className={collapsed ? 'sr-only' : 'truncate'}>{identity?.displayName ?? 'Guro'}</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-64 max-w-[90vw] rounded-xl border p-3 shadow-lg" style={cardStyle('--color-brand-sage')}>
          <NavLink
            to="/teacher/settings"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-white/60"
          >
            <IconLabel icon="⚙️" label="Mga Setting" />
          </NavLink>
          <div className="my-2 border-t border-white/60" />
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
      <nav aria-label="Teacher sections" className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-4">
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

export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <DashboardShell roleLabel="Guro" hideHeader bgImage={teacherBg}>
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--color-border)] transition-[width] lg:flex ${
            collapsed ? 'w-20' : 'w-64'
          }`}
          style={{ backgroundImage: `url(${navBg})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}
        >
          <div className={`flex items-center gap-2 border-b border-white/20 px-3 py-4 ${collapsed ? 'justify-center' : ''}`}>
            {collapsed ? (
              <button type="button" onClick={() => setCollapsed(false)} title="Palawakin ang sidebar" className="shrink-0 rounded-lg">
                <img src={logo} alt="Palawakin ang sidebar" className="h-10 w-10 rounded-lg object-cover" />
              </button>
            ) : (
              <>
                <img src={logo} alt="LinawLetra" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">LinawLetra</p>
                  <p className="truncate text-xs text-white/70">Teacher Panel</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  title="Paliitin ang sidebar"
                  className="ml-auto flex shrink-0 items-center justify-center rounded-lg border border-white/20 p-2 text-white hover:bg-white/15"
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
            <div className="flex items-center gap-2">
              <img src={logo} alt="LinawLetra" className="h-9 w-9 rounded-lg object-cover" />
              <span className="text-sm font-bold">Teacher Panel</span>
            </div>
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

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardShell>
  );
}
