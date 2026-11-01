import type { NotificationRow } from './useNotifications';
import type { TeacherPreferences } from './teacher/preferences';

export type ParentNoticePreferences = Partial<Record<'progress' | 'teacher' | 'schedule' | 'announcements', { inApp?: boolean }>>;

/** Unknown and account/security notices remain visible regardless of optional learning preferences. */
export function showParentInAppNotice(row: NotificationRow, preferences?: ParentNoticePreferences | null) {
  let key: keyof ParentNoticePreferences | undefined;
  if (['lesson', 'practice', 'streak', 'xp', 'achievement', 'assessment_graded', 'new_lesson', 'lesson_available'].includes(row.type)) key = 'progress';
  else if (['teacher_message', 'parent_teacher_reply'].includes(row.type)) key = 'teacher';
  else if (['pdf_assignment', 'scheduled_activity', 'schedule', 'reminder', 'appointment'].includes(row.type)) key = 'schedule';
  else if (['announcement', 'school_announcement', 'system_announcement'].includes(row.type)) key = 'announcements';
  return !key || preferences?.[key]?.inApp !== false;
}

/** Only optional teacher notice categories are muted; account/security notices remain. */
export function showTeacherInAppNotice(row: NotificationRow, preferences?:TeacherPreferences['notices']) {
  let key:keyof NonNullable<TeacherPreferences['notices']> | undefined;
  if(['announcement','school_announcement','system_announcement'].includes(row.type))key='announcements';
  else if(['teacher_message','parent_teacher_reply','admin_message','school_message'].includes(row.type))key='messages';
  else if(['pdf_assignment','scheduled_activity','schedule','reminder','appointment'].includes(row.type))key='schedule';
  else if(['lesson','practice','streak','xp','achievement','assessment_graded','new_lesson','lesson_available'].includes(row.type))key='progress';
  return !key || preferences?.[key]!==false;
}
