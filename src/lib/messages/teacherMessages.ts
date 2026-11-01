import type { SupabaseClient } from '@supabase/supabase-js';
import { missingAttachmentColumns } from './replies';

export interface TeacherMessage { id: string; parent_id: string; child_id: string; message: string; read: boolean; created_at: string; attachment_name?: string | null; attachment_path?: string | null; }
export interface TeacherParentReply extends TeacherMessage { teacher_message_id: string; attachment_name: string | null; attachment_path: string | null; }
export type ConversationMessage = (TeacherMessage & { author: 'teacher' }) | (TeacherParentReply & { author: 'parent' });
export function teacherConversation(sent: TeacherMessage[], replies: TeacherParentReply[], parentId: string): ConversationMessage[] {
  return [...sent.filter(row => row.parent_id === parentId).map(row => ({ ...row, author: 'teacher' as const })), ...replies.filter(row => row.parent_id === parentId).map(row => ({ ...row, author: 'parent' as const }))]
    .sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
export async function loadTeacherParentReplies(client: SupabaseClient, teacherId: string) {
  const fields = 'id, teacher_message_id, parent_id, child_id, message, read, created_at';
  const read = (columns: string) => client.from('parent_teacher_replies').select(columns).eq('teacher_id', teacherId).order('created_at', { ascending: false });
  const result = await read(`${fields}, attachment_name, attachment_path`);
  if (missingAttachmentColumns(result.error)) {
    const basic = await read(fields);
    if (basic.error) throw basic.error;
    const rows = (basic.data ?? []) as unknown as Omit<TeacherParentReply, 'attachment_name' | 'attachment_path'>[];
    return rows.map(row => ({ ...row, attachment_name: null, attachment_path: null }));
  }
  if (result.error) throw result.error;
  return (result.data ?? []) as unknown as TeacherParentReply[];
}
