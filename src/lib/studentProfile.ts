export interface EarnedStudentBadge {
  id: string;
  unlockedAt?: string;
}

/** Preserve both legacy keyed achievements and current atomic award records. */
export function earnedStudentBadges(value: unknown): EarnedStudentBadge[] {
  if (!value || typeof value !== 'object') return [];
  const entries = Array.isArray(value) ? value.map((item) => [null, item] as const) : Object.entries(value);
  const badges = new Map<string, EarnedStudentBadge>();
  for (const [key, item] of entries) {
    if (key && (item === null || item === false)) continue;
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : null;
    const id = key ?? (typeof item === 'string' ? item : record?.id);
    if (typeof id !== 'string' || !id.trim()) continue;
    const date = record?.unlockedAt ?? record?.unlocked_at ?? (typeof item === 'string' && key ? item : undefined);
    const unlockedAt = typeof date === 'string' && Number.isFinite(Date.parse(date)) ? date : undefined;
    badges.set(id, { id, unlockedAt });
  }
  return [...badges.values()];
}

export function studentLevelLabel(level?: string | null) {
  return ({ Beginner: 'Baguhan', Intermediate: 'Katamtaman', Advanced: 'Bihasa' } as Record<string, string>)[level ?? ''] ?? level ?? 'Baguhan';
}

export function studentJourneyLabel(journey?: string | null) {
  return ({ 'Beginner Reader': 'Baguhang Mambabasa', 'Intermediate Reader': 'Katamtamang Mambabasa', 'Advanced Reader': 'Bihasang Mambabasa' } as Record<string, string>)[journey ?? ''] ?? journey ?? 'Baguhang Mambabasa';
}

export function studentBadgeDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toLocaleDateString('fil-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
}
