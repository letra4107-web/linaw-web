// Browser speech-to-text + a simple similarity scorer. Matches this schema's
// established convention (see migration 051's comments): pronunciation
// accuracy is computed client-side and trusted server-side, same as mobile.

export function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** 0-100 similarity between spoken transcript and the target text. */
export function computeAccuracy(target: string, spoken: string): number {
  const a = normalizeForCompare(target);
  const b = normalizeForCompare(spoken);
  if (!a) return 0;
  if (!b) return 0;
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  const similarity = maxLen === 0 ? 1 : 1 - distance / maxLen;
  return Math.max(0, Math.round(similarity * 100));
}

export type SpeechAssessment =
  | { outcome: 'correct'; accuracy: number }
  | { outcome: 'incorrect'; accuracy: number }
  | { outcome: 'retry'; accuracy: number; message: string };

/** Browser STT provides a transcript, not a pronunciation score. Keep uncertain
 * recognition separate from a wrong answer to avoid false negatives. */
export function assessSpeech(target: string, transcript: string, _confidence = 1): SpeechAssessment {
  const accuracy = computeAccuracy(target, transcript);
  const normalizedTarget = normalizeForCompare(target);
  const normalizedTranscript = normalizeForCompare(transcript);
  // Filipino vowel prompts use tunog, not English letter names:
  // A=ah, E=eh, I=ee, O=oh, U=oo.
  const vowelSoundAliases: Record<string, string[]> = { a: ['a', 'ah'], e: ['e', 'eh'], i: ['i', 'ee'], o: ['o', 'oh'], u: ['u', 'oo'] };
  if (vowelSoundAliases[normalizedTarget]?.includes(normalizedTranscript)) return { outcome: 'correct', accuracy: 100 };
  // Browser confidence is frequently low for very short Filipino targets
  // (especially single letters such as "A") even when its transcript is an
  // exact match. Never turn that exact match into a false negative.
  if (normalizedTarget === normalizedTranscript) return { outcome: 'correct', accuracy: 100 };
  // Chrome's confidence value is unreliable for Filipino, particularly on
  // short words. A strong transcript match is enough; otherwise a child who
  // read correctly can be asked to repeat just because the browser is unsure.
  if (accuracy >= 88) return { outcome: 'correct', accuracy };
  // The browser's confidence score is not a microphone-level measurement and
  // is especially unreliable for Filipino. Once it has supplied a transcript,
  // classify it consistently; actual no-speech and microphone errors are
  // already handled by the recognition error callbacks below.
  return { outcome: 'incorrect', accuracy };
}

interface SpeechRecognitionResultLike {
  transcript: string;
  confidence?: number;
}

export interface RecognitionResult { transcript: string; confidence: number }
type RecognitionEndedCallback = (result: RecognitionResult) => void;

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(getRecognitionCtor());
}

function getRecognitionCtor(): (new () => SpeechRecognition) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

const RECOGNITION_ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Kailangan natin ng microphone permission para makinig. Payagan ito sa settings ng browser.',
  'service-not-allowed': 'Kailangan natin ng microphone permission para makinig. Payagan ito sa settings ng browser.',
  'no-speech': 'Walang narinig na boses. Subukan mong bigkasin ulit nang malapit sa mic.',
  'audio-capture': 'Walang nahanap na microphone. Ikabit o piliin ang mic sa device settings, saka subukan muli.',
  network: 'Nawalan ng koneksyon habang nakikinig. Suriin ang internet at subukan muli.',
  aborted: 'Naantala ang pakikinig bago matapos. Pindutin ang mic at bigkasin muli ang salita.',
  'bad-grammar': 'May problema sa speech-recognition setting ng browser. I-refresh ang page at subukan muli.',
  'language-not-supported': 'Hindi suportado ng browser ang Filipino speech recognition. Subukan ang pinakabagong Chrome.',
};

function friendlyRecognitionError(code: string): string {
  return RECOGNITION_ERROR_MESSAGES[code] ?? 'Hindi nagsimula ang pakikinig. Subukan muli.';
}

export interface RecognitionOptions { continuous?: boolean; maxDurationMs?: number }
export type RecognitionHandle = (() => void) & { cancel: () => void };

/** Longer Filipino phrases and paragraphs need several final result segments. */
export function recognitionOptionsForText(text: string): RecognitionOptions {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return { continuous: words >= 3, maxDurationMs: words >= 3 ? Math.min(180000, Math.max(30000, words * 2500 + 15000)) : 20000 };
}

let interruptActiveRecognition: (() => void) | null = null;

