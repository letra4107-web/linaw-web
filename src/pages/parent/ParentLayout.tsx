import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, ChartNoAxesColumnIncreasing, ChevronRight, Home, Mail, Menu, Users, type LucideIcon } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNotifications } from '../../lib/useNotifications';
import { useAccessibility, type ThemeMode } from '../../lib/a11y/AccessibilityContext';
import { DashboardShell } from '../../components/DashboardShell';
import logo from '../../assets/Logo.jpg';
import { AppIcon } from '../../components/a11y/AppIcon';
import { enableParentEnglish } from './parentTranslations';
import './parent-theme.css';
import './calendar-reference.css';

const PRIMARY_TABS = [
  { to: '/parent', end: true, icon: Home, label: 'Simula' },
  { to: '/parent/progress', icon: ChartNoAxesColumnIncreasing, label: 'Progreso' },
  { to: '/parent/schedule', icon: CalendarDays, label: 'Kalendaryo' },
  { to: '/parent/children', icon: Users, label: 'Mga Anak Ko' },
  { to: '/parent/messages', icon: Mail, label: 'Mga Mensahe' },
];
const englishLabels: Record<string, string> = { Simula: 'Home', Progreso: 'Progress', Kalendaryo: 'Calendar', 'Mga Anak Ko': 'My Children', 'Mga Mensahe': 'Messages' };

function NavItem({ to, end, icon: Icon, label, collapsed, onNavigate }: { to: string; end?: boolean; icon: LucideIcon; label: string; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <NavLink to={to} end={end} title={label} className={`parent-nav-item ${collapsed ? 'justify-center' : ''}`} onClick={onNavigate}>
      <span aria-hidden="true" className="parent-nav-icon"><Icon /></span>
      <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
    </NavLink>
  );
}

