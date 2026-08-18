import { api } from './api';

// Lightweight, cache-backed TTS playback used for auto-playing feedback text/pronunciation
// (e.g. reading the praise message, then the correct word) -- separate from TTSButton's own
// cache since this fires programmatically rather than from a click, but uses the same server
// voice/fallback shape. Everything here resolves only once actual playback has *finished*
// (not just started), so callers can chain several utterances in order (playTtsSequence).
const audioCache = new Map<string, string>();

function base64ToObjectUrl(base64: string): string {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
}

function playAudioAndWait(url: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

function speakWithBrowserAndWait(text: string, lang: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

async function resolveAudioUrl(text: string, rate: number): Promise<string | null> {
  const cacheKey = `${text}::${rate}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;
  try {
    const res = await api<{ audioContent: string }>('/tts', { method: 'POST', body: { text, rate } });
    const url = base64ToObjectUrl(res.audioContent);
    audioCache.set(cacheKey, url);
    return url;
  } catch {
    return null;
  }
}

/** Speaks `text` aloud and resolves once playback has finished. `rate` is 0.25-1 (1 = normal speed). */
export async function playTts(text: string, rate = 1, lang = 'fil-PH'): Promise<void> {
  const url = await resolveAudioUrl(text, rate);
  if (url) {
    await playAudioAndWait(url);
  } else {
    await speakWithBrowserAndWait(text, lang, rate);
  }
}

interface TtsQueueItem {
  text: string;
  rate?: number;
}

/** Speaks each item in order, waiting for one to finish before starting the next. */
export async function playTtsSequence(items: (string | TtsQueueItem)[], lang = 'fil-PH'): Promise<void> {
  for (const item of items) {
    const { text, rate = 1 } = typeof item === 'string' ? { text: item } : item;
    await playTts(text, rate, lang);
  }
}
