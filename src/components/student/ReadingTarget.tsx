import type { ReactNode } from 'react';

interface ReadingTargetProps {
  children: ReactNode;
  label?: string;
  tone?: string;
  compact?: boolean;
  className?: string;
}

/** Keeps the item a student is meant to read visually distinct from surrounding controls. */
export function ReadingTarget({ children, label = 'Basahin ito', tone = '--color-primary', compact = false, className = '' }: ReadingTargetProps) {
  return (
    <section aria-label={label} className={`relative overflow-hidden rounded-3xl border px-5 py-8 text-center shadow-inner sm:px-8 ${compact ? 'min-h-36' : 'min-h-52'} ${className}`} style={{ backgroundColor: `color-mix(in srgb, var(${tone}) 10%, var(--color-surface))`, borderColor: `color-mix(in srgb, var(${tone}) 24%, var(--color-border))` }}>
      <span className="absolute top-4 left-4 rounded-full bg-white/75 px-3 py-1 text-xs font-bold" style={{ color: `var(${tone})` }}>{label}</span>
      <div className="flex h-full min-h-[inherit] items-center justify-center pt-6">{children}</div>
    </section>
  );
}
