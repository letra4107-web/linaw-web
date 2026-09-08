const BOOLEAN_VALUES = new Set(['true', 'false']);

function isHttpsUrl(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function validateServerConfig(env, { production = env.NODE_ENV === 'production' } = {}) {
  const issues = [];
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  if (production) required.push('CORS_ORIGIN', 'FRONTEND_URL', 'GOOGLE_TTS_API_KEY');
  for (const name of required) if (!String(env[name] || '').trim()) issues.push({ name, status: 'missing' });

  if (env.NODE_ENV && !['development', 'test', 'production'].includes(env.NODE_ENV)) issues.push({ name: 'NODE_ENV', status: 'invalid' });
  if (env.STORAGE_SIGNED_URLS_ENABLED && !BOOLEAN_VALUES.has(env.STORAGE_SIGNED_URLS_ENABLED)) issues.push({ name: 'STORAGE_SIGNED_URLS_ENABLED', status: 'invalid' });
  if (env.API_COMPATIBILITY_VERSION && !/^\d+$/.test(env.API_COMPATIBILITY_VERSION)) issues.push({ name: 'API_COMPATIBILITY_VERSION', status: 'invalid' });
  if (production) {
    const origins = String(env.CORS_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean);
    if (!origins.length || origins.some((origin) => origin === '*' || !isHttpsUrl(origin))) issues.push({ name: 'CORS_ORIGIN', status: 'invalid' });
    if (env.FRONTEND_URL && !isHttpsUrl(env.FRONTEND_URL)) issues.push({ name: 'FRONTEND_URL', status: 'invalid' });
    if (env.SUPABASE_URL && !isHttpsUrl(env.SUPABASE_URL)) issues.push({ name: 'SUPABASE_URL', status: 'invalid' });
  }
  return { valid: issues.length === 0, issues };
}

function assertServerConfig(env = process.env) {
  const result = validateServerConfig(env);
  if (!result.valid) {
    const summary = result.issues.map(({ name, status }) => `${name}:${status}`).join(', ');
    throw new Error(`Server configuration validation failed (${summary}).`);
  }
  return result;
}

module.exports = { assertServerConfig, validateServerConfig };
