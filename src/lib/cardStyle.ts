export function cardStyle(brandVar: string, tintPct = 10, borderPct = 30) {
  return {
    backgroundColor: `color-mix(in srgb, var(${brandVar}) ${tintPct}%, white)`,
    borderColor: `color-mix(in srgb, var(${brandVar}) ${borderPct}%, white)`,
  };
}

export const CARD_COLORS = [
  '--color-brand-lavender',
  '--color-brand-sun',
  '--color-brand-sage',
  '--color-brand-coral',
  '--color-brand-teal',
  '--color-brand-violet',
] as const;
