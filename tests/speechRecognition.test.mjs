import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

function harness({ unsupported = false, constructorThrows = false, startThrows = false, stopThrows = false } = {}) {
  let now = 0, nextId = 0;
  const timers = new Map(), instances = [], results = [], errors = [];
  class Recognition {
    constructor() { if (constructorThrows) throw new Error('constructor failed'); this.stops = 0; this.aborts = 0; instances.push(this); }
    start() { if (startThrows) throw new Error('start failed'); }
    stop() { this.stops++; if (stopThrows) throw new Error('stop failed'); }
    abort() { this.aborts++; }
    result(...segments) { this.onresult?.({ results: segments.map(({ text, final = true, alternatives }) => Object.assign(alternatives || [{ transcript: text, confidence: 0.8 }], { isFinal: final })) }); }
    end() { this.onend?.(); }
    error(code) { this.onerror?.({ error: code }); }
  }
  const speech = loadTs('src/lib/speech.ts', {}, {
    window: unsupported ? {} : { SpeechRecognition: Recognition },
    setTimeout: (fn, delay) => { const id = ++nextId; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  return { ...speech, instances, results, errors, timers,
    start(options) { return speech.listenOnce('fil-PH', result => results.push(result), message => errors.push(message), options); },
    advance(ms) {
      const end = now + ms;
      for (let iterations = 0; iterations < 1000; iterations++) {
        const first = [...timers].sort((a,b) => a[1].at - b[1].at)[0];
        if (!first || first[1].at > end) break;
        now = first[1].at; timers.delete(first[0]); first[1].fn();
      }
      now = end;
    },
  };
}
test('unsupported recognition and constructor/start failures release the caller immediately', () => {
  for (const options of [{ unsupported: true }, { constructorThrows: true }, { startThrows: true }]) {
    const h = harness(options); const stop = h.start(); stop(); stop.cancel();
    assert.equal(h.errors.length, 1); assert.equal(h.results.length, 0); assert.equal(h.timers.size, 0);
  }
});
test('a silent end event clears listening without grading a missing answer', () => {
  const h = harness(); h.start(); h.instances[0].end();
  assert.equal(h.errors.length, 1); assert.match(h.errors[0], /Walang narinig/);
  assert.equal(h.results.length, 0); assert.equal(h.timers.size, 0);
});
test('a browser that emits no events times out and releases its microphone', () => {
  const h = harness(); h.start(); h.advance(15000);
  assert.equal(h.errors.length, 1); assert.equal(h.instances[0].aborts, 1); assert.equal(h.timers.size, 0);
  h.advance(180000); assert.equal(h.errors.length, 1);
});
test('one final word selects the strongest alternative and settles exactly once', () => {
  const h = harness(); h.start(); const recognition = h.instances[0]; const late = recognition.onresult;
  recognition.result({ alternatives: [{ transcript: 'pata', confidence: 0.2 }, { transcript: 'bata', confidence: 0.9 }] });
  assert.equal(h.results[0].transcript, 'bata'); assert.equal(h.results[0].confidence, 0.9);
  late({ results: [] }); recognition.end(); recognition.error('network');
  assert.equal(h.results.length, 1); assert.equal(h.errors.length, 0); assert.equal(h.timers.size, 0);
});
test('recognition errors cannot be followed by a stale transcript submission', () => {
  const h = harness(); h.start(); const recognition = h.instances[0], late = recognition.onresult;
  recognition.error('network'); late({ results: [Object.assign([{ transcript: 'bata' }], { isFinal: true })] }); recognition.end();
  assert.equal(h.errors.length, 1); assert.match(h.errors[0], /koneksyon/); assert.equal(h.results.length, 0);
});
test('speech end waits for the browser final result instead of leaving listening active', () => {
  const h = harness(); h.start(); const recognition = h.instances[0]; recognition.onspeechend();
  assert.equal(recognition.stops, 1); assert.equal(h.errors.length, 0);
  recognition.result({ text: 'bata' }); assert.equal(h.results.length, 1); assert.equal(h.timers.size, 0);
});
test('manual stop recovers when the browser never sends another event', () => {
  const h = harness(); const stop = h.start(); stop(); stop(); h.advance(1500);
  assert.equal(h.instances[0].stops, 1); assert.equal(h.errors.length, 1); assert.equal(h.timers.size, 0);
});
test('a thrown native stop still releases the UI', () => {
  const h = harness({ stopThrows: true }); h.start()();
  assert.equal(h.errors.length, 1); assert.equal(h.timers.size, 0);
});
test('long readings collect all final segments before a manual stop', () => {
  const h = harness(); const stop = h.start({ continuous: true }); const recognition = h.instances[0];
  assert.equal(recognition.continuous, true); assert.equal(recognition.interimResults, true);
  recognition.result({ text: 'Maagang gumising si Ana.' });
  recognition.result({ text: 'Maagang gumising si Ana.' }, { text: 'Tinulungan niya ang ina.' });
  assert.equal(h.results.length, 0);
  stop(); recognition.end();
  assert.equal(h.results[0].transcript, 'Maagang gumising si Ana. Tinulungan niya ang ina.');
  assert.equal(h.results.length, 1); assert.equal(h.timers.size, 0);
});
test('repeated cumulative events do not duplicate an Intermediate phrase', () => {
  const h = harness(); h.start({ continuous: true }); const recognition = h.instances[0];
  for (let i=0;i<3;i++) recognition.result({ text: 'Ang bata ay' }, { text: 'masayang nagbabasa.' });
  recognition.end(); assert.equal(h.results[0].transcript, 'Ang bata ay masayang nagbabasa.');
});
test('a final result arriving after stop is included before end', () => {
  const h = harness(); const stop = h.start({ continuous: true }); const recognition = h.instances[0];
  recognition.result({ text: 'Ang bata' }, { text: 'ay nagbabasa', final: false });
  stop(); recognition.result({ text: 'Ang bata' }, { text: 'ay nagbabasa.' }); recognition.end();
  assert.equal(h.results[0].transcript, 'Ang bata ay nagbabasa.'); assert.equal(h.errors.length, 0);
});
test('an unfinished interim transcript is retried instead of being graded as a wrong answer', () => {
  for (const withFinal of [false,true]) {
    const h = harness(); h.start({ continuous: true }); const recognition = h.instances[0];
    recognition.result(...(withFinal ? [{ text: 'Ang bata' }] : []), { text: 'ay nagba', final: false }); recognition.end();
    assert.equal(h.results.length, 0); assert.equal(h.errors.length, 1); assert.match(h.errors[0], /Hindi nakumpleto/);
  }
});
test('a quiet pause requests a final flush and never hangs indefinitely', () => {
  const h = harness(); h.start({ continuous: true }); const recognition = h.instances[0];
  recognition.result({ text: 'Ang bata ay masaya.' }); h.advance(6000);
  assert.equal(recognition.stops, 1); h.advance(1500);
  assert.equal(h.results[0].transcript, 'Ang bata ay masaya.'); assert.equal(h.timers.size, 0);
});
test('reading can continue across speech-end pauses in continuous mode', () => {
  const h = harness(); h.start({ continuous: true }); const recognition = h.instances[0];
  recognition.result({ text: 'Unang pangungusap.' }); recognition.onspeechend(); h.advance(5000);
  assert.equal(recognition.stops, 0);
  recognition.result({ text: 'Unang pangungusap.' }, { text: 'Ikalawang pangungusap.' }); h.advance(5000);
  assert.equal(recognition.stops, 0); recognition.end(); assert.equal(h.results.length, 1);
});
test('the maximum duration also recovers a continually active recognizer', () => {
  const h = harness(); h.start({ continuous: true, maxDurationMs: 1000 }); const recognition = h.instances[0];
  recognition.result({ text: 'Ang bata ay nagbabasa.' }); h.advance(1000); h.advance(1500);
  assert.equal(recognition.stops, 1); assert.equal(h.results.length, 1); assert.equal(h.timers.size, 0);
});
test('navigation cancellation aborts the mic and suppresses late saves and errors', () => {
  const h = harness(); const stop = h.start({ continuous: true }); const recognition = h.instances[0], lateEnd = recognition.onend;
  recognition.result({ text: 'Partial page.' }); stop.cancel(); lateEnd(); h.advance(200000);
  assert.equal(h.results.length, 0); assert.equal(h.errors.length, 0); assert.equal(recognition.aborts, 1); assert.equal(h.timers.size, 0);
});
test('starting another activity releases the previous listening state', () => {
  const h = harness(); h.start({ continuous: true }); const first = h.instances[0];
  const second = h.start(); assert.equal(first.aborts, 1); assert.equal(h.errors.length, 1);
  h.instances[1].result({ text: 'bata' }); assert.equal(h.results.length, 1); second.cancel(); assert.equal(h.timers.size, 0);
});
test('Intermediate and Advanced text receive enough time and continuous recognition', () => {
  const h = harness(); const short = h.recognitionOptionsForText('bata');
  for (const text of ['Ang bata ay masaya.', 'Maagang gumising si Ana upang tulungan ang kanyang ina sa bahay.']) {
    const options = h.recognitionOptionsForText(text); assert.equal(options.continuous, true); assert.ok(options.maxDurationMs > short.maxDurationMs);
  }
  assert.equal(short.continuous, false);
});
test('no-speech after confirmed final segments can complete a continuous session', () => {
  const h = harness(); h.start({ continuous: true }); h.instances[0].result({ text: 'Nabasa ko ang buong pangungusap.' }); h.instances[0].error('no-speech');
  assert.equal(h.results.length, 1); assert.equal(h.errors.length, 0); assert.equal(h.timers.size, 0);
});
