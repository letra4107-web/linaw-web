interface IconLabelProps {
  icon: string;
  /** Required on purpose: icon-only controls are not allowed in this app. */
  label: string;
  className?: string;
}

/** Pairs an icon (emoji or short glyph) with a mandatory visible label. */
export function IconLabel({ icon, label, className }: IconLabelProps) {
  return (
    <span className={className ?? 'inline-flex items-center gap-2'}>
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </span>
  );
}
