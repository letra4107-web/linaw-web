import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, LogOut, Settings, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { softSignOut } from '../../lib/auth/softSignOut';
import { useNotifications } from '../../lib/useNotifications';
import { cardStyle } from '../../lib/cardStyle';
import { DashboardShell } from '../../components/DashboardShell';
import logo from '../../assets/Logo.jpg';
import sidebarPlants from '../../assets/teacher/Purple Sidebar Bottom Plants.png';
import { AppIcon } from '../../components/a11y/AppIcon';
import { TeacherHomeArt } from './TeacherHomeArt';
import { MessageAvatar } from '../../components/messages/MessageAvatar';
import './home-reference.css';
import './teacher-profile-menu.css';
import { useTeacherThemeSync } from '../../lib/teacher/useTeacherPreferences';

const PRIMARY_TABS = [
  { to: '/teacher', end: true, icon: '⌂', label: 'Simula' },
  { to: '/teacher/students', icon: '♟', label: 'Mga Mag-aaral' },
  { to: '/teacher/lessons', icon: '▤', label: 'Mga Aralin' },
  { to: '/teacher/progress-reports', icon: '▥', label: 'Pagsusuri' },
  { to: '/teacher/messages', icon: '✉', label: 'Mga Mensahe' },
];

function navClass(collapsed: boolean) {
  return ({ isActive }: { isActive: boolean }) => `group flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-bold transition-all ${collapsed ? 'justify-center px-2' : ''} ${isActive ? 'border-white/25 bg-white text-[var(--color-brand-sage)] shadow-card' : 'border-transparent text-white/90 hover:border-white/15 hover:bg-white/15'}`;
}
function NavItem({ to, end, icon, label, collapsed, onNavigate }: { to: string; end?: boolean; icon: string; label: string; collapsed: boolean; onNavigate?: () => void }) {
  return <NavLink to={to} end={end} title={label} className={navClass(collapsed)} onClick={onNavigate}><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 transition-transform group-hover:scale-105"><AppIcon name={icon} className="h-5 w-5" /></span><span className={collapsed ? 'sr-only' : undefined}>{label}</span></NavLink>;
}

