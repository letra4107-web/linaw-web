function assertStagingTargets(targets, { allowedSupabaseHost = '' } = {}) {
  for (const [name, value] of Object.entries(targets)) {
    let url;
    try { url = new URL(value); } catch { throw new Error(`${name} requires a valid staging URL.`); }
    const host = url.hostname.toLowerCase();
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(host);
    const staging = /(^|[.-])staging([.-]|$)/.test(host);
    const explicitSupabase = name === 'supabase' && allowedSupabaseHost && host === allowedSupabaseHost.toLowerCase();
    if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)
      || (!local && url.protocol !== 'https:') || /(^|\.)linawletra\.com$|linawletra-production/.test(host)
      || (!local && !staging && !explicitSupabase)) {
      throw new Error(`${name} target must independently identify an approved staging or local host.`);
    }
  }
}
module.exports = { assertStagingTargets };
