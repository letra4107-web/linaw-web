// Both the library and file access use the student's stored grade. Never take
// the grade from the browser when reading through the service-role client.
function createStudentLessonsService(client) {
  async function studentGrade(authUid) {
    const { data, error } = await client.from('children').select('id, grade_level').eq('auth_uid', authUid).maybeSingle();
    if (error) throw error;
    if (!data) throw Object.assign(new Error('Hindi makita ang mag-aaral.'), { status: 404 });
    return data.grade_level == null ? null : String(data.grade_level).trim();
  }

  return {
    async list(authUid) {
      const grade = await studentGrade(authUid);
      if (!grade) return [];
      const { data, error } = await client.from('lessons')
        .select('id, title, description, grade_level, file_name, created_at')
        .eq('is_published', true).eq('grade_level', grade)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async find(authUid, lessonId) {
      const grade = await studentGrade(authUid);
      if (!grade) return null;
      const { data, error } = await client.from('lessons')
        .select('id, pdf_url, storage_bucket, storage_path, legacy_public_url')
        .eq('id', lessonId).eq('is_published', true).eq('grade_level', grade).maybeSingle();
      if (error) throw error;
      return data;
    },
  };
}

module.exports = { createStudentLessonsService };
