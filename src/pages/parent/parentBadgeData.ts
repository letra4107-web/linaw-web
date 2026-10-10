/** Accept current award records and older badge storage without inventing unlocks. */
export function normalizeEarnedBadgeIds(...sources: unknown[]): string[] {
  const ids = sources.flatMap((source): string[] => {
    if (Array.isArray(source)) {
      return source.flatMap((entry): string[] => {
        if (typeof entry === 'string') return entry.trim() ? [entry] : [];
        if (entry && typeof entry === 'object' && 'id' in entry && typeof entry.id === 'string') {
          return entry.id.trim() ? [entry.id] : [];
        }
        return [];
      });
    }
    return source && typeof source === 'object' ? Object.keys(source) : [];
  });
  return [...new Set(ids)];
}
