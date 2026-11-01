import illustrations from '../../assets/parent/home-decorations.png';

const VIEWPORTS = {
  boy: '25 30 575 580',
  girl: '660 55 567 548',
  hourglass: '135 637 420 570',
  medal: '705 644 480 580',
} as const;

/** Decorative defaults only; names, identities and award records come from live data. */
export function ParentHomeArtwork({ kind }: { kind: keyof typeof VIEWPORTS }) {
  return <svg className="ref-home-art" viewBox={VIEWPORTS[kind]} aria-hidden="true" focusable="false" style={{ overflow: 'hidden' }}><image href={illustrations} width="1254" height="1254" /></svg>;
}
