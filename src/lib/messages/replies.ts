import type { SupabaseClient } from '@supabase/supabase-js';

export interface MessageReply {
  id: string;
  message: string;
  created_at: string;
  attachment_name: string | null;
  attachment_path: string | null;
}

export function missingAttachmentColumns(error: { code?: string; message?: string } | null) {
  return Boolean(error && ['42703', 'PGRST204'].includes(error.code ?? '')
    && /attachment_(name|path)/i.test(error.message ?? ''));
}

/** Mobile's deployed reply table predates the web attachment columns. */
export async function loadMessageReplies(client: SupabaseClient, threadId: string | string[]) {
  if (Array.isArray(threadId) && !threadId.length) return { attachmentsAvailable: true, rows: [] as MessageReply[] };
  const read = (fields: string) => {
    const query = client.from('parent_teacher_replies').select(fields);
    return (Array.isArray(threadId) ? query.in('teacher_message_id', threadId) : query.eq('teacher_message_id', threadId))
      .order('created_at', { ascending: true });
  };
  const result = await read('id, message, created_at, attachment_name, attachment_path');
  const attachmentsAvailable = !missingAttachmentColumns(result.error);
  if (!attachmentsAvailable) {
    const basic = await read('id, message, created_at');
    if (basic.error) throw basic.error;
    const rows = (basic.data ?? []) as unknown as Pick<MessageReply, 'id' | 'message' | 'created_at'>[];
    return { attachmentsAvailable: false, rows: rows.map((row) => ({ ...row, attachment_name: null, attachment_path: null })) };
  }
  if (result.error) throw result.error;
  return { attachmentsAvailable: true, rows: (result.data ?? []) as unknown as MessageReply[] };
}
