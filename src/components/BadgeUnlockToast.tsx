import { useEffect } from 'react';
import { findBadge } from '../lib/badges';
import owlup from '../assets/owlup.png';

interface BadgeUnlockToastProps {
  badgeIds: string[];
  onDismiss: () => void;
}

// Fixed-position toast stack shown whenever a backend response includes
// newlyUnlockedBadges -- the one visible signal that a badge was actually earned,
// since badge-awarding itself happens silently server-side after each attempt.
export function BadgeUnlockToast({ badgeIds, onDismiss }: BadgeUnlockToastProps) {
  useEffect(() => {
    if (badgeIds.length === 0) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [badgeIds, onDismiss]);

  if (badgeIds.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      <img src={owlup} alt="" aria-hidden="true" className="h-14 w-14 object-contain drop-shadow-lg" />
      {badgeIds.map((id) => {
        const badge = findBadge(id);
        if (!badge) return null;
        return (
          <div
            key={id}
            className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 shadow-raised"
            style={{ border: '2px solid var(--color-brand-sun)' }}
          >
            <img src={badge.image} alt="" className="h-10 w-10 object-contain" />
            <div className="text-left">
              <p className="text-xs font-semibold text-[var(--color-text-muted)]">Bagong Badge!</p>
              <p className="text-sm font-bold">{badge.title}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
