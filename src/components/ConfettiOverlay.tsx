import { useEffect } from 'react';
import confetti from 'canvas-confetti';

// Pastel side cannons inspired by Magic UI's confetti example.
const DEFAULT_PALETTE = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1', '#64cbb4'];

interface ConfettiOverlayProps {
  /** A new attempt fires a fresh burst, even when the feedback text repeats. */
  trigger: string | number | null | undefined;
  palette?: string[];
}

/** Celebrate every reading attempt without covering or intercepting controls. */
export function ConfettiOverlay({ trigger, palette = DEFAULT_PALETTE }: ConfettiOverlayProps) {
  useEffect(() => {
    if (trigger == null || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    // A body-level canvas keeps the burst outside clipped feedback cards and
    // transformed lesson containers. Each effect owns and removes its canvas.
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('data-reading-confetti', 'true');
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '1000',
    });
    document.body.appendChild(canvas);
    // The live site's script-src policy disallows blob workers. Render this
    // short burst on the main thread so the canvas also works under that CSP.
    const fire = confetti.create(canvas, { resize: true, useWorker: false, disableForReducedMotion: true });
    const burst = (particleCount: number) => {
      const options = {
        particleCount, spread: 55, startVelocity: 45, gravity: 1,
        ticks: 160, scalar: 0.95, colors: palette, disableForReducedMotion: true,
      };
      void fire({ ...options, angle: 60, origin: { x: 0, y: 0.65 } });
      void fire({ ...options, angle: 120, origin: { x: 1, y: 0.65 } });
    };
    burst(40);
    const timers = [setTimeout(() => burst(20), 150), setTimeout(() => burst(20), 300)];
    const stop = () => { fire.reset(); canvas.remove(); };
    timers.push(setTimeout(stop, 3200));
    return () => { timers.forEach(clearTimeout); stop(); };
  }, [trigger, palette]);

  return null;
}