export function listenOnce(lang: string, onResult: RecognitionEndedCallback, onError: (message: string) => void, options: RecognitionOptions = {}): RecognitionHandle {
  const noop = Object.assign(() => {}, { cancel: () => {} });
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    onError('Hindi suportado ng browser na ito ang speech recognition.');
    return noop;
  }
  let recognition: SpeechRecognition;
  try { recognition = new Ctor(); }
  catch { onError('Hindi nagsimula ang microphone. Subukan muli.'); return noop; }
  interruptActiveRecognition?.();
  const continuous = options.continuous ?? false;
  let settled = false;
  let stopping = false;
  let finalSegments: RecognitionResult[] = [];
  let hasInterim = false;
  let initialTimer: ReturnType<typeof setTimeout> | undefined;
  let durationTimer: ReturnType<typeof setTimeout> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let stopTimer: ReturnType<typeof setTimeout> | undefined;

  function cleanup() {
    clearTimeout(initialTimer); clearTimeout(durationTimer); clearTimeout(silenceTimer); clearTimeout(stopTimer);
    recognition.onresult = null; recognition.onerror = null; recognition.onend = null; recognition.onspeechend = null;
    if (interruptActiveRecognition === interrupt) interruptActiveRecognition = null;
    try { recognition.abort(); } catch { /* Browser may already have ended. */ }
  }
  function fail(message: string) {
    if (settled) return;
    settled = true; cleanup(); onError(message);
  }
  function finish() {
    if (settled) return;
    if (hasInterim) {
      fail('Hindi nakumpleto ang pagkilala sa iyong pagbasa. Subukan muli sa tahimik na lugar.');
      return;
    }
    const transcript = finalSegments.map(segment => segment.transcript.trim()).filter(Boolean).join(' ');
    if (!transcript) { fail(friendlyRecognitionError('no-speech')); return; }
    const confidence = finalSegments.reduce((sum, segment) => sum + segment.confidence, 0) / finalSegments.length;
    settled = true; cleanup(); onResult({ transcript, confidence });
  }
  function requestStop() {
    if (settled || stopping) return;
    stopping = true;
    clearTimeout(initialTimer); clearTimeout(durationTimer); clearTimeout(silenceTimer);
    // stop() may produce its final result asynchronously. Keep collecting it
    // until end, but recover even when the browser never emits that event.
    stopTimer = setTimeout(finish, 1500);
    try { recognition.stop(); } catch { finish(); }
  }
  function interrupt() { fail('Naantala ang pakikinig. Pindutin muli ang mic kapag handa ka na.'); }
  const control = Object.assign(requestStop, { cancel: () => {
    if (settled) return;
    settled = true; cleanup();
  } });

  recognition.lang = lang;
  recognition.continuous = continuous;
  recognition.interimResults = true;
  // A short alternative list helps the browser recover from mild background
  // noise; the server remains the source of truth for scoring.
  recognition.maxAlternatives = 3;

  recognition.onresult = (event) => {
    if (settled) return;
    const finals: RecognitionResult[] = [];
    let heardSpeech = false;
    hasInterim = false;
    // results contains the whole session, including prior final segments.
    // Rebuild instead of appending so repeated events never duplicate words.
    for (let i = 0; i < event.results.length; i++) {
      const segment = event.results[i];
      const alternatives = Array.from(segment as unknown as ArrayLike<SpeechRecognitionResultLike>);
      const best = alternatives.sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))[0];
      if (!best?.transcript?.trim()) continue;
      heardSpeech = true;
      if (segment.isFinal) finals.push({ transcript: best.transcript, confidence: best.confidence ?? 0 });
      else hasInterim = true;
    }
    finalSegments = finals;
    if (heardSpeech) {
      clearTimeout(initialTimer); clearTimeout(silenceTimer);
      if (!stopping) silenceTimer = setTimeout(requestStop, continuous ? 6000 : 2500);
    }
    if (!continuous && finals.length && !hasInterim) finish();
  };
  recognition.onerror = (event) => {
    if (settled) return;
    const code = (event as unknown as { error?: string }).error || '';
    if (code === 'no-speech' && finalSegments.length && !hasInterim) finish();
    else fail(friendlyRecognitionError(code));
  };
  recognition.onend = finish;
  recognition.onspeechend = () => { if (!continuous) requestStop(); };
  interruptActiveRecognition = interrupt;
  initialTimer = setTimeout(() => fail(friendlyRecognitionError('no-speech')), 15000);
  durationTimer = setTimeout(requestStop, options.maxDurationMs ?? (continuous ? 120000 : 20000));
  try { recognition.start(); }
  catch { fail('Hindi nagsimula ang microphone. Suriin ang pahintulot at subukan muli.'); }
  return control;
}
