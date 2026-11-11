import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, UsersRound, X } from 'lucide-react';
import scene from '../../assets/admin_design/linawletra-school-banner.png';
import mascot from '../../assets/admin_design/admin-graduate-owl.png';

export { mascot as adminOwl };
export function AdminHero({ title, description, icon, eyebrow, home = false, children }: { title: string; description: string; icon?: ReactNode; eyebrow?: string; home?: boolean; children?: ReactNode }) {
  return <header className={`admin-reference-hero ${home ? 'is-home' : ''}`}>
    <img className="admin-reference-hero__scene" src={scene} alt="" />
    <div className="admin-reference-hero__blue" />
    <img className="admin-reference-hero__owl" src={mascot} alt="" />
    <div className="admin-reference-hero__copy">{eyebrow && <p>{eyebrow}</p>}{home && <p className="admin-greeting">Good morning,</p>}<h1>{icon}{title}{home && <span className="admin-wave" aria-hidden="true">✋</span>}</h1><span>{description}</span>{children}</div>
    <svg className="admin-hero-wave" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true"><path fill="#ffbf00" d="M0 8C140 130 280-50 440 35S700 65 840 38S1060 66 1200 4V70H0Z"/><path fill="#ffde22" d="M0 27C140 136 280-26 440 49S700 72 840 49S1060 77 1200 20V70H0Z"/><path fill="#00a883" d="M190 70C310 15 370 49 460 70ZM920 70C1020 12 1110 62 1200 49V70Z"/></svg>
  </header>;
}
export type Stat = { value: ReactNode; label: string; detail?: string; icon?: ReactNode; color?: string };
export function AdminStats({ items, tall = false }: { items: Stat[]; tall?: boolean }) {
  return <section aria-label="Key statistics" className={`admin-reference-stats ${tall ? 'is-tall' : ''}`} style={{ '--stat-columns': items.length } as CSSProperties}>{items.map((item, index) => <article key={item.label} className={`admin-reference-stat tone-${item.color || ['blue', 'gold', 'rose', 'mint', 'violet'][index % 5]}`}><span className="admin-reference-stat__icon">{item.icon || <UsersRound />}</span><div><b>{item.value}</b><h2>{item.label}</h2>{item.detail && <p>{item.detail}</p>}</div><span className="admin-reference-stat__watermark" aria-hidden="true">{item.icon || <UsersRound />}</span></article>)}</section>;
}
export function PanelHeading({ icon = <BookOpen />, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return <header className="admin-panel-heading"><span>{icon}</span><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>;
}
export function ProgressRing({ value, label = 'Overall Progress' }: { value: number; label?: string }) {
  return <div className="admin-progress-ring" style={{ '--progress': `${Math.min(100, Math.max(0, value)) * 3.6}deg` } as CSSProperties}><div><b>{value}%</b><span>{label}</span></div></div>;
}
export function ProgressBar({ value }: { value: number }) { return <span className="admin-progress-bar"><i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></span>; }
export function Pagination({ page, pages, onChange, label }: { page: number; pages: number; onChange: (page: number) => void; label?: string }) {
  return <footer className="admin-pagination">{label && <span>{label}</span>}<nav aria-label="Pagination"><button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}><ArrowLeft />Previous</button><label className="admin-page-jump"><span className="sr-only">Go to page</span><select aria-label="Go to page" value={page} onChange={event => onChange(Number(event.target.value))}>{Array.from({ length: pages }, (_, index) => <option key={index + 1} value={index + 1}>Page {index + 1} / {pages}</option>)}</select></label><button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next<ArrowRight /></button></nav></footer>;
}
export function EmptyState({ children }: { children: ReactNode }) { return <div className="admin-empty"><BookOpen /><p>{children}</p></div>; }
export function StatusBadge({ state }: { state?: string }) { const label = state === 'completed' ? 'Completed' : state === 'in_progress' ? 'In Progress' : state === 'locked' ? 'Locked' : state === 'active' ? 'Active' : state === 'disabled' ? 'Disabled' : 'Not Started'; return <span className={`admin-status state-${state || 'not_started'}`}>{state === 'completed' && <Check />}{label}</span>; }
export function AdminModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keydown = (event: globalThis.KeyboardEvent) => {
      const topDialog=document.querySelector('dialog[open]');
      if(topDialog&&!dialog.current?.contains(topDialog))return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]') || []).filter(element => element.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div className="admin-modal-backdrop" onMouseDown={onClose}><section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="admin-reference-modal" onMouseDown={event => event.stopPropagation()}><header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog"><X /></button></header>{children}</section></div>, document.body);
}
export function navigateAdminTabs(event: KeyboardEvent<HTMLElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'));
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  event.preventDefault(); buttons[next]?.focus(); buttons[next]?.click();
}
export function Directory({ title, description, users, selectedId, onSelect, loading, student = false }: { title: string; description?: string; users: { id: string; name: string | null; email: string; account_status: string; profile?: { gradeLevel?: number | null } }[]; selectedId: string | null; onSelect: (id: string) => void; loading?: boolean; student?: boolean }) {
  return <aside className="admin-panel admin-directory"><PanelHeading icon={<UsersRound />} title={title} description={description || 'Select an account to view details.'} /><div className="admin-directory__list">{loading ? <EmptyState>Loading accounts…</EmptyState> : users.map(user => <button type="button" key={user.id} className={selectedId === user.id ? 'is-selected' : ''} onClick={() => onSelect(user.id)}><span className="admin-person-avatar">{initials(user.name || user.email)}</span><span><b>{user.name || user.email}</b><small>{student ? `Grade ${user.profile?.gradeLevel ?? '—'}` : user.email}</small></span><i className={user.account_status === 'active' ? 'online' : ''} /></button>)}{!loading && !users.length && <EmptyState>No matching accounts.</EmptyState>}</div></aside>;
}
export const initials = (value: string) => value.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
export function DetailLink({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button type="button" className="admin-detail-link" onClick={onClick}>{children}<ChevronRight /></button>; }
