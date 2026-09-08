function createMaterialAccessService(client, options = {}) {
  const signedUrlsEnabled = options.signedUrlsEnabled ?? process.env.STORAGE_SIGNED_URLS_ENABLED === 'true';
  const expiresIn = options.expiresIn ?? 300;

  return {
    async accessUrl(material) {
      if (!material) return null;
      if (!signedUrlsEnabled) {
        return { url: material.file_url || material.pdf_url || material.legacy_public_url || null, expiresIn: null, mode: 'legacy-public' };
      }
      if (!material.storage_path) throw new Error('Material has no storage path.');
      const bucket = material.storage_bucket || 'reading-materials';
      const { data, error } = await client.storage.from(bucket).createSignedUrl(material.storage_path, expiresIn);
      if (error) throw error;
      return { url: data.signedUrl, expiresIn, mode: 'signed' };
    },
  };
}

module.exports = { createMaterialAccessService };
