import { useEffect, useState } from 'react';

// Full-page falling-emoji celebration, matching mobile's ConfettiOverlay.tsx emoji pool and
// ~2.4s duration -- fixed positioning so it covers the whole viewport regardless of where
// this component is mounted in the tree.
const EMOJI_POOL = ['🎊', '🎉', '✨', '⭐', '🌟', '🎈', '💛', '💜', '💙', '🟡', '🔵', '🟣'];
const PARTICLE_COUNT = 24;
const DURATION_MS = 2400;

interface Particle {
  id: number;
  emoji: string;
  left: number;
  fallDuration: number;
  delay: number;
  rotate: number;
}

interface ConfettiOverlayProps {
  /** Any value that changes (e.g. a per-attempt token) fires a new confetti burst. Falsy = no burst. */
  trigger: string | number | null | undefined;
  emojiPool?: string[];
}

function makeParticlesFrom(pool: string[]): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    emoji: pool[Math.floor(Math.random() * pool.length)],
    left: Math.random() * 100,
    fallDuration: 1600 + Math.random() * 1200,
    delay: Math.random() * 500,
    rotate: Math.random() * 360,
  }));
}

export function ConfettiOverlay({ trigger, emojiPool = EMOJI_POOL }: ConfettiOverlayProps) {
  const [particles, setParticles] = useState<Particle[] | null>(null);

  useEffect(() => {
    if (!trigger) return;
    setParticles(makeParticlesFrom(emojiPool));
    const timer = setTimeout(() => setParticles(null), DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (!particles) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute top-[-40px] text-2xl"
          style={{
            left: `${p.left}%`,
            animationDuration: `${p.fallDuration}ms`,
            animationDelay: `${p.delay}ms`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
