import { useId, useRef } from 'react';
import { BADGE_CATALOG } from '../lib/badges';
import { earnedStudentBadges, studentBadgeDate } from '../lib/studentProfile';
import { AchievementArtwork } from './student/AchievementArtwork';
import './student-badge-summary.css';

/** Read-only: render the persisted award ledger, never infer awards from XP. */
export function StudentBadgeSummary({ achievements, badges, name = 'Mag-aaral' }: { achievements: unknown; badges?: unknown; name?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const earned = new Map([...earnedStudentBadges(badges), ...earnedStudentBadges(achievements)].map(item => [item.id, item]));
  const count = BADGE_CATALOG.filter(badge => earned.has(badge.id)).length;
  const cards = (all: boolean) => <div className="student-badge-mini-grid">{BADGE_CATALOG.filter(badge => all || earned.has(badge.id)).slice(0, all ? BADGE_CATALOG.length : 4).map(badge => <article key={badge.id} className={earned.has(badge.id) ? 'is-earned' : 'is-locked'}><AchievementArtwork badge={badge} /><b>{badge.title}</b><small>{earned.has(badge.id) ? 'Nakuha na' : 'Hindi pa nakukuha'}</small>{all && <><p>{badge.criteria}</p>{studentBadgeDate(earned.get(badge.id)?.unlockedAt) && <time>{studentBadgeDate(earned.get(badge.id)?.unlockedAt)}</time>}</>}</article>)}</div>;
  return <section className="student-badge-summary" aria-label={'Mga badge ni ' + name}><header><div><h3>Mga Nakuhang Badge</h3><p><strong>{count} / {BADGE_CATALOG.length}</strong> badge ang nakuha ni {name}.</p></div><button type="button" onClick={() => dialog.current?.showModal()}>Tingnan ang lahat</button></header>{count ? cards(false) : <p>Wala pang nakukuhang badge. Makikita rito ang mga nakamit sa pagsasanay.</p>}<dialog ref={dialog} className="student-badge-dialog" aria-labelledby={titleId} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.current?.close(); } }}><header><div><h2 id={titleId}>Mga Badge ni {name}</h2><p>{count} sa {BADGE_CATALOG.length} ang nakuha</p></div><button type="button" onClick={() => dialog.current?.close()} aria-label="Isara ang mga badge">Isara</button></header>{cards(true)}</dialog></section>;
}