function ProfileMenu({ collapsed, mobile = false }: { collapsed: boolean; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState({ left: 12, top: 12, maxHeight: 400 });
  const { pathname } = useLocation();
  const { identity, user } = useAuth();
  const profile = useQuery({ queryKey: ['teacher-profile-settings', user?.id], queryFn: async () => {
    const { data, error } = await supabase.from('teacher_profiles').select('grade_levels, avatar_url').eq('user_id', user!.id).maybeSingle();
    if (error) throw error;
    return data as { grade_levels: number[]; avatar_url: string | null } | null;
  }, enabled: Boolean(user), staleTime: 30_000 });
  const { unreadCount } = useNotifications();
  const name = identity?.displayName ?? 'Guro';
  const avatarUrl = profile.data?.avatar_url ?? identity?.avatarUrl;
  const portalHost = typeof document === 'undefined' ? null : document.querySelector('.role-teacher') ?? document.body;

  useEffect(() => { setOpen(false); }, [pathname]);
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const trigger = triggerRef.current, popup = popupRef.current;
      if (!trigger || !popup) return;
      if (!trigger.getClientRects().length) { setOpen(false); return; }
      const viewport = window.visualViewport;
      const viewLeft = viewport?.offsetLeft ?? 0, viewTop = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      const anchor = trigger.getBoundingClientRect(), box = popup.getBoundingClientRect();
      const margin = 12, gap = 8;
      const above = Math.max(0, anchor.top - viewTop - margin - gap);
      const below = Math.max(0, viewTop + height - anchor.bottom - margin - gap);
      const useBelow = mobile ? below >= Math.min(180, above) : above < Math.min(180, below);
      const maxHeight = Math.max(1, Math.floor(Math.min(height - margin * 2, useBelow ? below : above)));
      const popupHeight = Math.min(popup.scrollHeight + popup.offsetHeight - popup.clientHeight, maxHeight);
      const left = Math.round(Math.max(viewLeft + margin, Math.min(mobile ? anchor.right - box.width : anchor.left, viewLeft + width - box.width - margin)));
      const top = Math.round(Math.max(viewTop + margin, Math.min(useBelow ? anchor.bottom + gap : anchor.top - popupHeight - gap, viewTop + height - popupHeight - margin)));
      setPlacement(previous => previous.left === left && previous.top === top && previous.maxHeight === maxHeight ? previous : { left, top, maxHeight });
    };
    position();
    const observer = new ResizeObserver(position);
    if (popupRef.current) observer.observe(popupRef.current);
    if (triggerRef.current) observer.observe(triggerRef.current);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [open, mobile]);
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true); setSignOutError('');
    try {
      if (user) await softSignOut({ userId: user.id, role: 'teacher', displayName: name, email: user.email ?? '', avatarUrl });
      else { const { error } = await supabase.auth.signOut(); if (error) throw error; }
      setOpen(false);
    } catch { setSignOutError('Hindi makapag-sign out ngayon. Subukan muli.'); }
    finally { setSigningOut(false); }
  }
  useEffect(() => {
    if (!open) return;
    popupRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node) && !popupRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return (
    <div ref={menuRef} className="relative min-w-0">
      <button ref={triggerRef} type="button" onClick={() => setOpen((value) => !value)} aria-label="Aking profile" aria-expanded={open} aria-haspopup="menu" aria-controls={open ? menuId : undefined} className={`teacher-profile-trigger relative flex min-h-12 w-full min-w-0 items-center gap-3 rounded-2xl border p-2 text-left transition-colors ${mobile ? 'border-[var(--color-border)] bg-white/75' : 'border-white/20 bg-white/10 text-white hover:bg-white/15'} ${collapsed ? 'justify-center' : ''}`}>
        <MessageAvatar url={avatarUrl} name={name} className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-brand-sage)] font-bold text-white shadow-sm" />
        {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{name}</span><span className={`block text-xs ${mobile ? 'text-[var(--color-text-muted)]' : 'text-white/65'}`}>Account ng guro</span></span>}
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-rose-700 px-1.5 text-xs font-bold text-white" aria-label={`${unreadCount} hindi pa nababasang abiso`}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && portalHost && createPortal(<div ref={popupRef} id={menuId} role="menu" aria-label="Mga opsyon sa account" onKeyDown={(event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'));
        const current = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }} className="teacher-profile-menu fixed z-[100] rounded-3xl border p-3 shadow-raised" style={{ ...cardStyle('--color-brand-sage', 8, 35), ...placement, width: 'min(18rem, calc(100vw - 1.5rem))' }}>
        <div className="teacher-profile-summary mb-2 flex items-center gap-3 rounded-2xl bg-white/70 p-3"><MessageAvatar url={avatarUrl} name={name} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-brand-sage)] font-bold text-white" /><div className="min-w-0 flex-1"><p className="teacher-profile-name font-bold">{name}</p><p className="teacher-profile-email text-xs text-[var(--color-text-muted)]">{user?.email}</p></div></div>
        <NavLink to="/teacher/profile" onClick={() => setOpen(false)} role="menuitem" className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/70"><UserRound size={18} aria-hidden="true" /> Aking Detalye</NavLink>
        <NavLink to="/teacher/settings" onClick={() => setOpen(false)} role="menuitem" className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/70"><Settings size={18} aria-hidden="true" /> Mga Setting</NavLink>
        <NavLink to="/teacher/notifications" onClick={() => setOpen(false)} role="menuitem" className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-white/70"><span className="flex items-center gap-2"><Bell size={18} aria-hidden="true" /> Mga Abiso</span>{unreadCount > 0 && <span className="rounded-full bg-rose-700 px-2 text-xs text-white">{unreadCount}</span>}</NavLink>
        <div className="my-2 border-t border-white/70" />
        <button type="button" onClick={() => void signOut()} disabled={signingOut} role="menuitem" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><LogOut size={18} aria-hidden="true" /> {signingOut ? 'Nagsa-sign out...' : 'Mag-sign out'}</button>
        {signOutError && <p role="alert">{signOutError}</p>}
      </div>, portalHost)}
    </div>
  );
}

