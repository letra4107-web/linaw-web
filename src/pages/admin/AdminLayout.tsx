import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { signOutWithAudit } from '../../lib/auth/authEvents';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNotifications } from '../../lib/useNotifications';
import { cardStyle } from '../../lib/cardStyle';
import { DashboardShell } from '../../components/DashboardShell';
import logo from '../../assets/Logo.jpg';
import { AppIcon } from '../../components/a11y/AppIcon';

const PRIMARY_TABS = [
  { to: '/admin', end: true, icon: '⌂', label: 'Home' },
  { to: '/admin/students', icon: '🧒', label: 'Students' },
  { to: '/admin/parents', icon: '👪', label: 'Parents' },
  { to: '/admin/teachers-monitoring', icon: '🎓', label: 'Teachers' },
  { to: '/admin', end: true, icon: '⌂', label: 'Home' },
  { to: '/admin/users', icon: '👥', label: 'Users' },
  { to: '/admin/teachers', icon: '🎓', label: 'Teachers' },
  { to: '/admin/analytics', icon: '▥', label: 'Analytics' },
  { to: '/admin/audit-logs', icon: '📋', label: 'Audit Trail' },
  { to: '/admin/archived', icon: '▣', label: 'Archive' },
  { to: '/admin/notifications', icon: '🔔', label: 'Notifications' },
  { to: '/admin/settings', icon: '⚙', label: 'Settings' },
  { to: '/admin/profile', icon: '♙', label: 'Profile' },
];

const ADDITIONAL_ADMIN_ENGLISH_REPLACEMENTS: Array<[string, string]> = [
  ['Mga na-archive na account na maaari pang ibalik.', 'Archived accounts that can still be restored.'],
  ['Naglo-load ng arkibo...', 'Loading archive...'],
  ['Na-archive', 'Archived'], ['I-restore ang account', 'Restore account'], ['Dahilan', 'Reason'], ['Walang inilagay', 'Not provided'],
  ['Malinis ang iyong archive sa ngayon.', 'Your archive is currently empty.'], ['Admin profile', 'Admin profile'],
  ['Ito ang pangalang makikita sa iyong admin account.', 'This is the name shown on your admin account.'],
  ['Kasalukuyang email:', 'Current email:'], ['Magpapadala kami ng kumpirmasyon link bago ito magbago.', 'We will send a confirmation link before it is changed.'],
  ['Gumamit ng matibay at natatanging password para sa admin access.', 'Use a strong, unique password for admin access.'],
  ['Kailangan ng password:', 'Password requirements:'], ['May malaking letra (A-Z)', 'Uppercase letter (A-Z)'], ['May numero (0-9)', 'Number (0-9)'],
  ['Gumawa ng teacher account at italaga ang sakop na baitang.', 'Create teacher accounts and assign their grade levels.'],
  ['Mga guro', 'Teachers'], ['Hal.', 'e.g.'], ['guro@paaralan.edu.ph', 'teacher@school.edu'],
  ['Read-only na tanaw sa aktibong gawain, learning support, at records ng sistema.', 'Read-only view of active work, learning support, and system records.'],
  ['Profile, progreso, at mga aktibidad sa Student modules.', 'Profiles, progress, and activity in student modules.'],
  ['Mga parent account at aktibidad sa Parent modules.', 'Parent accounts and activity in parent modules.'],
  ['Mga teacher account at aktibidad sa Teacher modules.', 'Teacher accounts and activity in teacher modules.'],
  ['Read-only ito at hindi nagpapakita ng password o authentication data.', 'This is read-only and does not display passwords or authentication data.'],
  ['Huling login:', 'Last login:'], ['Mga anak:', 'Children:'], ['Kamakailang aktibidad', 'Recent activity'],
  ['Pagsasanay', 'Practice sessions'], ['Kabuuang XP', 'Total XP'], ['Mga Parangal', 'Badges earned'], ['Mga gumagamit', 'Users'],
  ['Pindutin para sa detalye', 'Click for details'], ['Pagpapalista bawat buwan', 'Monthly enrollment'], ['Paggamit ng pagsasanay', 'Practice usage'],
  ['Pangalan o email...', 'Name or email...'], ['Salain ayon sa role', 'Filter by role'], ['Salain ayon sa status', 'Filter by status'],
  ['Ginawa', 'Created'], ['Subukang baguhin ang search o filters.', 'Try changing the search or filters.'],
  ['Page ', 'Page '], [' ng ', ' of ']
];

