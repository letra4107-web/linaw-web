interface IconLabelProps {
  /** Emoji or short glyph. Omit when passing `img` instead. */
  icon?: string;
  /** Image asset src, used in place of an emoji `icon` when provided. */
  img?: string;
  /** Required on purpose: icon-only controls are not allowed in this app. */
  label: string;
  className?: string;
}

/** Pairs an icon (emoji, short glyph, or image asset) with a mandatory visible label. */
export function IconLabel({ icon, img, label, className }: IconLabelProps) {
  return (
    <span className={className ?? 'inline-flex items-center gap-2'}>
      {img ? (
        <img src={img} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
      ) : (
        <span aria-hidden="true">{icon}</span>
      )}
      <span>{label}</span>
    </span>
  );
}
