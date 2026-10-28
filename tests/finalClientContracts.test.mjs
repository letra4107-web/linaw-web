import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';
import {createRequire} from 'node:module';
const {loadWordOfDay}=createRequire(import.meta.url)('../server/services/wordOfDayInitialization.js');
import { renderToStaticMarkup } from 'react-dom/server';

test('final dashboard query error feedback hides internal diagnostics and provides an accessible retry', () => {
  const { QueryErrorNotice } = loadTs('src/components/QueryErrorNotice.tsx');
  const secretDiagnostic = 'isolated internal persistence diagnostic';
  const html = renderToStaticMarkup(QueryErrorNotice({ error: new Error(secretDiagnostic), onRetry() {} }));
  assert.match(html, /role="alert"/); assert.match(html, /Subukan muli/);
  assert.ok(!html.includes(secretDiagnostic));
  assert.equal(QueryErrorNotice({ error: null, onRetry() {} }), null);
});

function apiHarness(responses, session = { access_token: 'isolated-client-session' }) {
  const calls = [], warnings = [];
  const { api } = loadTs('src/lib/api.ts', { './supabaseClient': { supabase: { auth: { getSession: async () => ({ data: { session } }) } } } }, {
    __qaEnv: { VITE_API_URL: 'http://127.0.0.1:9/api', VITE_API_COMPATIBILITY_VERSION: '3' },
    fetch: async (url, options) => { calls.push({ url, options }); return responses.shift(); },
    console: { warn: (...args) => warnings.push(args) },
  }, { transformSource: (source) => source.replaceAll('import.meta.env', '__qaEnv') });
  return { api, calls, warnings };
}
function response(body, { status = 200, version = '3', json = true } = {}) {
  return { ok: status < 400, status, headers: { get: (name) => name === 'content-type' ? json ? 'application/json' : 'text/plain' : name === 'x-api-compatibility-version' ? version : null }, json: async () => body, text: async () => body };
}
test('final frontend API adds the authenticated session and preserves JSON request/response contracts', async () => {
  const h = apiHarness([response({ success: true })]);
  assert.equal((await h.api('/student/practice/attempt', { auth: true, method: 'POST', body: { transcript: 'bata' } })).success, true);
  assert.equal(h.calls[0].options.headers.Authorization, 'Bearer isolated-client-session');
  assert.equal(h.calls[0].options.method, 'POST');
  assert.equal(JSON.parse(h.calls[0].options.body).transcript, 'bata');
});
test('final frontend API handles expired/missing sessions without inventing an auth header', async () => {
  const h = apiHarness([response({ error: 'Authentication required' }, { status: 401 })], null);
  await assert.rejects(h.api('/parent/children', { auth: true }), /Authentication required/);
  assert.equal(h.calls[0].options.headers.Authorization, undefined);
});
test('final frontend API distinguishes JSON service failures and non-JSON gateway failures', async () => {
  const h = apiHarness([response({ error: 'Isolated unavailable', detail: 'Retry later' }, { status: 503 }), response('Unavailable', { status: 502, json: false })]);
  await assert.rejects(h.api('/admin/users'), /Isolated unavailable \(Retry later\)/);
  await assert.rejects(h.api('/admin/users'), /Request failed \(502\)/);
});
test('final frontend API warns once for version drift and handles non-JSON success', async () => {
  const h = apiHarness([response('ready', { version: null, json: false }), response({ ok: true }, { version: '2' })]);
  assert.equal(await h.api('/health'), 'ready'); await h.api('/health');
  assert.equal(h.warnings.length, 1);
});

function dailyHarness({ existing = null, words = [{ id: 'one', content_text: 'bata' }], inserted = null, errorAt = null, competing = null } = {}) {
  const calls = []; let logReads = 0;
  const supabase = { rpc:async()=>({data:{effective_level:'Intermediate'},error:null}),from(table) {
    const methods = [], filters = [];
    let builder;
    const execute = () => {
      calls.push({ table, methods: [...methods], filters: [...filters] });
      if (errorAt === table) return { data: null, error: new Error('Isolated query unavailable') };
      if (table === 'reading_content') return { data: words, error: null };
      if (methods.some(([name]) => name === 'upsert')) return { data: inserted, error: null };
      return { data: logReads++ === 0 ? existing : competing, error: null };
    };
    builder = new Proxy({}, { get(_target, key) {
      if (key === 'then') return (resolve, reject) => Promise.resolve(execute()).then(resolve, reject);
      if (key === 'maybeSingle') return async () => execute();
      return (...args) => { methods.push([key, ...args]); if (key === 'eq') filters.push(args); return builder; };
    } }); return builder;
  } };
  return {...loadTs('src/lib/wordOfDay.ts',{'./api':{api:async(path,options)=>{assert.equal(path,'/student/word-of-day');assert.equal(options.auth,true);return {success:true,log:await loadWordOfDay(supabase,'child')};}}}),calls};
}
test('final frontend Word of Day dates change exactly at Manila midnight', () => {
  const h = dailyHarness();
  assert.equal(h.getAsiaManilaDate(new Date('2026-10-20T15:59:59Z')), '2026-10-20');
  assert.equal(h.getAsiaManilaDate(new Date('2026-10-20T16:00:00Z')), '2026-10-21');
});
test('final frontend Word of Day reuses a completed row without resetting attempts or writing', async () => {
  const existing = { id: 'log', attempts: 3, completed_at: '2026-10-21T00:00:00Z' };
  const h = dailyHarness({ existing });
  assert.equal(await h.getOrCreateWordOfDay('child', 'Beginner'), existing);
  assert.equal(h.calls.length, 1);
});
test('final frontend Word of Day handles empty content and invalid reading levels without insertion', async () => {
  const h = dailyHarness({ words: [] }); assert.equal(await h.getOrCreateWordOfDay('child', 'Beginner'), null);
  assert.ok(h.calls.every((call) => !call.methods.some(([name]) => name === 'upsert')));
  const ignoredHint=dailyHarness({words:[]});assert.equal(await ignoredHint.getOrCreateWordOfDay('child','Unknown'),null);assert.ok(ignoredHint.calls.find(c=>c.table==='reading_content').filters.some(([key,value])=>key==='level'&&value==='Intermediate')); 
});
test('final frontend Word of Day uses only published level-appropriate content and preserves a concurrent insert', async () => {
  const competing = { id: 'other', word: 'bata', attempts: 1 };
  const h = dailyHarness({ competing });
  assert.equal(await h.getOrCreateWordOfDay('child', 'Intermediate'), competing);
  const content = h.calls.find((call) => call.table === 'reading_content');
  assert.ok(content.filters.some(([key, value]) => key === 'is_active' && value === true));
  assert.ok(content.filters.some(([key, value]) => key === 'level' && value === 'Intermediate'));
  const insert = h.calls.find((call) => call.methods.some(([name]) => name === 'upsert')).methods.find(([name]) => name === 'upsert');
  assert.equal(insert[2].ignoreDuplicates, true);
  assert.equal(insert[2].onConflict, 'child_id,date');
});
test('final frontend Word of Day propagates query errors and never reports a fabricated word', async () => {
  for (const errorAt of ['word_of_day_log', 'reading_content']) await assert.rejects(dailyHarness({ errorAt }).getOrCreateWordOfDay('child', 'Beginner'), /Isolated query unavailable/);
});
