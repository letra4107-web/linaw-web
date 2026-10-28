import fs from 'node:fs';

const configuredValues = [];
if (fs.existsSync('server/.env')) {
  for (const line of fs.readFileSync('server/.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || !/SERVICE_ROLE_KEY|API_KEY|SMTP_PASS|SMTP_USER/.test(match[1])) continue;
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (value.length >= 8) configuredValues.push(value);
  }
}
export function redactConfiguredValues(text) {
  for (const value of configuredValues) text = text.replaceAll(value, '[REDACTED]');
  return text;
}
