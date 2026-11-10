import { earnedStudentBadges } from '../../lib/studentProfile.ts';
/** Read current and legacy awards, excluding explicitly false/empty entries. */
export function normalizeEarnedBadgeIds(...sources: unknown[]): string[] {
 return [...new Set(sources.flatMap(source => earnedStudentBadges(source).map(badge => badge.id)))];
}