function ProfileMenu({ collapsed, mobile = false }: { collapsed: boolean; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
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
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => { document.removeEventListener('mousedown', onClickOutside); document.removeEventListener('keydown', onEscape); };
  }, [open]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setOpen(false);
    } catch {
      setSignOutError('Hindi makapag-sign out ngayon. Subukan muli.');
    } finally { setSigningOut(false); }
  }

  return (
    <div ref={menuRef} className="relative min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label="Aking profile"
        title="Aking profile"
        className={`relative flex min-h-12 w-full min-w-0 items-center gap-3 rounded-2xl border p-2 text-left transition-all ${mobile ? 'border-[var(--color-border)] bg-white/75 text-[var(--color-text)]' : 'border-white/20 bg-black/10 text-white hover:bg-black/20'} ${collapsed ? 'justify-center' : ''}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-primary)] font-bold text-white shadow-sm">
          {parentRow?.avatar_url ? <img src={parentRow.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{displayName}</span>
            <span className={`block text-xs ${mobile ? 'text-[var(--color-text-muted)]' : 'text-white/65'}`}>Parent</span>
          </span>
        )}
        {!collapsed && <ChevronRight size={17} aria-hidden="true" />}
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[0.65rem] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div id={menuId} role="menu" aria-label="Mga opsyon sa account" onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'));
          const current = items.indexOf(document.activeElement as HTMLElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        }} className={`parent-profile-menu absolute z-50 w-72 max-w-[calc(100vw-2rem)] rounded-3xl border p-3 shadow-raised ${mobile ? 'top-full right-0 mt-2' : 'bottom-full left-0 mb-2'}`}>
          <div className="parent-profile-menu-header mb-2 flex items-center gap-3 rounded-2xl p-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-primary)] font-bold text-white">
              {parentRow?.avatar_url ? <img src={parentRow.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
            </span>
            <div className="min-w-0"><p className="truncate font-bold">{displayName}</p><p className="truncate text-xs text-[var(--color-text-muted)]">{user?.email}</p></div>
          </div>
          <NavLink to="/parent/settings" onClick={() => setOpen(false)} role="menuitem" className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/70"><AppIcon name="☺" className="h-4 w-4" /> Aking Detalye</NavLink>
          <NavLink to="/parent/notifications" onClick={() => setOpen(false)} role="menuitem" className="flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/70"><span className="flex items-center gap-2"><span aria-hidden="true">🔔</span> Mga Abiso</span>{unreadCount > 0 && <span className="rounded-full bg-[var(--color-danger)] px-2 py-0.5 text-xs text-white">{unreadCount}</span>}</NavLink>
          <NavLink to="/parent/app-settings" onClick={() => setOpen(false)} role="menuitem" className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/70"><AppIcon name="⚙" className="h-4 w-4" /> Mga Setting</NavLink>
          <div className="my-2 border-t border-white/70" />
          <button type="button" onClick={() => void signOut()} disabled={signingOut} role="menuitem" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><span aria-hidden="true">↪</span> {signingOut ? 'Nagsa-sign out...' : 'Mag-sign out'}</button>
          {signOutError && <p role="alert" className="px-3 text-xs text-[var(--color-danger)]">{signOutError}</p>}
        </div>
      )}
    </div>
  );
}

function NavContents({ collapsed, english }: { collapsed: boolean; english: boolean }) {
  return (
    <>
      <nav aria-label="Mga bahagi ng parent dashboard" className="parent-sidebar-nav">
        {PRIMARY_TABS.map((tab) => <NavItem key={tab.to} {...tab} label={english ? englishLabels[tab.label] ?? tab.label : tab.label} collapsed={collapsed} />)}
      </nav>
      <div className="parent-sidebar-profile"><ProfileMenu collapsed={collapsed} /></div>
    </>
  );
}

export default function ParentLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { setTheme } = useAccessibility();
  const { data: parentPreferences } = useQuery({ queryKey: ['parent-layout-language', user?.id], queryFn: async () => { const { data, error } = await supabase.from('parents_settings').select('preferred_language, preferred_theme').eq('auth_uid', user!.id).maybeSingle(); if (error) throw error; return data as { preferred_language?: string; preferred_theme?: ThemeMode } | null; }, enabled: Boolean(user) });
  const english = parentPreferences?.preferred_language === 'en';

  useEffect(() => { document.documentElement.lang = english ? 'en' : 'fil'; document.documentElement.dataset.parentLanguage = english ? 'en' : 'fil'; }, [english]);
  useEffect(() => {
    const preferredTheme = parentPreferences?.preferred_theme;
    if (preferredTheme === 'default' || preferredTheme === 'dark' || preferredTheme === 'high-contrast') setTheme(preferredTheme);
  }, [parentPreferences?.preferred_theme, setTheme]);
  useEffect(() => {
    if (!portalRef.current) return;
    return enableParentEnglish(portalRef.current, english);
  }, [english]);

  return (
    <DashboardShell roleLabel="Magulang" hideHeader roleTheme="parent">
      <div ref={portalRef} className="parent-shell">
        <aside className={`dashboard-sidebar parent-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
          <div className={`parent-sidebar-brand ${collapsed ? 'justify-center' : ''}`}>
            <button type="button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? 'Palawakin ang sidebar' : 'Paliitin ang sidebar'} className="flex min-w-0 items-center gap-2 rounded-xl p-1 text-white transition-colors hover:bg-white/10">
              <img src={logo} alt="LinawLetra" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm" />
              {!collapsed && <span><strong>LinawLetra</strong><small>PARENT PORTAL</small></span>}
            </button>
          </div>
          <NavContents collapsed={collapsed} english={english} />
        </aside>

        <div className="parent-shell-body">
          <header className="parent-mobile-header">
            <div className="flex min-w-0 items-center gap-2"><img src={logo} alt="LinawLetra" className="h-10 w-10 shrink-0 rounded-xl object-cover" /><span className="truncate font-bold text-[var(--color-primary)]">LinawLetra</span></div>
            <div className="flex items-center gap-2">
              <ProfileMenu collapsed mobile />
              <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-controls="parent-mobile-nav" className="flex h-12 min-w-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/75"><Menu size={22} /><span className="sr-only">Menu</span></button>
            </div>
          </header>
          {mobileOpen && (
            <div id="parent-mobile-nav" className="parent-mobile-nav lg:hidden">
              <nav aria-label="Mga bahagi ng parent dashboard" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRIMARY_TABS.map((tab) => <NavItem key={tab.to} {...tab} label={english ? englishLabels[tab.label] ?? tab.label : tab.label} collapsed={false} onNavigate={() => setMobileOpen(false)} />)}
              </nav>
            </div>
          )}
          <main className="parent-content"><Outlet key={english ? 'en' : 'fil'} /></main>
        </div>
      </div>
    </DashboardShell>
  );
}
