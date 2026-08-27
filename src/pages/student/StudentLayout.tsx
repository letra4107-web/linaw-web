import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useAccessibility, type FontScale } from '../../lib/a11y/AccessibilityContext';
import { DashboardShell } from '../../components/DashboardShell';
import { IconLabel } from '../../components/a11y/IconLabel';
import { softSignOut } from '../../lib/auth/softSignOut';
import { cardStyle } from '../../lib/cardStyle';
import logo from '../../assets/Logo.jpg';
import studentBg from '../../assets/sd.webp';
import navBg from '../../assets/side.webp';
import homeIcon from '../../assets/home.png';
import profileIcon from '../../assets/profile.png';
import menuIcon from '../../assets/menu.png';
import bookIcon from '../../assets/book.png';
import trophyIcon from '../../assets/trophy.png';
import logoutIcon from '../../assets/logout.png';
import owlwave from '../../assets/owlwave.png';

const PRIMARY_TABS = [
  { to: '/student', end: true, icon: homeIcon, label: 'Simula' },
  { to: '/student/learn', icon: bookIcon, label: 'Aralin' },
  { to: '/student/achievements', icon: trophyIcon, label: 'Parangal' },
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
    `group flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2.5 text-base font-bold transition-all ${
      collapsed ? 'justify-center px-2' : ''
    } ${
      isActive
        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-card'
        : 'border-transparent text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-white/60'
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
  icon: string;
  label: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink to={to} end={end} title={label} className={navClass(collapsed)} onClick={onNavigate}>
      {({ isActive }) => (
        <>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${isActive ? 'bg-white/90 shadow-sm' : 'bg-white/65'}`}>
            <img src={icon} alt="" aria-hidden="true" className="h-6 w-6 object-contain" />
          </span>
          <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

function ProfileMenu({ collapsed, mobile = false }: { collapsed: boolean; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { identity, user } = useAuth();
  const displayName = identity?.displayName ?? 'Mag-aaral';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'M';

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
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
    <div ref={menuRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Aking profile"
        className={`flex min-h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white/55 p-2 text-left transition-all hover:border-[var(--color-primary)] hover:bg-white/80 ${collapsed ? 'justify-center' : ''}`}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-primary)] text-lg font-bold text-white shadow-sm">
          <img src={profileIcon} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-contain p-1 opacity-35" />
          <span className="relative">{initial}</span>
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{displayName}</span>
            <span className="block text-xs text-[var(--color-text-muted)]">Aking profile</span>
          </span>
        )}
        {!collapsed && <span aria-hidden="true" className={`mr-1 text-sm transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 w-72 max-w-[calc(100vw-2rem)] rounded-3xl border p-3 shadow-raised ${mobile ? 'top-full right-0 mt-2' : 'bottom-full left-0 mb-2'}`}
          style={cardStyle('--color-brand-lavender', 8, 40)}
        >
          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-white/65 p-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-xl font-bold text-white">{initial}</span>
            <div className="min-w-0">
              <p className="truncate font-bold">{displayName}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">{user?.email ?? 'Student account'}</p>
            </div>
          </div>
          <NavLink to="/student/profile" onClick={() => setOpen(false)} role="menuitem" className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-bold transition-colors hover:bg-white/70">
            <IconLabel img={profileIcon} label="Tingnan ang aking profile" />
          </NavLink>
          <div className="my-2 border-t border-white/70" />
          <button type="button" onClick={signOut} role="menuitem" className="flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-sm font-bold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-soft)]">
            <IconLabel img={logoutIcon} label="Mag-sign out" />
          </button>
        </div>
      )}
    </div>
  );
}

function NavContents({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <>
      <nav aria-label="Mga bahagi ng student dashboard" className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">
        {PRIMARY_TABS.map((tab) => (
          <NavItem key={tab.to} to={tab.to} end={tab.end} icon={tab.icon} label={tab.label} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        {!collapsed && <img src={owlwave} alt="" aria-hidden="true" className="mt-auto w-24 self-center object-contain opacity-90" />}
      </nav>
      <div className="border-t border-[var(--color-border)] p-3">
        <ProfileMenu collapsed={collapsed} />
      </div>
    </>
  );
}

export default function StudentLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useStudentAccessibilitySync();

  return (
    <DashboardShell roleLabel="Mag-aaral" hideHeader bgImage={studentBg}>
      <div className="flex min-h-screen min-w-0">
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--color-border)] transition-[width] duration-300 lg:flex ${collapsed ? 'w-[4.75rem]' : 'w-56'}`}
          style={{ backgroundImage: `url(${navBg})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}
        >
          <div className={`flex h-16 items-center gap-2 border-b border-[var(--color-border)] px-3 ${collapsed ? 'justify-center' : ''}`}>
            <button type="button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? 'Palawakin ang sidebar' : 'Paliitin ang sidebar'} className="flex min-w-0 items-center gap-2 rounded-xl p-1 transition-colors hover:bg-white/60">
              <img src={logo} alt="LinawLetra" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm" />
              {!collapsed && <span className="truncate font-bold text-[var(--color-primary)]">LinawLetra</span>}
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
              <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-controls="student-mobile-nav" className="flex h-12 min-w-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/70 transition-colors hover:border-[var(--color-primary)]">
                <IconLabel img={menuIcon} label="Menu" />
              </button>
            </div>
          </header>

          {mobileOpen && (
            <div id="student-mobile-nav" className="sticky top-16 z-30 border-b border-[var(--color-border)] shadow-card lg:hidden" style={{ backgroundImage: `url(${navBg})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}>
              <nav aria-label="Mga bahagi ng student dashboard" className="grid grid-cols-3 gap-2 p-3">
                {PRIMARY_TABS.map((tab) => (
                  <NavItem key={tab.to} to={tab.to} end={tab.end} icon={tab.icon} label={tab.label} collapsed={false} onNavigate={() => setMobileOpen(false)} />
                ))}
              </nav>
            </div>
          )}

          <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardShell>
  );
}
