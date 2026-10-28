import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const authShell = () => loadTs('src/components/auth/AuthShell.tsx', { '../a11y/AppIcon': {}, '../../lib/cardStyle': {} });
test('QA email validation accepts single addresses and rejects embedded or whitespace addresses', () => {
  const { isValidEmail } = authShell();
  for (const email of ['parent@example.test', 'ana+school@example.com.ph']) assert.equal(isValidEmail(email), true, email);
  for (const email of ['', 'parent', 'a@b', 'first a@b.test last', 'a@b.test c@d.test', 'a@@b.test', 'a@b.test\n', 'a b@c.test']) assert.equal(isValidEmail(email), false, JSON.stringify(email));
});

function identityHarness({ profile = { role: 'teacher', name: 'Test Teacher' }, child = null, profileError = null, childError = null, repairError = null } = {}) {
  const writes = [];
  const client = { from(table) {
    const builder = { select() { return builder; }, eq() { return builder; }, maybeSingle: async () => ({ data: table === 'users' ? profile : child, error: table === 'users' ? profileError : childError }),
      upsert: async (row) => { writes.push(row); return { error: repairError }; }, update: () => builder,
      then(resolve) { return Promise.resolve({ error: null }).then(resolve); } };
    return builder;
  } };
  const { resolveRole } = loadTs('src/lib/auth/resolveRole.ts', { '../supabaseClient': { supabase: client }, './authEvents': { recordAuthEvent: async () => {} } });
  return { resolveRole, writes };
}
const confirmed = { id: 'test-user', email: 'test@example.test', email_confirmed_at: '2026-10-17', user_metadata: { full_name: 'Test Parent' } };
test('QA role resolution never repairs over a failed authoritative profile lookup', async () => {
  const harness = identityHarness({ profile: null, profileError: new Error('offline') });
  await assert.rejects(harness.resolveRole(confirmed));
  assert.equal(harness.writes.length, 0);
});
test('QA role resolution never repairs when child identity lookup fails', async () => {
  const harness = identityHarness({ profile: null, childError: new Error('offline') });
  await assert.rejects(harness.resolveRole(confirmed));
  assert.equal(harness.writes.length, 0);
});
test('QA role resolution preserves authoritative teacher and child roles', async () => {
  assert.equal((await identityHarness().resolveRole(confirmed)).role, 'teacher');
  const harness = identityHarness({ child: { name: 'Test Learner' } });
  assert.equal((await harness.resolveRole(confirmed)).role, 'student');
  assert.equal(harness.writes.length, 0);
});
test('QA parent profile repair reports persistence failure', async () => {
  const harness = identityHarness({ profile: null, repairError: new Error('write denied') });
  await assert.rejects(harness.resolveRole(confirmed));
});
test('QA confirmed parent repair preserves signup name; unconfirmed accounts are not repaired', async () => {
  const harness = identityHarness({ profile: null });
  assert.equal((await harness.resolveRole(confirmed)).role, 'parent');
  assert.equal(harness.writes[0].name, 'Test Parent');
  const pending = identityHarness({ profile: null });
  assert.equal(await pending.resolveRole({ ...confirmed, email_confirmed_at: null }), null);
  assert.equal(pending.writes.length, 0);
});

function profileHarness(raw, writable = true) {
  const store = new Map([['linawletra.savedProfiles.v1', raw]]);
  return loadTs('src/lib/auth/savedProfiles.ts', {}, { localStorage: {
    getItem: (key) => store.get(key),
    setItem: (key, value) => { if (!writable) throw new Error('Storage denied'); store.set(key, value); },
  } });
}
const profile = (id, role = 'student') => ({ userId: id, role, displayName: 'Test', email: 'test@example.test', refreshToken: 'unit-test-ticket', savedAt: new Date().toISOString() });
test('QA saved-profile picker ignores malformed entries without crashing', () => {
  const profiles = profileHarness(JSON.stringify([null, {}, 2, profile('valid'), { ...profile('bad'), role: 'owner' }]));
  assert.deepEqual(Array.from(profiles.getSavedProfiles(), (item) => item.userId), ['valid']);
});
test('QA saved profiles enforce expiration, student replacement, and profile limit', () => {
  const expired = { ...profile('old'), savedAt: '2000-01-01T00:00:00Z' };
  const profiles = profileHarness(JSON.stringify([expired, profile('student-a'), profile('adult', 'parent')]));
  profiles.saveAuthProfile(profile('student-b'));
  assert.deepEqual(Array.from(profiles.getSavedProfiles(), (item) => item.userId), ['student-b', 'adult']);
  for (let index = 0; index < 7; index++) profiles.saveAuthProfile(profile(`adult-${index}`, 'parent'));
  assert.equal(profiles.getSavedProfiles().length, 5);
});
test('QA unavailable optional profile storage does not break login/logout', () => {
  const profiles = profileHarness('[]', false);
  assert.doesNotThrow(() => profiles.saveAuthProfile(profile('student')));
});

