import { useEffect, useRef } from 'react';
import { useAccessibility } from '../../lib/a11y/AccessibilityContext';

const BAND_HEIGHT = 72;

/**
 * Dims everything except a horizontal band that follows the cursor, so a
 * dyslexic reader can keep their place on a long page of text. Direct DOM
 * style writes on mousemove (not React state) to avoid a re-render per pixel.
 */
export function ReadingGuideOverlay() {
  const { readingGuide } = useAccessibility();
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!readingGuide) return;

    const onMove = (e: MouseEvent) => {
      const top = Math.max(0, e.clientY - BAND_HEIGHT / 2);
      const bottom = e.clientY + BAND_HEIGHT / 2;
      if (topRef.current) topRef.current.style.height = `${top}px`;
      if (bottomRef.current) bottomRef.current.style.top = `${bottom}px`;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [readingGuide]);

  if (!readingGuide) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[999]">
      <div
        ref={topRef}
        className="absolute left-0 right-0 top-0 transition-[height] duration-75 ease-out"
        style={{ height: '40vh', background: 'var(--color-guide-mask)' }}
      />
      <div
        ref={bottomRef}
        className="absolute bottom-0 left-0 right-0 transition-[top] duration-75 ease-out"
        style={{ top: `calc(40vh + ${BAND_HEIGHT}px)`, background: 'var(--color-guide-mask)' }}
      />
    </div>
  );
}
