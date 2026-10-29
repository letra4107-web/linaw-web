import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

// Exercise the real provider across route changes, with only browser storage
// and React's state/effect boundary substituted. No account or service access.
function harness(saved = {}, storageBlocked = false) {
  const storage = new Map(Object.entries(saved));
  const states = [];
  const body = { dataset: {} };
  let cursor = 0;
  let pathname = '/';
  let effects = [];
  let layoutEffects = [];
  const react = {
    createContext: () => ({ Provider: 'font-provider' }),
    useContext: () => null,
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useEffect: (effect) => effects.push(effect),
    useLayoutEffect: (effect) => layoutEffects.push(effect),
  };
  const { AccessibilityProvider } = loadTs('src/lib/a11y/AccessibilityContext.tsx', {
    react,
    'react-router-dom': { useLocation: () => ({ pathname }) },
  }, {
    document: { body, documentElement: { dataset: {}, style: { setProperty() {} } } },
    localStorage: {
      getItem(key) { if (storageBlocked) throw new Error('Storage denied'); return storage.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked) throw new Error('Storage denied'); storage.set(key, value); },
    },
  });
  return {
    body,
    storage,
    render(route) {
      pathname = route;
      cursor = 0;
      effects = [];
      layoutEffects = [];
      const element = AccessibilityProvider({ children: null });
      layoutEffects.forEach((effect) => effect());
      effects.forEach((effect) => effect());
      return element.props.value;
    },
  };
}

test('Comic Sans is the default on public pages and nonstudent role routes', () => {
  const app = harness();
  for (const route of ['/', '/login', '/signup', '/teacher', '/parent', '/admin', '/student-help']) {
    assert.equal(app.render(route).font, 'comic', route);
    assert.equal(app.body.dataset.font, 'comic', route);
  }
});

test('student font changes stay in the student area and logout returns the login font to Comic Sans', () => {
  const app = harness();
  assert.equal(app.render('/student').font, 'default');
  app.render('/student').setFont('dyslexic');
  assert.equal(app.render('/student/learn').font, 'dyslexic');
  assert.equal(JSON.parse(app.storage.get('linawletra.a11y.v2')).font, 'comic');
  assert.equal(app.render('/login').font, 'comic');
  assert.equal(app.body.dataset.font, 'comic');
  assert.equal(app.render('/teacher').font, 'comic');
});

test('legacy student font values do not replace the new site default, while other preferences survive', () => {
  for (const font of ['default', 'dyslexic', 'comic']) {
    const app = harness({ 'linawletra.a11y.v1': JSON.stringify({ font, theme: 'high-contrast', fontScale: 'large', readingGuide: true }) });
    const value = app.render('/login');
    assert.equal(value.font, 'comic');
    assert.equal(value.theme, 'high-contrast');
    assert.equal(value.fontScale, 'large');
    assert.equal(value.readingGuide, true);
  }
});

test('an explicitly selected public font persists independently of the student setting', () => {
  const app = harness();
  app.render('/').setFont('dyslexic');
  assert.equal(app.render('/login').font, 'dyslexic');
  assert.equal(app.render('/student').font, 'default');
  app.render('/student').setFont('dyslexic');
  app.render('/student').setFont('default');
  assert.equal(app.render('/login').font, 'dyslexic');
  const reloaded = harness(Object.fromEntries(app.storage));
  assert.equal(reloaded.render('/').font, 'dyslexic');
});

test('missing, malformed or unavailable storage still gives the login page its Comic Sans default', () => {
  for (const app of [harness(), harness({ 'linawletra.a11y.v2': '{invalid' }), harness({}, true)]) {
    assert.equal(app.render('/login').font, 'comic');
  }
});