const REMAINING_ADMIN_ENGLISH_REPLACEMENTS: Array<[string, string]> = [
  ['Iba pang update', 'Other updates'], ['Pahina', 'Page'], ['Wala pa', 'None yet'],
  ['Hindi na-disable ang account. Suriin ang pahintulot o subukan muli.', 'Unable to disable the account. Check your permissions or try again.'],
  ['Hindi na-restore ang account. Subukan muli.', 'Unable to restore the account. Try again.'],
  ['Hindi na-archive ang account. Subukan muli.', 'Unable to archive the account. Try again.'],
  ['Dahilan (opsyonal)', 'Reason (optional)'], ['Ilagay ang dahilan...', 'Enter a reason...'],
  ['Hanapin, salain, at pamahalaan ang tunay na LinawLetra accounts.', 'Search, filter, and manage LinawLetra accounts.'],
  ['Resulta', 'Results'], ['Maghanap ng user', 'Search users'], ['Lahat ng role', 'All roles'], ['Lahat ng status', 'All statuses'],
  ['Nagpadala kami ng kumpirmasyon sa parehong luma at bagong email — buksan ang link para tapusin ang pagbabago.', 'We sent a confirmation to both email addresses. Open the link to complete the change.'],
  ['Wala pang abiso.', 'No notifications yet.'], ['ngayon lang', 'just now'], ['ang nakaraan', 'ago']
];

