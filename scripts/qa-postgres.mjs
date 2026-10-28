import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createServer } from 'node:net';
import { randomBytes, randomUUID } from 'node:crypto';
import EmbeddedPostgres from './qa-tools/node_modules/embedded-postgres/dist/index.js';

export async function startDisposablePostgres() {
  const scratchRoot = process.env.QA_POSTGRES_USE_TEMP === 'true' ? path.join(os.tmpdir(), 'linawletra-disposable-qa') : path.resolve('.qa');
  const directory = path.join(scratchRoot, `postgres-${randomUUID()}`);
  if (!directory.startsWith(scratchRoot + path.sep)) throw new Error('Unsafe local database path.');
  const reservation = createServer();
  await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const cluster = new EmbeddedPostgres({ databaseDir: directory, user: 'qa_owner', password: randomBytes(32).toString('hex'), port, persistent: true, createPostgresUser: false, initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1', '-c', 'max_connections=30'], onLog() {}, onError() {} });
  let client;
  try {
    await cluster.initialise();
    await cluster.start();
    // Match the server's IPv4-only listener. The dependency defaults to
    // localhost, which can resolve to ::1 on Windows.
    const maintenance = cluster.getPgClient('postgres', '127.0.0.1');
    try { await maintenance.connect(); await maintenance.query('CREATE DATABASE linawletra_qa'); }
    finally { await maintenance.end(); }
    client = cluster.getPgClient('linawletra_qa', '127.0.0.1');
    await client.connect();
    const result = await client.query('select current_database() as database, version() as version');
    if (result.rows[0].database !== 'linawletra_qa') throw new Error('Local test database identity mismatch.');
    fs.mkdirSync('docs/qa/evidence/phase2', { recursive: true });
    return { cluster, client, directory, version: result.rows[0].version, connection: { host: '127.0.0.1', port, database: 'linawletra_qa', user: cluster.options.user, password: cluster.options.password }, async stop() { await client.end(); await cluster.stop(); } };
  } catch (error) {
    if (client) await client.end().catch(() => {});
    await cluster.stop().catch(() => {});
    throw error;
  }
}
