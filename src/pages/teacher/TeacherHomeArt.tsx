import type { CSSProperties } from 'react';
import illustrations from '../../assets/teacher/home-illustrations.png';

/** Import the artwork through Vite in both development and production. */
export function TeacherHomeArt({ item, className = '' }: { item: number; className?: string }) {
  return <span aria-hidden="true" className={`th-art th-art-${item} ${className}`} style={{ '--art-column': item % 4, '--art-row': Math.floor(item / 4) } as CSSProperties}>
    <img src={illustrations} alt="" decoding="async" draggable={false} />
  </span>;
}
