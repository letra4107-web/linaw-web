export interface ReportRoster { id: string; student_id: string; assigned_at: string; children: { id: string; name: string; grade_level: number; username: string } | null; }
export interface ReportProgress { child_id: string; xp: number; streak: number; level: string | null; accuracy_sum: number; total_attempts: number; activities_completed: number; }
export interface ReportSession { student_id: string; created_at: string; }
export interface ReportRow extends ReportRoster { item?: ReportProgress & { level: string }; accuracy: number; level: string; lastActivity?: string; needsAttention: boolean; }

export function buildReportRows(roster: ReportRoster[], progress: ReportProgress[], sessions: ReportSession[]): ReportRow[] {
  const latest = new Map<string, string>();
  for (const session of sessions) if (!latest.has(session.student_id) || session.created_at > latest.get(session.student_id)!) latest.set(session.student_id, session.created_at);
  const byChild = new Map(progress.map((item) => [item.child_id, item]));
  return roster.map((row) => {
    const record = byChild.get(row.student_id);
    const level = record?.level || 'Beginner';
    const item = record ? { ...record, level } : undefined;
    const accuracy = item?.total_attempts ? Math.round(item.accuracy_sum / item.total_attempts) : 0;
    return { ...row, item, level, accuracy, lastActivity: latest.get(row.student_id), needsAttention: Boolean(item?.total_attempts && accuracy < 70) };
  });
}

export function startOfManilaWeek(now: number): number {
  const local = new Date(now + 8 * 60 * 60 * 1000);
  local.setUTCDate(local.getUTCDate() - (local.getUTCDay() + 6) % 7);
  local.setUTCHours(0, 0, 0, 0);
  return local.getTime() - 8 * 60 * 60 * 1000;
}

/** The period selects recently active learners; scores remain cumulative records. */
export function reportCohort(rows: ReportRow[], period: string, now: number): ReportRow[] {
  const since = period === 'all' ? -Infinity : now - Number(period) * 86_400_000;
  return rows.filter((row) => row.item?.total_attempts && (period === 'all' || (row.lastActivity && Date.parse(row.lastActivity) >= since && Date.parse(row.lastActivity) <= now)));
}

/** Retain the existing class-relative Completion/Practice calculation. */
export function reportGraph(rows: ReportRow[]) {
  const grades = [...new Set(rows.map((row) => row.children?.grade_level ?? -1))].sort((a, b) => a - b);
  const maxActivities = Math.max(1, ...rows.map((row) => row.item?.activities_completed ?? 0));
  const maxAttempts = Math.max(1, ...rows.map((row) => row.item?.total_attempts ?? 0));
  return ['Accuracy', 'Completion', 'Practice'].map((metric) => ({ metric, groups: grades.map((grade) => {
    const group = rows.filter((row) => (row.children?.grade_level ?? -1) === grade);
    const sum = group.reduce((value, row) => value + (metric === 'Accuracy' ? row.accuracy : metric === 'Completion' ? ((row.item?.activities_completed ?? 0) / maxActivities) * 100 : ((row.item?.total_attempts ?? 0) / maxAttempts) * 100), 0);
    return { grade, value: group.length ? Math.round(sum / group.length) : 0 };
  }) }));
}

export function reportDistribution(rows: ReportRow[]) {
  const names = ['Advanced', 'Intermediate', 'Beginner'];
  for (const row of rows) if (!names.some((name) => name.toLowerCase() === row.level.toLowerCase())) names.push(row.level);
  const colors: Record<string, string> = { Advanced: '#8347f6', Intermediate: '#29b4f2', Beginner: '#ffb600', Early: '#ed79b2' };
  return names.map((name) => ({ name, value: rows.filter((row) => row.level.toLowerCase() === name.toLowerCase()).length, color: colors[name] || '#61b59a' }));
}
