import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

function harness({ online = true, storageDenied = false, storage = new Map() } = {}) {
  let reloads = 0;
  const { loadRoute } = loadTs('src/lib/loadRoute.ts', {}, { window: {
    navigator: { onLine: online },
    location: { reload() { reloads++; } },
    sessionStorage: {
      getItem(key) { if (storageDenied) throw new Error('Storage denied'); return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); },
    },
  } });
  return { loadRoute, storage, reloads: () => reloads };
}

test('a successful dashboard download returns its module without reloading', async () => {
  const h = harness(), module = { default: 'Dashboard' };
  assert.equal(await h.loadRoute(async () => module), module);
  assert.equal(h.reloads(), 0);
});

test('failed dashboard JS and CSS downloads recover once across page reloads', async () => {
  for (const message of [
    'Failed to fetch dynamically imported module: /assets/AdminArea-old.js',
    'error loading dynamically imported module: /assets/TeacherArea-old.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/ParentArea-old.css',
  ]) {
    const h = harness(), failure = new Error(message);
    let settled = false;
    void h.loadRoute(async () => { throw failure; }).finally(() => { settled = true; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.reloads(), 1, message);
    assert.equal(settled, false, 'keep the loading screen during navigation');
    const afterReload = harness({ storage: h.storage });
    await assert.rejects(afterReload.loadRoute(async () => { throw failure; }), error => error === failure);
    assert.equal(afterReload.reloads(), 0, 'persistent failure cannot reload indefinitely');
  }
});

test('offline, unavailable storage, and application errors retain the normal retry screen', async () => {
  for (const options of [{ online: false }, { storageDenied: true }, {}]) {
    const h = harness(options);
    const failure = new Error(Object.keys(options).length ? 'Failed to fetch dynamically imported module: /assets/StudentArea.js' : 'Cannot read properties of undefined');
    await assert.rejects(h.loadRoute(async () => { throw failure; }), error => error === failure);
    assert.equal(h.reloads(), 0);
  }
});
