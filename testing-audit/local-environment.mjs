import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import getBinaries from '../scripts/qa-tools/node_modules/embedded-postgres/dist/binary.js';

const out = process.env.QA_EVIDENCE_DIR || 'testing-audit/evidence/resolution/environment';
fs.mkdirSync(out, { recursive: true });
const rows = [];
for (const [host, port] of [['127.0.0.1', 0], ['127.0.0.1', 45432], ['::1', 0]]) {
  const server = net.createServer(socket => socket.end());
  const result = await new Promise(resolve => {
    server.once('error', error => resolve({ host, requestedPort: port, status: 'BLOCKED', code: error.code, message: error.message }));
    server.listen(port, host, () => resolve({ host, requestedPort: port, assignedPort: server.address().port, status: 'PASS' }));
  });
  if (server.listening) await new Promise(resolve => server.close(resolve));
  rows.push(result);
}
const binaries = await getBinaries();
for (const location of ['workspace', 'temporary']) {
  const parent = location === 'workspace' ? path.resolve('.qa') : path.join(os.tmpdir(), 'linawletra-disposable-qa');
  const directory = path.join(parent, `initdb-diagnostic-${randomUUID()}`);
  const passwordFile = path.join(parent, `password-${randomUUID()}`);
  fs.mkdirSync(parent, { recursive: true });
  fs.writeFileSync(passwordFile, randomBytes(32).toString('hex') + '\n', { mode: 0o600 });
  try {
    const result = spawnSync(binaries.initdb, [`--pgdata=${directory}`, '--auth=scram-sha-256', '--username=qa_owner', `--pwfile=${passwordFile}`, '--lc-messages=C'], { encoding: 'utf8', windowsHide: true, timeout: 20000 });
    rows.push({ location, operation: 'initdb', directory, exitCode: result.status, status: result.status === 0 ? 'PASS' : 'BLOCKED', stdout: result.stdout || '', stderr: result.stderr || '', error: result.error?.code });
  } finally { fs.unlinkSync(passwordFile); }
}
const result = { timestamp: new Date().toISOString(), platform: process.platform, scope: 'Loopback bind and new disposable initdb directories only; no app env, shared database or existing cluster used; no OS security setting changed.', rows };
fs.writeFileSync(`${out}/local-environment.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
