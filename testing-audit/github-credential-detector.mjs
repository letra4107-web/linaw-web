import { classify } from './credential-classifier.mjs';

// Values are examined only in memory. Returned records never contain matches.
export function inspectCredentials(source) {
  const findings = [];
  const patterns = [
    ['Private key material', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
    ['Supabase secret API key', /\bsb_secret_[A-Za-z0-9_-]{20,}/],
    ['GitHub access token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],
    ['AWS access key identifier', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
    ['Google API key', /\bAIza[A-Za-z0-9_-]{35}\b/],
    ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}/],
    ['Stripe secret/restricted key', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}/],
    ['SendGrid API key', /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{30,}/],
    ['Credential-bearing connection URL', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|https?):\/\/[^\s/@:"'`]+:[^\s/@"'`]{4,}@/i],
  ];
  for (const [offset, line] of source.split(/\r?\n/).entries()) {
    const categories = new Set(classify(line));
    for (const [category, expression] of patterns) if (expression.test(line)) categories.add(category);
    for (const category of categories) findings.push({ category, line: offset + 1, confidence: 'credential-shaped literal; validity untested' });
    const inline = /\b(?:password|passwd|pwd|secret|api_?key|access_?token|client_?secret|private_?key|service_role_key)\s*[:=]\s*(["'])([^"'\r\n]{8,})\1/gi;
    for (const match of line.matchAll(inline)) {
      if (categories.size || /^(?:your[-_ ]|replace[-_ ]|<|\$|example|test[-_]|synthetic[-_]|isolated[-_]|process\.|env\.)/i.test(match[2])) continue;
      findings.push({ category: 'Inline password/token literal (manual review)', line: offset + 1, confidence: 'candidate; may be fixture or documentation' });
    }
    // Catch unknown providers in simple configuration literals without treating
    // process.env references or ordinary identifiers as actual credentials.
    const assignment = line.match(/^\s*["']?([A-Z][A-Z0-9_]*(?:SECRET|PASSWORD|PASS|TOKEN|PRIVATE_KEY|API_KEY|ACCESS_KEY_ID|ACCESS_KEY)[A-Z0-9_]*)["']?\s*[:=]\s*(.*?)\s*,?\s*$/i);
    if (!assignment || categories.size) continue;
    const raw = assignment[2];
    const quoted = raw.match(/^(["'])([^"'\r\n]*)\1\s*,?$/);
    if (!quoted && !/^[ \t]*[A-Z][A-Z0-9_]*[ \t]*=/.test(line)) continue;
    const value = (quoted ? quoted[2] : raw).trim();
    if (value.length < 8 || /^(?:your[-_ ]|replace[-_ ]|<|\$|example|test[-_]|synthetic[-_]|isolated[-_]|process\.|import\.|env\.|config\.|undefined|null|false|true)/i.test(value)) continue;
    if (!quoted && !/^[A-Za-z0-9_+/.=-]+$/.test(value)) continue;
    if (/^(?:string|boolean|number|optional|placeholder)$/i.test(value)) continue;
    findings.push({ category: 'Sensitive configuration literal (manual review)', line: offset + 1, confidence: 'candidate; may be fixture or documentation' });
  }
  return findings;
}

export function sensitivePath(file) {
  const base = file.split('/').at(-1);
  if (/^\.env(?:\..*)?$/.test(base) && base !== '.env.example') return 'Private environment filename';
  if (/\.(?:pem|key|p12|pfx|jks|keystore|kdbx)$/i.test(base) || /^(?:id_rsa|id_ed25519|\.git-credentials|\.netrc|\.pypirc|\.npmrc)$/.test(base)) return 'Key or credential configuration filename';
  if (/(?:service[-_]account|firebase-adminsdk|^credentials).*\.json$/i.test(base)) return 'Service-account or credentials filename';
  if (/\.(?:dump|backup|sqlite3?|db|sql\.(?:gz|zip))$/i.test(base)) return 'Database/export filename';
  if (/(?:^|\/)(?:backups?|database-exports|exports)(?:\/|$)/i.test(file)) return 'Backup/export directory';
  return null;
}
