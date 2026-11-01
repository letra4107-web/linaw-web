import type { NotificationRow } from '../../lib/useNotifications';

export type NoticeGroup = 'progress' | 'schedule' | 'messages' | 'system';
export type NoticeFilter = 'all' | 'unread' | NoticeGroup;
export type NoticeIcon = 'book' | 'trophy' | 'calendar' | 'play' | 'star' | 'mail' | 'shield' | 'graduation';
export type NoticeTone = 'pink' | 'gold' | 'blue' | 'mint' | 'violet' | 'orange';
type Presentation = { group: NoticeGroup; label: string; tone: NoticeTone; icon: NoticeIcon };

/** The same classification drives both row badges and filter counts. */
export function notificationPresentation(row: Pick<NotificationRow, 'type' | 'title' | 'body' | 'message'>): Presentation {
  switch (row.type) {
    case 'student_login': return { group: 'system', label: 'System', tone: 'pink', icon: 'book' };
    case 'streak': return { group: 'progress', label: 'Motibasyon', tone: 'gold', icon: 'trophy' };
    case 'lesson': return /bagong|available|nakahanda/i.test(row.title)
      ? { group: 'system', label: 'System', tone: 'violet', icon: 'play' }
      : { group: 'progress', label: 'Progreso', tone: 'blue', icon: 'book' };
    case 'practice': return { group: 'progress', label: 'Progreso', tone: 'blue', icon: 'book' };
    case 'assessment_graded': return { group: 'progress', label: 'Progreso', tone: 'pink', icon: 'graduation' };
    case 'achievement': return { group: 'progress', label: 'Progreso', tone: 'gold', icon: 'trophy' };
    case 'xp': return { group: 'progress', label: 'Progreso', tone: 'pink', icon: 'star' };
    case 'pdf_assignment':
    case 'scheduled_activity':
    case 'schedule':
    case 'reminder':
    case 'appointment': return { group: 'schedule', label: 'Iskedyul', tone: 'mint', icon: 'calendar' };
    case 'teacher_message':
    case 'parent_teacher_reply': return { group: 'messages', label: 'Mensahe', tone: 'mint', icon: 'mail' };
    case 'new_lesson':
    case 'lesson_available': return { group: 'system', label: 'System', tone: 'violet', icon: 'play' };
    default: return /mensahe|message/i.test(`${row.title} ${row.body ?? row.message ?? ''}`)
      ? { group: 'messages', label: 'Mensahe', tone: 'mint', icon: 'mail' }
      : { group: 'system', label: 'System', tone: 'orange', icon: 'shield' };
  }
}

export function matchesNoticeFilter(row: NotificationRow, filter: NoticeFilter) {
  return filter === 'all' || (filter === 'unread' ? !row.is_read : notificationPresentation(row).group === filter);
}
