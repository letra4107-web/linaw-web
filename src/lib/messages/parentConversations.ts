import type { StoredTeacherMessage } from './teacherAttachments';

export const isAnnouncement = (text: string) => /anunsyo|paalala|conference|takdang-aralin/i.test(text);
export function parentConversations(messages: StoredTeacherMessage[]) {
  const groups = new Map<string, StoredTeacherMessage[]>();
  for (const message of messages) {
    const group = groups.get(message.teacher_id) ?? [];
    if (!group.some(row => row.id === message.id)) group.push(message);
    groups.set(message.teacher_id, group);
  }
  return [...groups.entries()].map(([teacherId, rows]) => {
    const history = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
    return {
      teacherId, messages: history, latest: history[0],
      children: [...new Map(history.map(row => [row.child_id, { id: row.child_id, name: row.children?.name ?? 'Anak' }])).values()],
      unreadIds: history.filter(row => !row.read).map(row => row.id),
      hasAnnouncements: history.some(row => isAnnouncement(row.message)),
      hasTeacherMessages: history.some(row => !isAnnouncement(row.message)),
    };
  }).sort((a, b) => b.latest.created_at.localeCompare(a.latest.created_at) || a.teacherId.localeCompare(b.teacherId));
}
