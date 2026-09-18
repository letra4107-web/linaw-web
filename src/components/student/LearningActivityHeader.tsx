interface LearningActivityHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  completed?: number;
  total?: number;
  children?: React.ReactNode;
}

/** A consistent, readable start point for a focused student activity. */
export function LearningActivityHeader({
  eyebrow,
  title,
  description,
  completed,
  total,
  children,
}: LearningActivityHeaderProps) {
  const hasProgress = typeof completed === 'number' && typeof total === 'number' && total > 0;
  const progress = hasProgress ? Math.round((completed / total) * 100) : 0;

  return (
    <header
      className="overflow-hidden rounded-3xl p-6 text-white shadow-hero sm:p-7"
      style={{ backgroundImage: 'linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via), var(--color-hero-to))' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-bold tracking-[0.12em] text-white/80 uppercase">{eyebrow}</p>
          <h1 className="mt-1 text-2xl leading-tight font-bold sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 text-sm leading-relaxed text-white/90 sm:text-base">{description}</p>}
        </div>
        {children}
      </div>

      {hasProgress && (
        <div className="mt-5" role="progressbar" aria-label="Progreso sa aktibidad" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}>
          <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
            </div>
            <span className="shrink-0 text-sm font-semibold">{completed}/{total}</span>
          </div>
        </div>
      )}
    </header>
  );
}
