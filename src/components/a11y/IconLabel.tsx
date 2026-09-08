import { AppIcon } from './AppIcon';

interface IconLabelProps {
  /** Legacy icon token rendered as a consistent SVG. Omit when passing `img` instead. */
  icon?: string;
  /** Image asset src, used in place of an emoji `icon` when provided. */
  img?: string;
  /** Required on purpose: icon-only controls are not allowed in this app. */
  label: string;
  className?: string;
}

/** Pairs an accessible SVG icon (or image asset) with a mandatory visible label. */
export function IconLabel({ icon, img, label, className }: IconLabelProps) {
  return (
    <span className={className ?? 'inline-flex items-center gap-2'}>
      {img ? (
        <img src={img} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
      ) : (
        <AppIcon name={icon} />
      )}
      <span>{label}</span>
    </span>
  );
}
