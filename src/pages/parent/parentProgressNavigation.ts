export type ParentProgressTab = 'modules' | 'activities' | 'results' | 'practice';

export function progressMonth(params: URLSearchParams, today = new Date()) {
  const value = params.get('month');
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) > 0
    ? value
    : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

/** Retain child and date context while changing the report being viewed. */
export function progressNavigation(params: URLSearchParams, tab: ParentProgressTab, detail?: { module?: string; session?: string }, childId?: string | null) {
  const next = new URLSearchParams(params);
  next.set('tab', tab);
  next.delete('module');
  next.delete('session');
  if (childId) next.set('child', childId);
  if (detail?.module && tab === 'modules') next.set('module', detail.module);
  if (detail?.session && (tab === 'activities' || tab === 'practice')) next.set('session', detail.session);
  return next;
}