function signupHarness(session) {
  const state = ['Test', '', 'Parent', 'test@example.test', 'Password123', 'Password123', true];
  let cursor = 0;
  let destination;
  let writes = 0;
  const jsx = (type, props) => ({ type, props });
  const client = { auth: { signUp: async () => ({ data: { user: { id: 'test-user' }, session }, error: null }) }, from() { writes++; return { upsert: async () => ({ error: session ? null : new Error('RLS denied') }) }; } };
  const { default: SignUp } = loadTs('src/pages/auth/SignUp.tsx', {
    react: { useState(initial) { const index = cursor++; return [index < state.length ? state[index] : initial, (next) => { state[index] = next; }]; } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-router-dom': { Link: 'Link', useNavigate: () => (path) => { destination = path; } },
    '../../lib/supabaseClient': { supabase: client },
    '../../components/auth/AuthShell': { ...authShell(), AuthShell: 'AuthShell' },
    '../../lib/analytics': { trackEvent() {} },
  });
  function find(node, tag) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === tag) return node;
    return [node.props?.children].flat(Infinity).map((child) => find(child, tag)).find(Boolean);
  }
  return { submit: () => { cursor = 0; return find(SignUp(), 'form').props.onSubmit({ preventDefault() {} }); }, destination: () => destination, writes: () => writes, error: () => state[8] };
}
test('QA signup without a session reaches verification without an unauthenticated profile write', async () => {
  const harness = signupHarness(null);
  await harness.submit();
  assert.equal(harness.destination(), '/verify-email');
  assert.equal(harness.writes(), 0);
});
test('QA signup with a session persists its parent profile', async () => {
  const harness = signupHarness({ access_token: 'unit-test-token' });
  await harness.submit();
  assert.equal(harness.destination(), '/verify-email');
  assert.equal(harness.writes(), 1);
});

test('QA account switching cannot publish an older asynchronous identity', async () => {
  const state = [];
  const refs = [];
  let cursor = 0;
  let refCursor = 0;
  let onAuthChange;
  let effect;
  const outstanding = new Map();
  const react = {
    createContext: () => ({ Provider: 'Provider' }), useCallback: (fn) => fn,
    useRef(initial) { const index = refCursor++; refs[index] ??= { current: initial }; return refs[index]; },
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
    useEffect(fn) { effect = fn; },
  };
  const { AuthProvider } = loadTs('src/lib/auth/AuthContext.tsx', {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    '@tanstack/react-query': { useQueryClient: () => ({ clear() {} }) },
    '../supabaseClient': { supabase: { auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (fn) => { onAuthChange = fn; return { data: { subscription: { unsubscribe() {} } } }; },
    } } },
    './resolveRole': { resolveRole: (user) => new Promise((resolve) => outstanding.set(user.id, resolve)) },
    '../api': { api: async () => ({}) },
  });
  const render = () => { cursor = 0; refCursor = 0; return AuthProvider({ children: null }).props.value; };
  render();
  const cleanup = effect();
  await new Promise((resolve) => setImmediate(resolve));
  onAuthChange('SIGNED_IN', { user: { id: 'parent-a' } });
  onAuthChange('SIGNED_IN', { user: { id: 'teacher-b' } });
  outstanding.get('teacher-b')({ role: 'teacher', displayName: 'Test B' });
  await new Promise((resolve) => setImmediate(resolve));
  outstanding.get('parent-a')({ role: 'parent', displayName: 'Test A' });
  await new Promise((resolve) => setImmediate(resolve));
  const value = render();
  assert.equal(value.user.id, 'teacher-b');
  assert.equal(value.identity.role, 'teacher');
  assert.equal(value.loading, false);
  cleanup();
});
