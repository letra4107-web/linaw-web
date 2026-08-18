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

interface SpeechRecognitionResultLike {
  transcript: string;
}

type RecognitionEndedCallback = (transcript: string) => void;

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
  'audio-capture': 'Walang nahanap na microphone sa device na ito.',
  network: 'May problema sa koneksyon. Subukan ulit.',
  aborted: 'Naantala ang pakikinig. Subukan ulit.',
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
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const result = event.results[0][0] as SpeechRecognitionResultLike;
    onResult(result.transcript);
  };
  recognition.onerror = (event) => {
    const code = (event as unknown as { error?: string }).error || '';
    onError(friendlyRecognitionError(code));
  };

  recognition.start();
  return () => recognition.stop();
}
