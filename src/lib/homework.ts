import type { SupabaseClient } from '@supabase/supabase-js';

export interface Homework {
  id: string; teacher_id: string; title: string; instructions: string; grade_level: number;
  due_at: string | null; file_path: string | null; file_name: string | null; status: 'open' | 'closed'; created_at: string;
}
export interface HomeworkSubmission {
  id: string; assignment_id: string; student_id: string; answer_text: string;
  file_path: string | null; file_name: string | null; status: 'draft' | 'submitted' | 'reviewed' | 'returned';
  submitted_at: string | null; feedback: string; revision: number;
}
export interface HomeworkStudent { id: string; name: string; grade_level: number; }
export interface HomeworkWork { student_id: string; name: string; submission: HomeworkSubmission | null; }
export const HOMEWORK_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png';
export const HOMEWORK_STATUS = { draft: 'Hindi pa naipapasa', submitted: 'Naipasa na', reviewed: 'Nasuri na', returned: 'Ibinalik ng guro' };
const MIME: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
export function homeworkFileType(name: string, size: number) {
  const type = MIME[name.split('.').pop()?.toLowerCase() || ''];
  if (!type || size <= 0 || size > 20 * 1024 * 1024) throw new Error('Pumili ng PDF, Word, PowerPoint, Excel, JPG o PNG na hanggang 20 MB.');
  return type;
}
export function homeworkError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (['PGRST202', '42P01', 'PGRST205', '42883'].includes(e?.code || '')) return 'Hindi pa handa ang Takdang-Aralin. Kailangang i-install muna ang homework migration ng database.';
  if (/fetch|network|timeout|load failed/i.test(e?.message || '')) return 'Hindi makakonekta. Nananatili rito ang iyong sagot; subukan muli.';
  if (/^(Hindi|Mag|Pumili|Kumpletuhin|Nagbago|Naipasa|Hintayin|Sarado|Guro|Walang)/i.test(e?.message || '')) return e.message!;
  return 'Hindi makumpleto ang kahilingan. Subukan muli.';
}
function checked<T>(result: { data: T; error: unknown }) { if (result.error) throw result.error; return result.data; }
export async function listHomework(client: SupabaseClient) {
  return checked(await client.from('homework_assignments').select('*').order('created_at', { ascending: false })) as Homework[];
}
export async function ownHomeworkAnswers(client: SupabaseClient) {
  const session = await client.auth.getUser();
  if (session.error) throw session.error;
  const auth = session.data;
  if (!auth.user) throw new Error('Mag-login muna upang magpatuloy.');
  // RLS also prevents another student's answer from being read.
  const child = checked(await client.from('children').select('id').eq('auth_uid', auth.user.id).single());
  if (!child) throw new Error('Hindi makita ang iyong student profile.');
  return checked(await client.from('homework_submissions').select('*').eq('student_id', child.id)) as HomeworkSubmission[];
}
export async function uploadHomeworkFile(client: SupabaseClient, name: string, size: number, contents: Blob | ArrayBuffer) {
  const contentType = homeworkFileType(name, size);
  const session = await client.auth.getUser();
  if (session.error) throw session.error;
  const auth = session.data;
  if (!auth.user) throw new Error('Mag-login muna upang magpatuloy.');
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
  const fileName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180);
  const path = `${auth.user.id}/${key}-${fileName}`;
  checked(await client.storage.from('homework-files').upload(path, contents, { contentType, upsert: false }));
  return { file_path: path, file_name: name.slice(0, 255) };
}
export async function homeworkFileUrl(client: SupabaseClient, path: string) {
  const result = checked(await client.storage.from('homework-files').createSignedUrl(path, 300));
  if (!result?.signedUrl) throw new Error('Hindi mabuksan ang file. Subukan muli.');
  return result.signedUrl;
}
export async function saveHomeworkAnswer(client: SupabaseClient, assignmentId: string, text: string, file: { file_path: string | null; file_name: string | null }, submit: boolean) {
  if (text.length > 10000 || (submit && !text.trim() && !file.file_path)) throw new Error('Maglagay muna ng sagot o maglakip ng file bago ipasa.');
  return checked(await client.rpc('save_homework_answer', { p_assignment_id: assignmentId, p_answer_text: text, p_file_path: file.file_path, p_file_name: file.file_name, p_submit: submit })) as HomeworkSubmission;
}
