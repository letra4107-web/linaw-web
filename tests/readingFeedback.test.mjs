import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTs } from './helpers/load-ts.mjs';

test('browser fallback never substitutes an English voice for Filipino pronunciation', () => {
  let voices = [{ lang: 'en-US' }];
  const { createFilipinoUtterance } = loadTs('src/lib/filipinoVoice.ts', {}, {
    window: { speechSynthesis: { getVoices: () => voices } },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
  });
  assert.equal(createFilipinoUtterance('ano', 0.8), null);
  voices = [...voices, { lang: 'fil-PH' }];
  const speech = createFilipinoUtterance('ano', 0.8);
  assert.equal(speech.voice, voices[1]); assert.equal(speech.lang, 'fil-PH'); assert.equal(speech.text, 'ano');
  voices = [{ lang: 'tl-PH' }]; assert.equal(createFilipinoUtterance('I', 1).lang, 'tl-PH');
});

function feedbackHarness() {
  const effects = [], spoken = [], confetti = [];
  const { PronunciationFeedback } = loadTs('src/components/PronunciationFeedback.tsx', {
    react: { useEffect: (run, deps) => effects.push({ run, deps }), useState: initial => [initial, () => {}], useCallback: callback => callback, useRef: () => ({ current: null }) },
    'react-dom': { createPortal: content => content },
    '../lib/readingAssistantSettings':{getReadingAssistantSettings:()=>({feedbackAutoPlay:true,slowReadingRate:0.4,defaultReadingRate:0.5})},'../lib/ttsPlayer': { playTtsSequence: async (...args) => { spoken.push(args); return true; } },
    './a11y/TTSButton': { TTSButton: props => createElement('button', { 'aria-label': props.ariaLabel }, props.text) },
    './a11y/SlowTTSButton': { SlowTTSButton: () => null },
    './ConfettiOverlay': { ConfettiOverlay: props => { confetti.push(props.trigger); return null; } },
  }, { AbortController, document: { body: {} } });
  return { effects, spoken, confetti, render: props => renderToStaticMarkup(PronunciationFeedback(props)) };
}

test('correct and incorrect attempts both speak their positive feedback and offer replay', () => {
  for (const correct of [true, false]) {
    const h = feedbackHarness();
    const html = h.render({ correct, message: 'Salamat sa pagsubok!', word: correct ? undefined : 'bata', attemptId: 'first' });
    const cleanup = h.effects[0].run();
    assert.match(html, /Pakinggan ang positibong mensahe/);
    assert.match(html, /class="reading-feedback-toast"/);
    assert.equal(h.spoken[0][0][0].text, 'Salamat sa pagsubok!');
    assert.equal(h.spoken[0][1], 'fil-PH'); assert.equal(h.spoken[0][2].reportErrors, true);
    assert.equal(h.spoken[0][0].length, correct ? 1 : 3);
    assert.ok(h.confetti[0].startsWith('first|'), 'correct and incorrect attempts both launch confetti');
    cleanup(); assert.equal(h.spoken[0][2].signal.aborted, true);
  }
});

test('historical feedback stays inline without launching another celebration', () => {
  const h = feedbackHarness();
  const html = h.render({ correct: true, message: 'Natapos na!', autoPlay: false });
  assert.ok(!html.includes('class="reading-feedback-toast"'));
  assert.match(html, /reading-feedback-inline/);
  assert.equal(h.confetti.length, 0);
  h.effects[0].run(); assert.equal(h.spoken.length, 0);
});

test('identical repeated readings have distinct feedback playback dependencies', () => {
  const h = feedbackHarness();
  for (const attemptId of ['first', 'second']) h.render({ correct: true, message: 'Ang galing mo!', attemptId });
  assert.notEqual(h.effects[0].deps[0], h.effects[1].deps[0]);
  assert.notEqual(h.confetti[0], h.confetti[1]);
});

test('Galing sa Guro renders published lesson metadata and opens the authorized PDF endpoint', async () => {
  let query, endpoint;
  const { TeacherLessons } = loadTs('src/components/student/TeacherLessons.tsx', {
    react: { useState: () => [null, () => {}] },
    '@tanstack/react-query': { useQuery: options => { query = options; return { data: { lessons: [{ id: 'lesson-1', title: 'Mga Patinig', description: '**Magsanay** sa pagbasa', grade_level: '2' }] }, refetch() {} }; } },
    '../../lib/api': { api: async (...args) => { endpoint = args; return { lessons: [] }; } },
    '../../lib/auth/AuthContext': { useAuth: () => ({ user: { id: 'student-auth' } }) },
    '../../lib/openAccessUrl': { openAccessUrl: async path => { endpoint = path; } },
    '../QueryErrorNotice': { QueryErrorNotice: () => null },
    '../../lib/cardStyle': { cardStyle: () => ({}), CARD_COLORS: ['sage'] },
    '../../lib/lessons/description': loadTs('src/lib/lessons/description.ts'),
  });
  const tree = TeacherLessons(); const html = renderToStaticMarkup(tree);
  assert.match(html, /Mga Patinig/); assert.match(html, /Buksan ang PDF/); assert.match(html, /Magsanay sa pagbasa/);
  await query.queryFn(); assert.equal(endpoint[0], '/student/lessons'); assert.equal(endpoint[1].auth, true);
  const list = tree.props.children.find(child => child?.type === 'ul');
  const button = list.props.children[0].props.children.at(-1);
  await button.props.onClick(); assert.equal(endpoint, '/student/lessons/lesson-1/access-url');
});
