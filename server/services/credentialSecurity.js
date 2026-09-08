function credentialStatus(row) {
  if (!row) return 'missing';
  if (row.plain_password != null) return row.password_rotated_at ? 'rotated_pending' : 'legacy';
  if (row.plaintext_retired_at) return 'fully_retired';
  return 'secure';
}

function summarizeCredentialSecurity(totalStudents, rows = []) {
  const counts = { legacy: 0, rotatedPending: 0, secure: 0, fullyRetired: 0, missing: 0 };
  for (const row of rows) {
    const status = credentialStatus(row);
    if (status === 'rotated_pending') counts.rotatedPending += 1;
    else if (status === 'fully_retired') counts.fullyRetired += 1;
    else counts[status] += 1;
  }
  counts.missing = Math.max(0, Number(totalStudents || 0) - rows.length);
  return { totalStudents: Number(totalStudents || 0), ...counts, requiresRotation: counts.legacy + counts.rotatedPending };
}

function safeCredentialStatus(row) {
  const status = credentialStatus(row);
  return { status, requiresRotation: status === 'legacy' || status === 'rotated_pending' };
}

module.exports = { credentialStatus, safeCredentialStatus, summarizeCredentialSecurity };
