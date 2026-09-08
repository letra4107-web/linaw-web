const KNOWN_BUCKETS = ['reading-materials', 'lesson-pdfs', 'teacher-uploads'];

function extractStorageLocation(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  for (const bucket of KNOWN_BUCKETS) {
    const marker = `/${bucket}/`;
    const index = value.indexOf(marker);
    if (index >= 0) {
      const rawPath = value.slice(index + marker.length).split(/[?#]/, 1)[0];
      try { return { bucket, path: decodeURIComponent(rawPath) }; } catch { return { bucket, path: rawPath }; }
    }
  }
  return null;
}

function storageReadiness(rows = []) {
  const result = { total: rows.length, withStoragePath: 0, publicUrlDependencies: 0, unparseableUrls: 0 };
  for (const row of rows) {
    if (row.storage_path) result.withStoragePath += 1;
    const legacyUrl = row.file_url || row.pdf_url || row.path;
    if (/^https:\/\//i.test(String(legacyUrl || ''))) {
      result.publicUrlDependencies += 1;
      if (!extractStorageLocation(legacyUrl)) result.unparseableUrls += 1;
    }
  }
  return result;
}

module.exports = { extractStorageLocation, storageReadiness };
