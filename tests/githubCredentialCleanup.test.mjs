import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { inspectCredentials, sensitivePath } from '../testing-audit/github-credential-detector.mjs';

test('credential detector reports locations/categories without returning synthetic values', () => {
  const fixtures = [
    ['GitHub access token', 'gh' + 'p_' + 'A'.repeat(36)],
    ['Supabase secret API key', 'sb_' + 'secret_' + 'A'.repeat(32)],
    ['AWS access key identifier', 'AK' + 'IA' + 'A'.repeat(16)],
    ['Google API key', 'AI' + 'za' + 'A'.repeat(35)],
    ['Private key material', '-----BEGIN ' + 'OPENSSH PRIVATE KEY-----'],
    ['Credential-bearing connection URL', 'postgresql://' + 'user:' + 'synthetic-secret@localhost/db'],
  ];
  for (const [category, value] of fixtures) {
    const found = inspectCredentials('\n' + value);
    assert.ok(found.some((item) => item.category === category && item.line === 2), category);
    assert.ok(!JSON.stringify(found).includes(value), category);
  }
});

test('credential detector handles unknown literal assignments and safe examples', () => {
  assert.equal(inspectCredentials('CUSTOM_API_KEY="' + 'a'.repeat(40) + '"')[0]?.confidence, 'candidate; may be fixture or documentation');
  assert.deepEqual(inspectCredentials([
    'BREVO_API_KEY=', 'ELEVENLABS_API_KEY=', 'SMTP_PASS=your-smtp-password',
    'CUSTOM_API_KEY=process.env.CUSTOM_API_KEY', 'CUSTOM_TOKEN="your-token"',
    'CUSTOM_SECRET="<replace privately>"',
  ].join('\n')), []);
  assert.equal(sensitivePath('server/.env'), 'Private environment filename');
  assert.equal(sensitivePath('server/.env.example'), null);
  for (const file of ['.env.example', 'server/.env.example']) {
    assert.deepEqual(inspectCredentials(fs.readFileSync(file, 'utf8')), [], file);
  }
  assert.deepEqual(inspectCredentials(fs.readFileSync('tests/githubCredentialCleanup.test.mjs', 'utf8')), []);
  const inline = inspectCredentials('const configuration = { ' + ['password', JSON.stringify('A'.repeat(16))].join(': ') + ' };');
  assert.equal(inline[0]?.category, 'Inline password/token literal (manual review)');
  assert.deepEqual(inspectCredentials('const configuration = { password: process.env.PASSWORD };'), []);
});

test('repository ignore rules protect private files while allowing templates, source and audit evidence', () => {
  const privateFiles = ['.env', '.env.production', 'server/.env', 'nested/.env.local', '.qa/staging.env', 'config/production.env', '.envrc', '.direnv/private', 'keys/signing.pem', 'keys/private.key', 'keys/private.p12', 'keys/private.pfx', 'keys/private.jks', 'keys/private.keystore', 'keys/private.kdbx', 'nested/id_rsa', 'nested/id_ed25519', '.aws/credentials', '.ssh/config', '.npmrc', '.netrc', '.pypirc', '.git-credentials', 'config/credentials.json', 'config/service-account.json', 'config/service_account_admin.json', 'config/app-firebase-adminsdk-account.json', 'config/client-credentials.json', 'private.token', 'tokens.json', 'secrets/config.json', 'private-credentials/settings.json', 'state/terraform.tfstate', 'state/private.tfvars', 'data/export.dump', 'data/export.backup', 'data/export.sqlite', 'data/export.sqlite3', 'data/export.db', 'data/export.sql.gz', 'data/export.sql.zip', 'backups/export.sql', 'database-backups/export.sql', 'database-exports/records.csv', 'exports/records.csv'];
  const publicFiles = ['.env.example', 'server/.env.example', 'nested/.env.example', '.npmrc.example', 'src/App.tsx', 'package-lock.json', 'server/package-lock.json', 'migrations/001_initial.sql', 'testing-audit/GITHUB_CREDENTIAL_CLEANUP.md', 'testing-audit/evidence/github-cleanup/affected-commits.csv'];
  const result = spawnSync('git', ['-c', 'core.excludesFile=NUL', 'check-ignore', '--no-index', '--stdin', '-z'], { input: [...privateFiles, ...publicFiles].join('\0') + '\0', encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0);
  const ignored = new Set(result.stdout.split('\0').filter(Boolean));
  for (const file of privateFiles) assert.ok(ignored.has(file), `must ignore ${file}`);
  for (const file of publicFiles) assert.ok(!ignored.has(file), `must allow ${file}`);
});
