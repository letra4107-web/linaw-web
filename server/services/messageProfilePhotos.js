function photoUrl(value) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

function createMessageProfilePhotoService(client) {
  async function contactIds(userId, role) {
    const ids = new Set();
    // Deduplicate repeated messages while preserving contacts beyond PostgREST's row cap.
    for (let offset = 0; ; offset += 500) {
      const query = role === 'teacher'
        ? client.from('teacher_student_links').select('id, children(parent_id)').eq('teacher_id', userId)
        : client.from('teacher_messages').select('id, teacher_id').eq('parent_id', userId);
      const { data, error } = await query.order('id').range(offset, offset + 499);
      if (error) throw error;
      for (const row of data || []) {
        const id = role === 'teacher' ? row.children?.parent_id : row.teacher_id;
        if (id) ids.add(id);
      }
      if ((data || []).length < 500) return [...ids];
    }
  }

  return {
    async load(userId, role) {
      if (!userId || !['parent', 'teacher'].includes(role)) throw new Error('Unsupported message profile scope.');
      const ids = await contactIds(userId, role);
      const [table, key] = role === 'parent' ? ['teacher_profiles', 'user_id'] : ['parents', 'auth_uid'];
      const allowed = new Set(ids), avatars = {};
      for (let offset = 0; offset < ids.length; offset += 100) {
        const { data, error } = await client.from(table).select(`${key}, avatar_url`).in(key, ids.slice(offset, offset + 100));
        if (error) throw error;
        for (const row of data || []) if (allowed.has(row[key])) avatars[row[key]] = photoUrl(row.avatar_url);
      }
      const [ownTable, ownKey] = role === 'parent' ? ['parents', 'auth_uid'] : ['teacher_profiles', 'user_id'];
      const { data, error } = await client.from(ownTable).select('avatar_url').eq(ownKey, userId).maybeSingle();
      if (error) throw error;
      return { avatars, ownAvatarUrl: photoUrl(data?.avatar_url) };
    },
  };
}

module.exports = { createMessageProfilePhotoService };
