function createAuthorizationService(repository) {
  return {
    async parentChild(parentId, childId) {
      const child = await repository.findChild(childId);
      return child && child.parent_id === parentId ? child : null;
    },
    async teacherStudent(teacherId, studentId) {
      return Boolean(await repository.findTeacherStudentLink(teacherId, studentId));
    },
    async studentAssignment(studentId, assignmentId) {
      const assignment = await repository.findAssignment(assignmentId);
      return assignment && assignment.student_id === studentId ? assignment : null;
    },
  };
}

function notificationBelongsTo(notification, userId, children = []) {
  if (!notification) return false;
  const childIds = new Set(children.map((child) => child.id));
  const childAuthUids = new Set(children.map((child) => child.auth_uid).filter(Boolean));
  return notification.user_id === userId
    || notification.parent_id === userId
    || childIds.has(notification.student_id)
    || childAuthUids.has(notification.user_id);
}

function createSupabaseAuthorizationService(client) {
  return createAuthorizationService({
    async findChild(id) {
      const { data, error } = await client.from('children').select('id, name, username, parent_id, auth_uid').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async findTeacherStudentLink(teacherId, studentId) {
      const { data, error } = await client.from('teacher_student_links').select('id').eq('teacher_id', teacherId).eq('student_id', studentId).maybeSingle();
      if (error) throw error;
      return data;
    },
    async findAssignment(id) {
      const { data, error } = await client.from('pdf_assignments').select('id, pdf_material_id, student_id').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
module.exports = { createAuthorizationService, createSupabaseAuthorizationService, notificationBelongsTo };
