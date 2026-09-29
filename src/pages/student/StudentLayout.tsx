import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, ChevronDown, CircleUserRound, House, LogOut, Trophy, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useAccessibility, type FontScale } from '../../lib/a11y/AccessibilityContext';
import { DashboardShell } from '../../components/DashboardShell';
import { IconLabel } from '../../components/a11y/IconLabel';
import { softSignOut } from '../../lib/auth/softSignOut';
import logo from '../../assets/Logo.jpg';
import sidebarBackground from '../../assets/students/backgrounds/sidebar-background.png';
import owlMascot from '../../assets/students/mascot/owl-mascot.png';

const PRIMARY_TABS = [
  { to: '/student', end: true, icon: House, label: 'Simula' },
  { to: '/student/learn', icon: BookOpen, label: 'Aralin' },
  { to: '/student/achievements', icon: Trophy, label: 'Parangal' },
];

interface StudentSettingsRow {
  dyslexia_font: boolean;
  font_size: FontScale;
  high_contrast: boolean;
  reading_guide: boolean;
}

function useStudentAccessibilitySync() {
  const { user } = useAuth();
  const { setFont, setTheme, setReadingGuide, setFontScale } = useAccessibility();

  useEffect(() => {
    if (!user) return;
    let active = true;

    const applyRow = (row: StudentSettingsRow | null) => {
      if (!active || !row) return;
      setFont(row.dyslexia_font ? 'dyslexic' : 'default');
      setTheme(row.high_contrast ? 'high-contrast' : 'default');
      setReadingGuide(Boolean(row.reading_guide));
      setFontScale(row.font_size ?? 'medium');
    };

    supabase
      .from('student_settings')
      .select('dyslexia_font, font_size, high_contrast, reading_guide')
      .eq('auth_uid', user.id)
      .maybeSingle()
      .then(({ data }) => applyRow(data as StudentSettingsRow | null));

    const channel = supabase
      .channel(`student-settings-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_settings', filter: `auth_uid=eq.${user.id}` },
        (payload) => applyRow(payload.new as StudentSettingsRow | null),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}

function navClass(collapsed: boolean) {
  return ({ isActive }: { isActive: boolean }) =>
    `student-sidebar-nav-item group flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2.5 text-base font-bold transition-all ${
      collapsed ? 'justify-center px-2' : ''
    } ${
      isActive
        ? 'border-[#A99AD8]/55 bg-[#FFF9EE]/85 text-[var(--color-text)] shadow-card'
        : 'border-transparent bg-[#FFF9EE]/55 text-[var(--color-text)] hover:border-[#A99AD8]/45 hover:bg-[#FFF9EE]/80'
    }`;
}

function NavItem({
  to,
  end,
  icon,
  label,
  collapsed,
  onNavigate,
}: {
  to: string;
  end?: boolean;
  icon: typeof House;
  label: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const NavIcon = icon;
  return (
    <NavLink to={to} end={end} title={label} className={navClass(collapsed)} onClick={onNavigate}>
      {({ isActive }) => (
        <>
          <span className={`student-sidebar-nav-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${isActive ? 'bg-white/90 shadow-sm' : 'bg-white/65'}`}>
            <NavIcon aria-hidden="true" className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

function ProfileMenu({ collapsed, mobile = false }: { collapsed: boolean; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { identity, user } = useAuth();
  const displayName = identity?.displayName ?? 'Mag-aaral';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'M';

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const signOut = () => {
    if (user) {
      softSignOut({
        userId: user.id,
        role: 'student',
        displayName,
        email: user.email ?? '',
      });
    } else {
      supabase.auth.signOut();
    }
  };

  return (
    <div ref={menuRef} className="student-sidebar-profile-menu relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        title="Aking profile"
        className={`student-sidebar-profile-trigger flex min-h-12 w-full min-w-0 items-center gap-3 rounded-2xl border p-2 text-left transition-all ${open ? 'student-sidebar-profile-trigger-open' : ''} ${mobile ? 'border-[var(--color-border)] bg-white/75 hover:border-[var(--color-primary)]' : 'border-white/20 bg-white/10 text-white hover:bg-white/15'} ${collapsed ? 'justify-center' : ''}`}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-primary)] text-lg font-bold text-white shadow-sm">
          <CircleUserRound aria-hidden="true" className="absolute inset-0 h-full w-full p-1 opacity-35" />
          <span className="relative">{initial}</span>
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{displayName}</span>
            <span className={`block text-xs ${mobile ? 'text-[var(--color-text-muted)]' : 'text-white/65'}`}>Aking profile</span>
          </span>
        )}
        {!collapsed && <ChevronDown aria-hidden="true" className={`mr-1 h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={`student-profile-popover absolute z-50 ${mobile ? 'student-profile-popover-mobile' : ''}`}
        >
          <div className="student-profile-popover-header flex items-center gap-3">
            <span className="student-profile-popover-avatar flex shrink-0 items-center justify-center text-lg font-bold text-white">{initial}</span>
            <div className="min-w-0">
              <p className="truncate font-bold">{displayName}</p>
              <p className="student-profile-popover-email">{user?.email ?? 'Student account'}</p>
            </div>
          </div>
          <NavLink to="/student/profile" onClick={() => setOpen(false)} role="menuitem" className="student-profile-popover-item student-profile-popover-view-profile">
            <UserRound aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>Tingnan ang aking profile</span>
          </NavLink>
          <div className="student-profile-popover-divider" />
          <button type="button" onClick={signOut} role="menuitem" className="student-profile-popover-item student-profile-popover-sign-out">
            <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>Mag-sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}

function NavContents({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <>
      <nav aria-label="Mga bahagi ng student dashboard" className="student-sidebar-nav flex flex-1 flex-col gap-1.5 px-3 py-4">
        {PRIMARY_TABS.map((tab) => (
          <NavItem key={tab.to} to={tab.to} end={tab.end} icon={tab.icon} label={tab.label} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>
      <div aria-hidden="true" className={`student-sidebar-scene ${collapsed ? 'is-collapsed' : ''}`}>
        <img src={owlMascot} alt="" />
      </div>
      <div className="student-sidebar-profile-area border-t border-white/20 p-3">
        <ProfileMenu collapsed={collapsed} />
      </div>
    </>
  );
}

export default function StudentLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  useStudentAccessibilitySync();

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileOpen(false);
      mobileMenuButtonRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <DashboardShell roleLabel="Mag-aaral" hideHeader roleTheme="student">
      <div className="flex min-h-screen min-w-0">
        <aside
          className={`student-sidebar dashboard-sidebar sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/35 transition-[width] duration-300 lg:flex ${collapsed ? 'w-[4.75rem]' : 'w-56'}`}
          style={{ backgroundImage: `linear-gradient(180deg, rgba(101,122,203,.78) 0%, rgba(120,134,213,.70) 28%, rgba(146,142,219,.62) 55%, rgba(183,166,223,.52) 76%, rgba(213,190,227,.32) 100%), url(${sidebarBackground})` }}
        >
          <div className={`student-sidebar-logo-header flex h-16 items-center gap-2 border-b border-white/20 px-3 ${collapsed ? 'justify-center' : ''}`}>
            <button type="button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? 'Palawakin ang sidebar' : 'Paliitin ang sidebar'} className="student-sidebar-logo-button flex min-w-0 items-center gap-2 rounded-xl p-1 text-[var(--color-text)] transition-colors hover:bg-[#FFF9EE]/60">
              <img src={logo} alt="LinawLetra" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm" />
              {!collapsed && <span className="truncate font-bold">LinawLetra</span>}
            </button>
          </div>
          <NavContents collapsed={collapsed} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 shadow-sm backdrop-blur lg:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <img src={logo} alt="LinawLetra" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
              <span className="truncate font-bold text-[var(--color-primary)]">LinawLetra</span>
            </div>
            <div className="flex items-center gap-2">
              <ProfileMenu collapsed mobile />
              <button ref={mobileMenuButtonRef} type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-controls="student-mobile-nav" className="flex h-12 min-w-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/70 transition-colors hover:border-[var(--color-primary)]">
                <IconLabel icon="☰" label="Menu" />
              </button>
            </div>
          </header>

          {mobileOpen && (
            <div id="student-mobile-nav" className="student-mobile-nav sticky top-16 z-30 border-b border-white/35 shadow-card lg:hidden" style={{ backgroundImage: `linear-gradient(180deg, rgba(101,122,203,.78) 0%, rgba(120,134,213,.70) 28%, rgba(146,142,219,.62) 55%, rgba(183,166,223,.52) 76%, rgba(213,190,227,.32) 100%), url(${sidebarBackground})` }}>
              <nav aria-label="Mga bahagi ng student dashboard" className="grid grid-cols-3 gap-2 p-3">
                {PRIMARY_TABS.map((tab) => (
                  <NavItem key={tab.to} to={tab.to} end={tab.end} icon={tab.icon} label={tab.label} collapsed={false} onNavigate={() => setMobileOpen(false)} />
                ))}
              </nav>
            </div>
          )}

          <main className="student-main-content mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardShell>
  );
}
