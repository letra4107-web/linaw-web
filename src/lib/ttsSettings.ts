// Shared, persisted "how fast should the app read to me" preference. Read by
// TTSButton and playTts/playTtsSequence as their default rate whenever a
// caller doesn't explicitly pass its own (e.g. WordOfDayCard's dedicated
// "Pantig-pantig" slow button still always uses 0.5 regardless of this).
const STORAGE_KEY = 'linaw-tts-rate';
const RATE_CHANGE_EVENT = 'linaw-tts-rate-change';
export const DEFAULT_TTS_RATE = 1;
const MIN_TTS_RATE = 0.5;
const MAX_TTS_RATE = 1.25;

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
  { value: 0.6, label: 'Mabagal', icon: '🐢' },
  { value: 1, label: 'Normal', icon: '🚶' },
  { value: 1.25, label: 'Mabilis', icon: '🐇' },
];
