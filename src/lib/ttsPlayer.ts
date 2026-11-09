import { api } from './api';
import { getTtsPlaybackRate, getTtsRate, isIsolatedFilipinoVowel } from './ttsSettings';
import { createFilipinoUtterance } from './filipinoVoice';

// Lightweight, cache-backed TTS playback used for auto-playing feedback text/pronunciation
// (e.g. reading the praise message, then the correct word) -- separate from TTSButton's own
// cache since this fires programmatically rather than from a click, but uses the same server
// voice/fallback shape. Everything here resolves only once actual playback has *finished*
// (not just started), so callers can chain several utterances in order (playTtsSequence).
const audioCache = new Map<string, string>();
const TTS_AUDIO_CACHE_VERSION = 'filipino-v9';
let activeSequenceId = 0;
let activeSequenceAudio: HTMLAudioElement | null = null;
let cancelActivePlayback: (() => void) | null = null;

function base64ToObjectUrl(base64: string): string {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
}

interface PlaybackOptions { signal?: AbortSignal; reportErrors?: boolean }

function playAudioAndWait(url: string, rate: number, sequenceId?: number, options: PlaybackOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted || (sequenceId !== undefined && sequenceId !== activeSequenceId)) {
      resolve();
      return;
    }
    const audio = new Audio(url);
    audio.playbackRate = getTtsPlaybackRate(rate);
    if (sequenceId !== undefined) {
      activeSequenceAudio?.pause();
      activeSequenceAudio = audio;
    }
    const finish = () => {
      options.signal?.removeEventListener('abort', cancel);
      if (activeSequenceAudio === audio) activeSequenceAudio = null;
      if (cancelActivePlayback === cancel) cancelActivePlayback = null;
      resolve();
    };
    const cancel = () => { audio.pause(); finish(); };
    const fail = () => {
      options.signal?.removeEventListener('abort', cancel);
      if (activeSequenceAudio === audio) activeSequenceAudio = null;
      if (cancelActivePlayback === cancel) cancelActivePlayback = null;
      reject(new Error('Hindi tumugtog ang tunog. Subukan muli ang audio button.'));
    };
    if (sequenceId !== undefined) cancelActivePlayback = cancel;
    options.signal?.addEventListener('abort', cancel, { once: true });
    audio.onended = finish;
    audio.onerror = fail;
    audio.play().catch(fail);
  });
}

function playBrowserAndWait(text: string, rate: number, sequenceId?: number, options: PlaybackOptions = {}): Promise<boolean> {
  if (options.signal?.aborted || (sequenceId !== undefined && sequenceId !== activeSequenceId)) return Promise.resolve(true);
  const utterance = createFilipinoUtterance(text, rate);
  if (!utterance) return Promise.resolve(false);
  return new Promise(resolve => {
    const finish = (played: boolean) => {
      options.signal?.removeEventListener('abort', cancel);
      if (cancelActivePlayback === cancel) cancelActivePlayback = null;
      resolve(played);
    };
    const cancel = () => { window.speechSynthesis.cancel(); finish(true); };
    utterance.onend = () => finish(true);
    utterance.onerror = () => finish(false);
    if (sequenceId !== undefined) cancelActivePlayback = cancel;
    options.signal?.addEventListener('abort', cancel, { once: true });
    try { window.speechSynthesis.speak(utterance); }
    catch { finish(false); }
  });
}

async function speakItem(text: string, rate: number, sequenceId?: number, options: PlaybackOptions = {}): Promise<void> {
  const url = await resolveAudioUrl(text, rate);
  if (options.signal?.aborted || (sequenceId !== undefined && sequenceId !== activeSequenceId)) return;
  let failure = new Error('Hindi ma-load ang tunog. Suriin ang koneksyon at subukan muli.');
  if (url) {
    try { await playAudioAndWait(url, rate, sequenceId, options); return; }
    catch (error) { failure = error as Error; }
  }
  if (await playBrowserAndWait(text, rate, sequenceId, options)) return;
  if (options.reportErrors) throw failure;
}

async function resolveAudioUrl(text: string, rate: number): Promise<string | null> {
  const cacheKey = `${TTS_AUDIO_CACHE_VERSION}::${text}::${rate}`;
  const cached = audioCache.get(cacheKey);
  if (cached) return cached;
  try {
    const res = await api<{ audioContent: string }>('/tts', { method: 'POST', auth: true, body: { text, rate } });
    const url = base64ToObjectUrl(res.audioContent);
    audioCache.set(cacheKey, url);
    return url;
  } catch {
    return null;
  }
}

/** Speaks `text` aloud and resolves once playback has finished. `rate` defaults to the
 *  student's saved speed preference (see ttsSettings.ts) when not explicitly overridden. */
export async function playTts(text: string, rate = getTtsRate(), lang = 'fil-PH'): Promise<void> {
  void lang; // The server always selects the Filipino Cloud TTS voice.
  const effectiveRate = isIsolatedFilipinoVowel(text) ? 1 : rate;
  await speakItem(text, effectiveRate);
}

interface TtsQueueItem {
  text: string;
  rate?: number;
}

/** Stop pending and playing feedback before another audio control or the mic. */
export function stopTtsPlayback(): void {
  activeSequenceId += 1;
  cancelActivePlayback?.();
}

/** Speaks each item in order, waiting for one to finish before starting the next. */
export async function playTtsSequence(items: (string | TtsQueueItem)[], lang = 'fil-PH', options: PlaybackOptions = {}): Promise<boolean> {
  const sequenceId = ++activeSequenceId;
  cancelActivePlayback?.();
  for (const item of items) {
    if (options.signal?.aborted || sequenceId !== activeSequenceId) return false;
    const { text, rate = getTtsRate() } = typeof item === 'string' ? { text: item } : item;
    const effectiveRate = isIsolatedFilipinoVowel(text) ? 1 : rate;
    void lang;
    await speakItem(text, effectiveRate, sequenceId, options);
  }
  return !options.signal?.aborted && sequenceId === activeSequenceId;
}
