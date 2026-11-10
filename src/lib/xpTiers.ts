export const XP_TIERS = [
  { name: 'Beginner', minXp: 0 },
  { name: 'Apprentice', minXp: 35 },
  { name: 'Rising Star', minXp: 70 },
  { name: 'Expert', minXp: 120 },
  { name: 'Champion', minXp: 200 },
] as const;

export function xpTier(totalXp: number) {
  const xp = Math.max(0, Number.isFinite(totalXp) ? totalXp : 0);
  const index = XP_TIERS.reduce((last, tier, currentIndex) => xp >= tier.minXp ? currentIndex : last, 0);
  const current = XP_TIERS[Math.max(index, 0)];
  const next = XP_TIERS[index + 1] ?? null;
  return { ...current, next, xpToNext: next ? Math.max(0, next.minXp - xp) : 0 };
}