const ADMIN_ENGLISH_REPLACEMENTS: Array<[string, string]> = [
  ['Mga Mag-aaral', 'Students'], ['Mga Magulang', 'Parents'], ['Mga Guro', 'Teachers'], ['Mga Abiso', 'Notifications'], ['Mga Operasyon', 'Operations'], ['Pagsusuri', 'Analytics'], ['Pamamahala ng Users', 'User Management'], ['Arkibo', 'Archive'], ['Kasalukuyang mga guro', 'Current teachers'], ['Bagong teacher account', 'New teacher account'], ['Wala pang guro', 'No teachers yet'], ['Walang pangalan', 'No name'], ['Walang pamagat', 'Untitled'], ['Walang mensahe', 'No message'], ['Walang petsa', 'No date'], ['Walang available', 'Not available'], ['Walang tumugmang record.', 'No matching records.'], ['Walang tumugmang account.', 'No matching accounts.'], ['Walang tumugmang user', 'No matching users'], ['Walang na-archive na account.', 'No archived accounts.'], ['Walang archived account', 'No archived accounts'], ['Walang abiso sa view na ito', 'No notifications in this view'], ['Wala pang datos.', 'No data yet.'], ['Wala pang naka-link na profile.', 'No linked profile yet.'], ['Wala pang recorded activity.', 'No recorded activity yet.'], ['Hindi pa nabasa', 'Unread'], ['Hindi pa', 'Not yet'], ['Hindi ma-load ang', 'Unable to load'], ['Naglo-load ng', 'Loading'], ['Sine-save...', 'Saving...'], ['Ina-update...', 'Updating...'], ['Ipinapadala...', 'Sending...'], ['Ginagawa ang account...', 'Creating account...'], ['Na-save ang pangalan.', 'Name saved.'], ['Na-update ang password.', 'Password updated.'], ['Maglagay ng valid na email address.', 'Enter a valid email address.'], ['Kailangang 8+ characters, may malaking letra at numero.', 'Use at least 8 characters, including an uppercase letter and number.'], ['Hindi magkatugma ang dalawang password.', 'The passwords do not match.'], ['Pangalan', 'Name'], ['Huling login', 'Last login'], ['Aksyon', 'Action'], ['Oras', 'Time'], ['Detalye', 'Details'], ['Dahilan', 'Reason'], ['Kumpirmahin', 'Confirm'], ['Isara', 'Close'], ['Nakaraan', 'Previous'], ['Susunod', 'Next'], ['I-reset', 'Reset'], ['I-save', 'Save'], ['I-update ang Email', 'Update email'], ['I-update ang Password', 'Update password'], ['I-restore', 'Restore'], ['I-disable', 'Disable'], ['I-archive', 'Archive'], ['Maghanap', 'Search'], ['Hanapin', 'Search'], ['Salain', 'Filter'], ['Lahat ng', 'All'], ['Ngayon', 'Today'], ['Mas nauna', 'Earlier'], ['BAGO', 'NEW'], ['Matagumpay', 'Successful'], ['Nabigo', 'Failed'], ['Mag-sign out', 'Sign out'], ['Magkatugma ang password', 'Passwords match'], ['Bagong Email', 'New email'], ['Bagong Password', 'New password'], ['Kumpirmahin ang Bagong Password', 'Confirm new password'], ['Palitan ang Email', 'Change email'], ['Palitan ang Password', 'Change password'], ['Profile Ko', 'My profile'], ['Aking Profile', 'My Profile'], ['Mga anak:', 'Children:'], ['Kamakailang aktibidad', 'Recent activity'], ['Pumili ng account upang makita ang profile at aktibidad.', 'Select an account to view its profile and activity.'], ['Ipinapakita', 'Showing'], ['ng ', 'of '], ['araw na streak', 'day streak'], ['gawain', 'activities'], ['Guro:', 'Teacher:'], ['Itinakda ni', 'Assigned by'], ['naka-on', 'on'], ['naka-off', 'off'], ['Nabasa', 'Read'], ['Naka-assign', 'Assigned'], ['Naka-roster', 'On roster'], ['Hindi tukoy na mag-aaral', 'Unknown student'], ['Hindi tukoy na user', 'Unknown user'], ['Maghanap sa listahan...', 'Search the list...'], ['Subukang baguhin ang search o pumili ng ibang kategorya.', 'Try changing the search or selecting another category.'], ['Piliin ang lahat ng hahawakang grade level.', 'Select all grade levels they will teach.'], ['Pumili ng kahit isang grade level.', 'Select at least one grade level.'], ['Lahat ng field ay kinakailangan.', 'All fields are required.'], ['Buong pangalan', 'Full name'], ['Mga baitang', 'Grade levels'], ['Gumawa ng Account', 'Create account'], ['Gamitin ang form para gumawa ng unang account.', 'Use the form to create the first account.'], ['Nagawa ang account para kay', 'Account created for'], ['Naipadala na ang pansamantalang password sa email ng guro.', 'A temporary password has been sent to the teacher’s email.'], ['Mga aktibidad', 'Activities'], ['Monitoring at seguridad', 'Monitoring and security'], ['Append-only record ng transaksyon, login session, platform, at device kapag available.', 'Append-only record of transactions, login sessions, platforms, and devices when available.'], ['Pangalan o aksyon...', 'Name or action...'], ['Lahat ng user', 'All users'], ['Device/browser', 'Device/browser'], ['Hindi available', 'Not available'], ['Mga totoong system at account update para sa iyong admin account.', 'System and account updates for your admin account.'], ['Salain ang abiso', 'Filter notifications'], ['Markahan lahat na nabasa', 'Mark all as read'], ['Lalabas rito ang mga update kapag mayroon na.', 'Updates will appear here when available.']
];

function translateAdminInterface(root: HTMLElement) {
  const translate = (value: string) => [...ADMIN_ENGLISH_REPLACEMENTS, ...ADDITIONAL_ADMIN_ENGLISH_REPLACEMENTS, ...REMAINING_ADMIN_ENGLISH_REPLACEMENTS].filter(([from]) => from !== 'ng ').sort(([left], [right]) => right.length - left.length).reduce((text, [from, to]) => text.replaceAll(from, to), value);
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const translated = translate(node.textContent ?? '');
      if (translated !== node.textContent) node.textContent = translated;
    }
    if (node instanceof HTMLElement) ['aria-label', 'placeholder', 'title'].forEach((attribute) => {
      const value = node.getAttribute(attribute);
      if (value) {
        const translated = translate(value);
        if (translated !== value) node.setAttribute(attribute, translated);
      }
    });
    node.childNodes.forEach(walk);
  };
  walk(root);
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? `${parts[0][0]}${parts[1]?.[0] ?? ''}`.toUpperCase() : 'A';
}

