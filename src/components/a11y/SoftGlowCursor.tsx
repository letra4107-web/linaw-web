import { useEffect, useRef } from 'react';

/**
 * A decorative cursor halo. It follows a mouse or pen without replacing the
 * native cursor, so browser controls and accessibility affordances remain
 * familiar to the reader.
 */
export function SoftGlowCursor() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supportsFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!supportsFinePointer || prefersReducedMotion) return;

    let frame = 0;
    let x = -160;
    let y = -160;

    const paint = () => {
      frame = 0;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={glowRef} aria-hidden="true" className="soft-glow-cursor" />;
}
