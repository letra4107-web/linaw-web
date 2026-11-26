import type { CSSProperties } from 'react';
import { ILLUSTRATION_SPRITES } from '../../lib/illustrationSprites';

/** Each illustration occupies one complete cell; neighboring pictures stay clipped. */
export function SpriteArtwork({ source, columns, rows, index, className = '', style }: { source: string; columns: number; rows: number; index: number; className?: string; style?: CSSProperties }) {
 const safeIndex = Math.max(0, Math.min(columns * rows - 1, Math.floor(index)));
 const sheet = ILLUSTRATION_SPRITES[source];
 const region = sheet?.cells[safeIndex];
 return <svg className={className} viewBox={region ? region.join(' ') : (safeIndex % columns) + ' ' + Math.floor(safeIndex / columns) + ' 1 1'} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style={{ overflow: 'hidden', ...style }}>
  <image href={source} width={sheet?.width ?? columns} height={sheet?.height ?? rows} preserveAspectRatio="none" />
 </svg>;
}
