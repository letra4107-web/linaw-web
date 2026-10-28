const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { createAuthMiddleware } = require('../middleware/authCore');

for (const area of ['notifications', 'authEvents', 'tts']) {
  for (const profile of [{ role: 'parent', account_status: 'disabled' }, { role: 'teacher', account_status: 'archived' }, { role: 'student', is_active: false }, { role: 'parent', account_status: 'active', is_active: true }]) {
    test(`audit account status ${JSON.stringify(profile)} enforced by ${area}`, async () => {
      const client = {
        auth: { getUser: async () => ({ data: { user: { id: 'synthetic-inactive' } }, error: null }) },
        from(table) {
          const result = { data: table === 'users' ? profile : [], error: null };
          const chain = { select() { return chain; }, eq() { return chain; }, or() { return chain; }, order() { return chain; }, limit() { return chain; }, maybeSingle: async () => result, then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); } };
          return chain;
        },
      };
      const filename = path.resolve(__dirname, `../routes/${area}.js`), actualRequire = createRequire(filename), module = { exports: {} };
      vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, console: { error() {}, warn() {} }, process: { env: {} }, global: { fetch() { throw new Error('External synthesis must not be reached'); } },
        require(name) {
          if (name === '../config/supabase') return { supabaseAdmin: client };
          if (name === '../middleware/auth') return createAuthMiddleware(client);
          if (name === '../lib/rateLimiters') return { ttsLimiter: (_req, _res, next) => next() };
          return actualRequire(name);
        },
      }, { filename });
      const result = await new Promise((resolve, reject) => {
        const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { resolve({ status: this.statusCode, body }); } };
        module.exports.handle({ method: area === 'notifications' ? 'GET' : 'POST', url: area === 'authEvents' ? '/events' : '/', headers: { authorization: 'Bearer synthetic-token' }, body: { type: 'login', text: 'bata' } }, res, reject);
      });
      const active = profile.account_status === 'active';
      assert.equal(result.status, active ? area === 'tts' ? 500 : 200 : 403);
      if (active && area === 'tts') assert.match(result.body.error, /not configured/);
    });
  }
}
