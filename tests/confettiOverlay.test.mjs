import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

function harness({ reducedMotion = false } = {}) {
  let effect;
  const canvases = [], shots = [], timers = new Map(), instances = [];
  const { ConfettiOverlay } = loadTs('src/components/ConfettiOverlay.tsx', {
    react: { useEffect: run => { effect = run; } },
    'canvas-confetti': { __esModule: true, default: { create: (canvas, options) => {
      const fire = options => { shots.push(options); return Promise.resolve(); };
      fire.reset = () => { canvas.resetCount = (canvas.resetCount || 0) + 1; };
      instances.push({ canvas, options }); return fire;
    } } },
  }, {
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    document: {
      createElement: () => ({ style: {}, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, remove() { this.removed = true; } }),
      body: { appendChild: canvas => canvases.push(canvas) },
    },
    setTimeout: (callback, delay) => { const id = timers.size + 1; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  return { canvases, shots, timers, instances, start: trigger => { ConfettiOverlay({ trigger }); return effect(); } };
}

test('confetti launches from both sides outside the feedback card without blocking controls', () => {
  const h = harness(); const cleanup = h.start('attempt-1');
  assert.equal(h.canvases.length, 1);
  assert.equal(h.canvases[0].style.pointerEvents, 'none');
  assert.equal(h.canvases[0].style.position, 'fixed');
  assert.equal(h.canvases[0].attributes['aria-hidden'], 'true');
  assert.deepEqual(h.shots.map(shot => shot.origin.x), [0, 1]);
  assert.equal(h.instances[0].options.disableForReducedMotion, true);
  assert.equal(h.instances[0].options.useWorker, false, 'live CSP must not require blob workers');
  for (const timer of h.timers.values()) if (timer.delay < 1000) timer.callback();
  assert.equal(h.shots.length, 9);
  assert.ok(h.shots.some(shot=>shot.shapes.includes('star')));
  assert.ok(h.shots.some(shot=>shot.origin.y<0),'finishing ribbon shower starts above the viewport');
  cleanup();
  assert.equal(h.timers.size, 0); assert.equal(h.canvases[0].removed, true); assert.equal(h.canvases[0].resetCount, 1);
});

test('repeated answers own fresh canvases and stop their previous animation', () => {
  const h = harness();
  h.start('attempt-1')();
  const cleanup = h.start('attempt-2');
  assert.equal(h.canvases.length, 2);
  assert.equal(h.canvases[0].removed, true); assert.notEqual(h.canvases[0], h.canvases[1]);
  cleanup();
});

test('confetti respects reduced motion and stays inactive on historical results', () => {
  const reduced = harness({ reducedMotion: true });
  assert.equal(reduced.start('attempt-1'), undefined); assert.equal(reduced.canvases.length, 0);
  const inactive = harness();
  assert.equal(inactive.start(null), undefined); assert.equal(inactive.canvases.length, 0);
  const zero = harness(); const cleanup = zero.start(0);
  assert.equal(zero.canvases.length, 1); cleanup();
});
