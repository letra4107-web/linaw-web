import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useAccessibility, type FontScale } from '../../lib/a11y/AccessibilityContext';
import { DashboardShell } from '../../components/DashboardShell';
import { IconLabel } from '../../components/a11y/IconLabel';
import { softSignOut } from '../../lib/auth/softSignOut';
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
import { cardStyle } from '../../lib/cardStyle';

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

// The student no longer edits accessibility themselves -- their parent sets
// it from the Parent dashboard (see parent/MyChildren.tsx), and this applies
// it live here via realtime, mirroring student_settings instead of the
// device-local localStorage the accessibility context otherwise uses.
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
      setReadingGuide(!!row.reading_guide);
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
    `flex items-center gap-3 rounded-lg border px-4 py-3 text-base transition-colors ${
      collapsed ? 'justify-center px-0' : ''
    } ${
      isActive
        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
        : 'border-transparent hover:border-[var(--color-primary)]'
    }`;
}

function NavItem({ to, end, icon, label, collapsed }: { to: string; end?: boolean; icon: string; label: string; collapsed: boolean }) {
  return (
    <NavLink to={to} end={end} title={label} className={navClass(collapsed)}>
      {({ isActive }) => (
        <>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isActive ? 'bg-white/90 shadow-sm' : ''}`}
          >
            <img src={icon} alt="" aria-hidden="true" className="h-6 w-6 object-contain" />
          </span>
          <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
        </>
      )}
    </NavLink>
  );
}

function ProfileMenu({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { identity, user } = useAuth();

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
        className={`relative flex w-full items-center gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3 text-base transition-colors hover:border-[var(--color-primary)] ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        <img src={profileIcon} alt="" aria-hidden="true" className="h-6 w-6 shrink-0 object-contain" />
        <span className={collapsed ? 'sr-only' : 'truncate'}>{identity?.displayName ?? 'Aking menu'}</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[90vw] rounded-xl border p-3 shadow-lg"
          style={cardStyle('--color-brand-lavender')}
        >
          <NavLink
            to="/student/profile"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-white/60"
          >
            <IconLabel img={profileIcon} label="Aking Detalye" />
          </NavLink>

          <div className="my-3 border-t border-white/60" />

          <button
            type="button"
            onClick={() => {
              if (user) {
                softSignOut({
                  userId: user.id,
                  role: 'student',
                  displayName: identity?.displayName ?? 'Mag-aaral',
                  email: user.email ?? '',
                });
              } else {
                supabase.auth.signOut();
              }
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
          >
            <IconLabel img={logoutIcon} label="Mag-sign out" />
          </button>
          <p className="mt-2 px-2 text-xs text-[var(--color-text-muted)]">
            Maaalala ka namin sa susunod na pag-login — tap lang ang iyong larawan.
          </p>
        </div>
      )}
    </div>
  );
}

function NavContents({ collapsed }: { collapsed: boolean }) {
  return (
    <>
      <nav aria-label="Student sections" className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-4">
        {PRIMARY_TABS.map((tab) => (
          <NavItem key={tab.to} to={tab.to} end={tab.end} icon={tab.icon} label={tab.label} collapsed={collapsed} />
        ))}
        {!collapsed && (
          <img
            src={owlwave}
            alt=""
            aria-hidden="true"
            className="mt-auto w-28 self-center object-contain opacity-90"
          />
        )}
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
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--color-border)] transition-[width] lg:flex ${
            collapsed ? 'w-20' : 'w-64'
          }`}
          style={{ backgroundImage: `url(${navBg})`, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' }}
        >
          <div className={`flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-4 ${collapsed ? 'justify-center' : ''}`}>
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
                  className="ml-auto flex shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] p-2 hover:border-[var(--color-primary)]"
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
              <IconLabel img={menuIcon} label="Menu" />
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
