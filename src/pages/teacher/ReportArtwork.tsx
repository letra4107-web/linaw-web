import type { CSSProperties } from 'react';
import reportArt from '../../assets/teacher/report-illustrations.png';
import portraits from '../../assets/parent/home-decorations.png';

export function ReportArtwork({ item, className = '' }: { item: number; className?: string }) {
  return <span className={`tr-art ${className}`} aria-hidden="true" style={{ '--report-art-column': item } as CSSProperties}><img src={reportArt} alt="" decoding="async" draggable={false} /></span>;
}
export function ReportPortrait({ index }: { index: number }) {
  return <span className={`tr-avatar tr-avatar-${index % 3}`} aria-hidden="true"><svg viewBox={index % 2 ? '660 55 567 548' : '25 30 575 580'} focusable="false"><image href={portraits} width="1254" height="1254" /></svg></span>;
}
