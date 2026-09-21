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
export function assessSpeech(target: string, transcript: string, confidence = 1): SpeechAssessment {
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
  if (accuracy >= 88 && confidence >= 0.55) return { outcome: 'correct', accuracy };
  if (confidence < 0.55) return { outcome: 'retry', accuracy, message: 'Hindi kita narinig nang malinaw. Subukan muli at magsalita nang mas malapit sa mic.' };
  if (accuracy >= 55) return { outcome: 'retry', accuracy, message: 'Hindi pa sigurado ang narinig ko. Pakinggan at subukan nating muli.' };
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

export function listenOnce(lang: string, onResult: RecognitionEndedCallback, onError: (message: string) => void) {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    onError('Hindi suportado ng browser na ito ang speech recognition.');
    return () => {};
  }
  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.interimResults = false;
  // A short alternative list helps the browser recover from mild background
  // noise; the server remains the source of truth for scoring.
  recognition.maxAlternatives = 3;

  recognition.onresult = (event) => {
    const alternatives = Array.from(event.results[0] as unknown as ArrayLike<SpeechRecognitionResultLike>);
    const result = alternatives.sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))[0];
    if (!result?.transcript?.trim()) return onError('Walang malinaw na narinig. Lumapit sa mic at subukan muli sa tahimik na lugar.');
    onResult({ transcript: result.transcript, confidence: result.confidence ?? 0 });
  };
  recognition.onerror = (event) => {
    const code = (event as unknown as { error?: string }).error || '';
    onError(friendlyRecognitionError(code));
  };

  recognition.start();
  return () => recognition.stop();
}
