import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export function ScrollReveal({ children, className = '', immediate = false }: { children: ReactNode; className?: string; immediate?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  // Visible is the safe default: content remains readable before hydration and if
  // animation APIs fail. Lower sections are hidden before first paint only when
  // JavaScript confirms they are below the viewport.
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || immediate) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setVisible(false);

    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}
    >
      {children}
    </div>
  );
}
