// Shared, persisted "how fast should the app read to me" preference. Read by
// TTSButton and playTts/playTtsSequence as their default rate whenever a
// caller doesn't explicitly pass its own (e.g. WordOfDayCard's dedicated
// "Pantig-pantig" slow button still always uses 0.5 regardless of this).
// New key resets the former default, which proved too quick for early readers.
const STORAGE_KEY = 'linaw-tts-rate-v3';
const RATE_CHANGE_EVENT = 'linaw-tts-rate-change';
export const DEFAULT_TTS_RATE = 0.5;
const MIN_TTS_RATE = 0.4;
const MAX_TTS_RATE = 1;
const ELEVENLABS_MIN_GENERATION_RATE = 0.7;

export function isIsolatedFilipinoVowel(text: string): boolean {
  return /^[aeiou]$/iu.test(text.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}

// ElevenLabs cannot generate below 0.7x. Generate at its minimum, then apply
// the remaining slowdown in the audio element so the learner still receives
// the requested 0.4x or 0.5x pace.
export function getTtsPlaybackRate(rate: number): number {
  const generatedRate = Math.max(ELEVENLABS_MIN_GENERATION_RATE, Math.min(MAX_TTS_RATE, rate));
  return rate / generatedRate;
}

export function getTtsRate(): number {
  if (typeof window === 'undefined') return DEFAULT_TTS_RATE;
  const stored = Number(window.localStorage.getItem(STORAGE_KEY));
  if (!Number.isFinite(stored) || stored < MIN_TTS_RATE || stored > MAX_TTS_RATE) return DEFAULT_TTS_RATE;
  return stored;
}

export function setTtsRate(rate: number): void {
  if (typeof window === 'undefined') return;
  const clamped = Math.min(MAX_TTS_RATE, Math.max(MIN_TTS_RATE, rate));
  window.localStorage.setItem(STORAGE_KEY, String(clamped));
  window.dispatchEvent(new CustomEvent(RATE_CHANGE_EVENT, { detail: clamped }));
}

export function onTtsRateChange(callback: (rate: number) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => callback((e as CustomEvent<number>).detail);
  window.addEventListener(RATE_CHANGE_EVENT, handler);
  return () => window.removeEventListener(RATE_CHANGE_EVENT, handler);
}

export const TTS_RATE_PRESETS: { value: number; label: string; icon: string }[] = [
  { value: 0.4, label: 'Mabagal', icon: '🐢' },
  { value: 0.5, label: 'Normal', icon: '🚶' },
  { value: 0.8, label: 'Mabilis', icon: '🐇' },
];
