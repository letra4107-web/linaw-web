import { createRoleModel, ids } from './roleModel.mjs';

const model = createRoleModel(globalThis.__LINAW_QA_ROLE__ || 'parent', globalThis.__LINAW_QA_VARIANT__ || 'populated');
globalThis.__LINAW_QA_MODEL__ = model;
let session = { access_token: 'isolated-browser-session', refresh_token: 'isolated-refresh-ticket', user: { id: ids[model.role], email: `qa-${model.role}@example.invalid`, email_confirmed_at: model.timestamp, user_metadata: { full_name: `QA ${model.role}` } } };
const subscribers = new Set();
function from(table) {
  const filters = [], q = { table, method: 'select', values: null, one: false, countOnly: false, start: 0, end: Infinity };
  let proxy;
  async function execute() {
    model.calls.push({ kind: 'database-model', table, method: q.method, filters, values: q.values });
    if (!Object.hasOwn(model.tables, table)) { model.unexpected.push({ table }); return { data: null, error: { message: `Unknown isolated table ${table}` } }; }
    if (model.variant === 'error' && !['users', 'children'].includes(table)) return { data: null, error: { message: 'Isolated persistence unavailable' } };
    let rows = model.tables[table].filter((row) => filters.every(([key, value, op]) => op === 'in' ? value.includes(row[key]) : op === 'neq' ? row[key] !== value : op === 'eq' ? row[key] === value : true));
    if (['insert', 'upsert'].includes(q.method)) { rows = Array.isArray(q.values) ? q.values : [q.values]; for (const row of rows) model.tables[table].push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row }); }
    if (q.method === 'update') rows.forEach((row) => Object.assign(row, q.values));
    if (q.method === 'delete') model.tables[table] = model.tables[table].filter((row) => !rows.includes(row));
    rows = rows.slice(q.start, q.end === Infinity ? undefined : q.end + 1);
    return { data: q.countOnly ? null : q.one ? rows[0] || null : rows, error: null, count: rows.length };
  }
  const methods = {
    select(_fields, options = {}) { q.countOnly = options.head === true; return proxy; },
    eq(key, value) { filters.push([key, value, 'eq']); return proxy; },
    neq(key, value) { filters.push([key, value, 'neq']); return proxy; },
    in(key, values) { filters.push([key, values, 'in']); return proxy; },
    is(key, value) { filters.push([key, value, 'eq']); return proxy; },
    insert(values) { q.method = 'insert'; q.values = values; return proxy; },
    upsert(values) { q.method = 'upsert'; q.values = values; return proxy; },
    update(values) { q.method = 'update'; q.values = values; return proxy; },
    delete() { q.method = 'delete'; return proxy; },
    range(start, end) { q.start = start; q.end = end; return proxy; },
    limit(count) { q.end = count - 1; return proxy; },
    single() { q.one = true; return execute(); }, maybeSingle() { q.one = true; return execute(); },
    order() { return proxy; }, gte() { return proxy; }, lte() { return proxy; }, gt() { return proxy; }, lt() { return proxy; }, not() { return proxy; }, or() { return proxy; }, ilike() { return proxy; }, contains() { return proxy; },
    then(resolve, reject) { return execute().then(resolve, reject); },
  };
  proxy = new Proxy(methods, { get(target, key) { if (key in target) return target[key]; if (typeof key === 'symbol') return undefined; throw new Error(`Unsupported model query method ${String(key)}`); } });
  return proxy;
}
const channel = () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} });
export const supabase = {
  from, channel, removeChannel: async () => {},
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user: session?.user || null }, error: null }),
    onAuthStateChange(callback) { subscribers.add(callback); return { data: { subscription: { unsubscribe: () => subscribers.delete(callback) } } }; },
    signOut: async () => { session = null; subscribers.forEach((callback) => callback('SIGNED_OUT', null)); return { error: null }; },
    signInWithPassword: async () => ({ data: { session, user: session?.user }, error: null }),
    updateUser: async () => ({ data: { user: session?.user }, error: null }),
    mfa: { listFactors: async () => ({ data: { all: [], totp: [], phone: [] }, error: null }) },
  },
  storage: { from: () => ({ upload: async (path) => ({ data: { path }, error: null }), remove: async () => ({ data: [], error: null }), getPublicUrl: () => ({ data: { publicUrl: `${location.origin}/favicon.jpg` } }), createSignedUrl: async () => ({ data: { signedUrl: `${location.origin}/favicon.jpg` }, error: null }) }) },
};
