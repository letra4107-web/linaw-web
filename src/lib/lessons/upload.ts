import type { SupabaseClient } from '@supabase/supabase-js';

export interface LessonDraft { title: string; description: string; gradeLevel: string; }

export async function validateLessonPdf(file: File) {
  if (!file.size || file.size > 50 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.pdf') || await file.slice(0, 5).text() !== '%PDF-') throw new Error('Pumili ng wastong PDF na may laman at hindi lalampas sa 50 MB.');
}

export const LESSON_FILE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png';
const LESSON_PREVIEW_ENDPOINT = 'https://app-backend-production-f32c.up.railway.app/api/lesson-files/prepare';

export async function validateLessonFile(file: File) {
  if (!file.size || file.size > 50 * 1024 * 1024 || !/\.(pdf|docx?|pptx?|xlsx?|jpe?g|png)$/i.test(file.name)) {
    throw new Error('Pumili ng PDF, Word, PowerPoint, Excel, JPG o PNG na may laman at hanggang 50 MB.');
  }
  if (/\.pdf$/i.test(file.name)) await validateLessonPdf(file);
}

async function prepareLessonFile(client: SupabaseClient, teacherId: string, file: File): Promise<File> {
  await validateLessonFile(file);
  if (/\.pdf$/i.test(file.name)) return file;
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.access_token || data.session.user.id !== teacherId) throw new Error('Mag-login muli upang magpatuloy.');
  const body = new FormData(); body.append('file', file);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(LESSON_PREVIEW_ENDPOINT, {
      method: 'POST', headers: { Authorization: 'Bearer ' + data.session.access_token }, body, signal: controller.signal,
    });
    if (!response.ok) {
      const details = await response.json().catch(() => null);
      throw new Error(details?.message || 'Hindi maihanda ang file. Subukan muli mamaya.');
    }
    if (response.headers.get('content-type')?.split(';')[0] !== 'application/pdf') throw new Error('Hindi wastong PDF ang preview. Subukan muli.');
    const preview = new File([await response.blob()], file.name.replace(/\.[^.]+$/, '.pdf'), { type: 'application/pdf' });
    await validateLessonPdf(preview);
    return preview;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Natagalan ang paghahanda ng file. Subukan muli o i-export muna bilang PDF.');
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function uploadLessonPdf(client: SupabaseClient, teacherId: string, file: File) {
  if (!teacherId) throw new Error('Mag-login muna upang magpatuloy.');
  file = await prepareLessonFile(client, teacherId, file);
  const bucket = 'lesson-pdfs';
  const path = `${teacherId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const { error: uploadError } = await client.storage.from(bucket).upload(path, file, { contentType: 'application/pdf', upsert: false });
  if (uploadError) throw uploadError;
  const { data: publicUrl } = client.storage.from(bucket).getPublicUrl(path);
  return { pdf_url: publicUrl.publicUrl, legacy_public_url: publicUrl.publicUrl, storage_bucket: bucket, storage_path: path, file_name: file.name };
}

/** Publish the same PDF attachment contract used by web, iOS and Android. */
export async function uploadPublishedLesson(client: SupabaseClient, teacherId: string, draft: LessonDraft, file: File) {
  if (!teacherId || !draft.title.trim() || !draft.description.trim() || !/^[1-6]$/.test(draft.gradeLevel)) throw new Error('Kumpletuhin ang pamagat, deskripsyon, at wastong baitang.');
  const pdf = await uploadLessonPdf(client, teacherId, file);
  const { data, error } = await client.from('lessons').insert({
    teacher_id: teacherId, title: draft.title.trim(), description: draft.description.trim(),
    subject: null, grade_level: draft.gradeLevel, ...pdf, is_published: true,
  }).select('id').single();
  if (error) {
    // A confirmed database rejection cannot appear in the mobile feed. Clean up
    // that upload; keep files on ambiguous network failures for safe recovery.
    if (error.code && error.code !== 'PGRST301' && !/fetch|network/i.test(error.message)) {
      await client.storage.from(pdf.storage_bucket).remove([pdf.storage_path]).catch(() => {});
    }
    throw error;
  }
  if (!data?.id) throw new Error('Hindi makumpirma ang aralin. Buksan muli ang Lesson Library bago ulitin ang pag-upload.');
  return data.id as string;
}
