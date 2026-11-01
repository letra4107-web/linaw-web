export type TeacherThemeMode = 'light' | 'dark' | 'system';
export type TeacherNoticeCategory = 'announcements' | 'messages' | 'schedule' | 'progress';
export interface TeacherPreferences { theme?:TeacherThemeMode; notices?:Partial<Record<TeacherNoticeCategory,boolean>>; }
export function teacherPreferenceKey(userId:string) { return `linawletra.teacher-preferences.v1.${userId}`; }
export function parseTeacherPreferences(raw:string | null):TeacherPreferences {
  try {
    const value = JSON.parse(raw ?? '{}');
    if (!value || typeof value !== 'object') return {};
    const result:TeacherPreferences = {};
    if (['light','dark','system'].includes(value.theme)) result.theme = value.theme;
    if (value.notices && typeof value.notices === 'object') {
      result.notices = {};
      for (const category of ['announcements','messages','schedule','progress'] as const) if (typeof value.notices[category] === 'boolean') result.notices[category] = value.notices[category];
    }
    return result;
  } catch { return {}; }
}
