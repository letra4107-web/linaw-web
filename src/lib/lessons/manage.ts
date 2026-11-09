import type { SupabaseClient } from '@supabase/supabase-js';

export type LessonChanges = { title?: string; description?: string; grade_level?: string; is_published?: boolean };

const unconfirmed = 'Hindi nakumpirma ang pagbabago sa aralin. I-refresh ang Lesson Library at subukan muli.';

export async function updateOwnedLesson(client: SupabaseClient, teacherId: string | undefined, id: string, values: LessonChanges) {
  if (!teacherId) throw new Error('Mag-login muna upang magpatuloy.');
  const { data, error } = await client.from('lessons').update(values)
    .eq('id', id).eq('teacher_id', teacherId).select('id').maybeSingle();
  if (error) throw error;
  if (data?.id !== id) throw new Error(unconfirmed);
}

export async function deleteOwnedLesson(client: SupabaseClient, teacherId: string | undefined, id: string) {
  if (!teacherId) throw new Error('Mag-login muna upang magpatuloy.');
  const { data, error } = await client.from('lessons').delete()
    .eq('id', id).eq('teacher_id', teacherId).select('id').maybeSingle();
  if (error) throw error;
  if (data?.id !== id) throw new Error(unconfirmed);
}
