// Actual Express routers and role middleware; persistence is an explicit fake.
// These cases prove pre-persistence access/parameter checks, not Supabase RLS.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const express = require('express');
const { EventEmitter } = require('node:events');
const { createAuthMiddleware } = require('../middleware/authCore');
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:9';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-audit-key';
const app = express(); app.use(express.json());
const routers = new Map();
const endpoints = [];
for (const area of ['admin', 'teacher', 'parent', 'student']) {
  let currentRole;
  const client = {
    auth: { getUser: async token => { currentRole = token; return { data: { user: { id: token } }, error: null }; } },
    from(table) {
      assert.equal(table, 'users', 'Preflight request must never query application data');
      const chain = { select() { return chain; }, eq() { return chain; }, maybeSingle: async () => ({ data: { role: currentRole, account_status: 'active', is_active: true }, error: null }) };
      return chain;
    },
  };
  const filename = path.resolve(__dirname, `../routes/${area}.js`);
  const source = fs.readFileSync(filename, 'utf8'), actualRequire = createRequire(filename), module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, console: { error() {}, warn() {} },
    require(name) {
      if (name === '../config/supabase') return { supabaseAdmin: client };
      if (name === '../middleware/auth') return createAuthMiddleware(client);
      if (name === '../config/mailer') return { sendMail: async () => { throw new Error('Mail must not be reached'); } };
      return actualRequire(name);
    },
  }, { filename });
  app.use(`/api/${area}`, module.exports);
  routers.set(area, module.exports);
  for (const match of source.matchAll(/router\.(get|post|put|patch|delete)\('([^']+)'/g)) {
    const [whole, verb, route] = match;
    const tail = source.slice(match.index + whole.length, source.indexOf('\n', match.index));
    endpoints.push({ area, verb, route, validatesId: tail.includes('validateUuidParam(') });
  }
}
async function request(endpoint, role, badId = false) {
  const route = endpoint.route.replace(/:[A-Za-z]+/g, badId ? 'invalid-id' : '11111111-1111-4111-8111-111111111111');
  // Invoke the real router with an in-process transport. An earlier HTTP run
  // is retained separately: this machine intermittently denies loopback fetch.
  return new Promise((resolve, reject) => {
    const headers = new Map();
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
      setHeader(key, value) { headers.set(key.toLowerCase(), value); },
      getHeader(key) { return headers.get(key.toLowerCase()); },
      status(value) { this.statusCode = value; return this; },
      json(body) { resolve({ status: this.statusCode, body }); return this; },
    });
    const req = { method: endpoint.verb.toUpperCase(), url: route, originalUrl: route, headers: { authorization: `Bearer ${role}` }, body: {}, query: {}, ip: '127.0.0.1', app };
    routers.get(endpoint.area).handle(req, response, error => reject(error || new Error('Unexpected end of router')));
  });
}
for (const endpoint of endpoints) {
  const allowed = endpoint.area === 'teacher' ? ['teacher', 'admin'] : [endpoint.area];
  for (const role of ['admin', 'teacher', 'parent', 'student'].filter(role => !allowed.includes(role))) {
    test(`audit role matrix ${role} forbidden ${endpoint.verb.toUpperCase()} /api/${endpoint.area}${endpoint.route}`, async () => {
      assert.equal((await request(endpoint, role)).status, 403);
    });
  }
  if (endpoint.validatesId && endpoint.route.includes(':')) {
    test(`audit parameter matrix ${endpoint.verb.toUpperCase()} /api/${endpoint.area}${endpoint.route} rejects invalid UUID`, async () => {
      const result = await request(endpoint, endpoint.area, true);
      assert.equal(result.status, 400);
      assert.match(result.body.error, /Invalid/);
    });
  }
}