function NavContents({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { unreadCount } = useNotifications();
  return (
    <nav aria-label="Admin sections" className="flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-3">
      {!collapsed && <p className="px-3 pt-1 pb-1 text-[0.65rem] font-extrabold tracking-[0.14em] text-white/50 uppercase">Main menu</p>}
      {PRIMARY_TABS.filter((tab, index) => tab.to !== '/admin' || index === 0).map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} onClick={onNavigate} title={collapsed ? (tab.to === '/admin/teachers' ? 'Create teacher' : tab.label) : undefined} className={({ isActive }) => `group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-all ${collapsed ? 'justify-center px-0' : ''} ${isActive ? 'bg-white text-[var(--color-brand-navy)] shadow-card ring-1 ring-white/60' : 'text-white/85 hover:bg-white/15 hover:text-white'}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 transition-colors group-hover:bg-white/20" aria-hidden="true"><AppIcon name={tab.icon} className="h-5 w-5" /></span>
          <span className={collapsed ? 'sr-only' : 'truncate'}>{tab.to === '/admin/teachers' ? 'Create teacher' : tab.label}</span>
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
        <NavLink to="/admin/profile" onClick={() => setOpen(false)} className="mt-2 flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold hover:bg-white/70"><AppIcon name="⚙" className="h-4 w-4" /> Account settings</NavLink>
        <button type="button" onClick={() => void signOutWithAudit()} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-bold text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><span aria-hidden="true">↪</span> Sign out</button>
      </div>}
    </div>
  );
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const observer = new MutationObserver(() => translateAdminInterface(root));
    translateAdminInterface(root);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [location.pathname]);
  const current = PRIMARY_TABS.find((tab) => tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to));
  return (
    <DashboardShell roleLabel="Admin" hideHeader roleTheme="admin">
      <div className="flex min-h-screen min-w-0">
        <aside className={`dashboard-sidebar sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/15 bg-[var(--color-primary-hover)] transition-[width] duration-200 lg:flex ${collapsed ? 'w-[4.75rem]' : 'w-60'}`}>
          <div className={`relative flex h-16 items-center gap-2 border-b border-white/15 px-3 ${collapsed ? 'justify-center' : ''}`}><img src={logo} alt="LinawLetra" className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />{!collapsed && <div className="min-w-0"><p className="truncate text-sm font-extrabold text-white">LinawLetra</p><p className="truncate text-[0.68rem] font-semibold tracking-wide text-white/60 uppercase">Admin Console</p></div>}<button type="button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className={`${collapsed ? 'absolute top-[4.4rem] right-[-.75rem]' : 'ml-auto'} flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-[var(--color-brand-navy)] text-xs text-white shadow-sm`}><span aria-hidden="true">{collapsed ? '›' : '‹'}</span></button></div>
          <NavContents collapsed={collapsed} />
          <div className="border-t border-white/15 p-2.5"><ProfileMenu collapsed={collapsed} /></div>
        </aside>
        <div ref={contentRef} className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 backdrop-blur lg:hidden"><div className="flex min-w-0 items-center gap-3"><img src={logo} alt="LinawLetra" className="h-9 w-9 rounded-xl object-cover" /><div className="min-w-0"><p className="truncate text-sm font-extrabold">{current?.label ?? 'Admin'}</p><p className="text-[0.65rem] font-bold tracking-wide text-[var(--color-text-muted)] uppercase">Admin Console</p></div></div><button type="button" onClick={() => setMobileOpen((value) => !value)} aria-expanded={mobileOpen} aria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white/65"><AppIcon name={mobileOpen ? '×' : '☰'} /><span className="sr-only">Menu</span></button></header>
          {mobileOpen && <div className="sticky top-16 z-20 flex max-h-[calc(100vh-4rem)] flex-col border-b border-white/15 bg-[var(--color-primary-hover)] lg:hidden"><NavContents collapsed={false} onNavigate={() => setMobileOpen(false)} /><div className="border-t border-white/15 p-2.5"><ProfileMenu collapsed={false} /></div></div>}
          <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 xl:px-8"><Outlet /></main>
        </div>
      </div>
    </DashboardShell>
  );
}