function NavContents({ collapsed }: { collapsed: boolean }) { return <><nav aria-label="Mga bahagi ng teacher dashboard" className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">{PRIMARY_TABS.map((tab) => <NavItem key={tab.to} {...tab} collapsed={collapsed} />)}</nav>{!collapsed && <div className="th-sidebar-scene" aria-hidden="true"><blockquote>“Bawat bata ay may kwento, at ikaw ang gumagawa nito ng mas maliwanag.”<span>♥</span></blockquote><TeacherHomeArt item={7} /></div>}<div className="border-t border-white/20 p-3"><ProfileMenu collapsed={collapsed} /></div></>; }

export default function TeacherLayout() {
  useTeacherThemeSync();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname.replace(/\/$/, '') === '/teacher';

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);
  return (
    <DashboardShell roleLabel="Guro" hideHeader roleTheme="teacher">
      <div className="flex min-h-screen min-w-0">
        <aside className={`dashboard-sidebar teacher-sidebar-art ${collapsed ? 'is-collapsed' : ''} !fixed !inset-y-0 !left-0 z-50 hidden !h-[100dvh] shrink-0 flex-col border-r border-white/15 bg-[var(--color-primary-hover)] transition-[width] duration-300 lg:flex ${collapsed ? 'w-[4.75rem]' : 'w-60'}`}><img src={sidebarPlants} alt="" aria-hidden="true" />
          <div className={`flex h-16 items-center gap-2 border-b border-white/20 px-3 ${collapsed ? 'justify-center' : ''}`}><button type="button" onClick={() => setCollapsed((value) => !value)} className="flex min-w-0 items-center gap-2 rounded-xl p-1 text-white hover:bg-white/10"><img src={logo} alt="LinawLetra" className="h-10 w-10 shrink-0 rounded-xl object-cover" />{!collapsed && <span className="min-w-0 text-left"><span className="block truncate text-sm font-bold">LinawLetra</span><span className="block truncate text-xs text-white/65">Tanggapan ng Guro</span></span>}</button></div>
          <NavContents collapsed={collapsed} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 shadow-sm backdrop-blur lg:hidden"><div className="flex items-center gap-2"><img src={logo} alt="LinawLetra" className="h-10 w-10 rounded-xl object-cover" /><span className="font-bold text-[var(--color-brand-sage)]">Tanggapan ng Guro</span></div><div className="flex items-center gap-2"><ProfileMenu collapsed mobile /><button type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} className="flex h-12 min-w-12 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/75"><AppIcon name="☰" /><span className="sr-only">Menu</span></button></div></header>
          {mobileOpen && <div className="sticky top-16 z-30 border-b border-white/15 bg-[var(--color-primary-hover)] p-3 shadow-card lg:hidden"><nav className="grid grid-cols-2 gap-2 sm:grid-cols-3">{PRIMARY_TABS.map((tab) => <NavItem key={tab.to} {...tab} collapsed={false} onNavigate={() => setMobileOpen(false)} />)}</nav></div>}
          <main className={`teacher-workspace ${collapsed ? 'th-workspace-collapsed' : ''} w-full min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:pr-6 lg:py-6 ${collapsed ? 'lg:pl-[6.25rem]' : 'lg:pl-[16.5rem]'} ${isHome ? `teacher-home-workspace ${collapsed ? 'is-collapsed' : ''}` : ''}`}><Outlet /></main>
        </div>
      </div>
    </DashboardShell>
  );
}
