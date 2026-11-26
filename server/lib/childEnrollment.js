function normalizeChildName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isDuplicateChildEnrollment(error) {
  return error?.code === '23505' && (
    error.constraint === 'children_parent_enrollment_name_uidx' ||
    String(error.message || '').includes('children_parent_enrollment_name_uidx')
  );
}

const duplicateChildMessage = 'Student already exists';

module.exports = { normalizeChildName, isDuplicateChildEnrollment, duplicateChildMessage };
