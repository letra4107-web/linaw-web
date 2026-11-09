import type { SupabaseClient } from '@supabase/supabase-js';

export interface LessonDraft { title: string; description: string; gradeLevel: string; }

export async function validateLessonPdf(file: File) {
  if (!file.size || file.size > 50 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.pdf') || await file.slice(0, 5).text() !== '%PDF-') throw new Error('Pumili ng wastong PDF na may laman at hindi lalampas sa 50 MB.');
}

export async function uploadLessonPdf(client: SupabaseClient, teacherId: string, file: File) {
  if (!teacherId) throw new Error('Mag-login muna upang magpatuloy.');
  await validateLessonPdf(file);
  const bucket = 'lesson-pdfs';
  const path = `${teacherId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const { error: uploadError } = await client.storage.from(bucket).upload(path, file, { contentType: 'application/pdf', upsert: false });
  if (uploadError) throw uploadError;
  const { data: publicUrl } = client.storage.from(bucket).getPublicUrl(path);
  return { pdf_url: publicUrl.publicUrl, legacy_public_url: publicUrl.publicUrl, storage_bucket: bucket, storage_path: path, file_name: file.name };
}

/** Keep the lessons/pdf_url contract read by the iOS lesson feed. */
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
