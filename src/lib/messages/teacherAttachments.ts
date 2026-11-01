import type { SupabaseClient } from '@supabase/supabase-js';
import { missingAttachmentColumns } from './replies';
import type { TeacherMessage } from './teacherMessages';

export interface StoredTeacherMessage extends TeacherMessage {
  teacher_id: string;
  children?: { name: string } | null;
}

export async function loadTeacherMessages(client: SupabaseClient, scope: { teacherId?: string; parentId?: string; includeChildren?: boolean }) {
  if (!scope.teacherId && !scope.parentId) throw new Error('Kailangan ang account para makuha ang mga mensahe.');
  const fields = 'id, teacher_id, parent_id, child_id, message, read, created_at' + (scope.includeChildren ? ', children(name)' : '');
  const read = (columns: string) => {
    let query = client.from('teacher_messages').select(columns);
    if (scope.teacherId) query = query.eq('teacher_id', scope.teacherId);
    if (scope.parentId) query = query.eq('parent_id', scope.parentId);
    return query.order('created_at', { ascending: false });
  };
  let result = await read(`${fields}, attachment_name, attachment_path`);
  const attachmentsAvailable = !missingAttachmentColumns(result.error);
  if (!attachmentsAvailable) result = await read(fields);
  if (result.error) throw result.error;
  return { attachmentsAvailable, rows: (result.data ?? []) as unknown as StoredTeacherMessage[] };
}

export const MESSAGE_FILE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt';
export async function validateMessageAttachment(file: File) {
  if (!file.size) throw new Error('Walang laman ang napiling file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Hanggang 5 MB lang ang maaaring i-attach.');
  const extension = file.name.split('.').at(-1)?.toLowerCase();
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const starts = (...prefix: number[]) => prefix.every((byte, index) => bytes[index] === byte);
  const mime = file.type.toLowerCase();
  const allowed: Record<string, boolean> = {
    pdf: (!mime || ['application/pdf', 'application/x-pdf'].includes(mime)) && starts(37, 80, 68, 70, 45),
    png: (!mime || mime === 'image/png') && starts(137, 80, 78, 71, 13, 10, 26, 10),
    jpg: (!mime || mime === 'image/jpeg') && starts(255, 216, 255),
    jpeg: (!mime || mime === 'image/jpeg') && starts(255, 216, 255),
    webp: (!mime || mime === 'image/webp') && starts(82, 73, 70, 70) && [87, 69, 66, 80].every((byte, index) => bytes[index + 8] === byte),
    doc: (!mime || mime === 'application/msword') && starts(208, 207, 17, 224, 161, 177, 26, 225),
    docx: (!mime || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') && starts(80, 75, 3, 4),
    txt: (!mime || mime === 'text/plain') && !Array.from(bytes).includes(0),
  };
  if (!allowed[extension ?? '']) throw new Error('Pumili ng wastong PDF, larawan (PNG/JPG/WebP), Word, o TXT file.');
}
