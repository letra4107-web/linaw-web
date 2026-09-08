import { useEffect, useState } from 'react';

const DEFAULT_PALETTE = ['#7c3aed', '#f97316', '#14b8a6', '#eab308', '#ec4899', '#2563eb'];
const PARTICLE_COUNT = 24;
const DURATION_MS = 2400;

interface Particle {
  id: number;
  color: string;
  left: number;
  fallDuration: number;
  delay: number;
  rotate: number;
}

interface ConfettiOverlayProps {
  /** Any value that changes fires a new decorative burst. */
  trigger: string | number | null | undefined;
  palette?: string[];
}

function makeParticlesFrom(palette: string[]): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, id) => ({
    id,
    color: palette[Math.floor(Math.random() * palette.length)],
    left: Math.random() * 100,
    fallDuration: 1600 + Math.random() * 1200,
    delay: Math.random() * 500,
    rotate: Math.random() * 360,
  }));
}

/** Geometric, non-text confetti that renders consistently on every platform. */
export function ConfettiOverlay({ trigger, palette = DEFAULT_PALETTE }: ConfettiOverlayProps) {
  const [particles, setParticles] = useState<Particle[] | null>(null);

  useEffect(() => {
    if (!trigger) return;
    setParticles(makeParticlesFrom(palette));
    const timer = setTimeout(() => setParticles(null), DURATION_MS);
    return () => clearTimeout(timer);
  }, [trigger, palette]);

  if (!particles) return null;
  return <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
    {particles.map((particle) => <span key={particle.id} className="confetti-piece absolute top-[-40px] h-3 w-2 rounded-sm shadow-sm" style={{ left: `${particle.left}%`, animationDuration: `${particle.fallDuration}ms`, animationDelay: `${particle.delay}ms`, transform: `rotate(${particle.rotate}deg)`, backgroundColor: particle.color }} />)}
  </div>;
}
