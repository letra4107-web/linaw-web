import type { SupabaseClient } from '@supabase/supabase-js';
import { updateOwnedLesson, type LessonChanges } from './manage';
import { uploadLessonPdf } from './upload';

export type LessonPdfChange = { kind: 'keep' } | { kind: 'replace'; file: File } | { kind: 'remove' };
export interface LessonPdfReference { pdf_url: string | null; storage_bucket?: string | null; storage_path?: string | null; }
const cleanupWarning = 'Na-save ang aralin, ngunit hindi makumpirma ang pagtanggal ng lumang PDF.';

function ownedPath(previous: LessonPdfReference, teacherId: string): string | null {
  let path = previous.storage_bucket === 'lesson-pdfs' ? previous.storage_path : null;
  if (!path && previous.pdf_url) {
    try {
      const match = new URL(previous.pdf_url).pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/lesson-pdfs\/(.+)$/);
      if (match) path = decodeURIComponent(match[1]);
    } catch { return null; }
  }
  return path?.startsWith(`${teacherId}/`) && path.split('/').every(part => part && part !== '.' && part !== '..') ? path : null;
}

export async function saveOwnedLessonEdit(client: SupabaseClient, teacherId: string | undefined, id: string, values: LessonChanges, previous: LessonPdfReference, change: LessonPdfChange) {
  if (!teacherId) throw new Error('Mag-login muna upang magpatuloy.');
  if (change.kind === 'keep') {
    await updateOwnedLesson(client, teacherId, id, values);
    return { warning: '' };
  }
  const uploaded = change.kind === 'replace' ? await uploadLessonPdf(client, teacherId, change.file) : null;
  const attachment = uploaded || { pdf_url: null, legacy_public_url: null, storage_bucket: null, storage_path: null, file_name: null, is_published: false };
  let definitelyUncommitted = false;
  try {
    let query = client.from('lessons').update({ ...values, ...attachment }).eq('id', id).eq('teacher_id', teacherId);
    // Do not overwrite or delete a newer PDF saved in another tab.
    query = previous.pdf_url == null ? query.is('pdf_url', null) : query.eq('pdf_url', previous.pdf_url);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) {
      definitelyUncommitted = /^(?:22|23|40|42|P0|XX)[0-9A-Z]{3}$/.test(error.code || '') || ['PGRST204', 'PGRST205'].includes(error.code);
      throw error;
    }
    if (data?.id !== id) {
      definitelyUncommitted = true;
      throw new Error('Nagbago na ang aralin o hindi ito ma-edit. I-refresh ang Lesson Library at subukan muli.');
    }
  } catch (error) {
    // Preserve both files after an ambiguous connection failure: the database
    // may already point at the new upload even though its response was lost.
    if (uploaded && definitelyUncommitted) {
      try { await client.storage.from('lesson-pdfs').remove([uploaded.storage_path]); } catch { /* Safe orphan; original lesson remains. */ }
    }
    throw error;
  }
  const path = ownedPath(previous, teacherId);
  if (path && path !== uploaded?.storage_path) {
    try {
      const { data, error } = await client.storage.from('lesson-pdfs').remove([path]);
      if (error || !data?.some(file => file.name === path)) return { warning: cleanupWarning };
    } catch { return { warning: cleanupWarning }; }
  }
  return { warning: '' };
}
