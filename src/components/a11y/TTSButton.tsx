import { useRef, useState } from 'react';
import { api } from '../../lib/api';
import { getTtsRate } from '../../lib/ttsSettings';
import { IconLabel } from './IconLabel';

interface TTSButtonProps {
  text: string;
  lang?: string;
  className?: string;
}

// Cache decoded audio per spoken text+rate so repeat plays (e.g. re-reading the same word)
// don't re-hit the TTS API -- keyed by rate too since the same text sounds different at each speed.
const audioCache = new Map<string, string>();

function base64ToObjectUrl(base64: string): string {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
}

/** Falls back to the browser's own speech synthesis if the server-side Filipino TTS is unavailable. */
function speakWithBrowser(text: string, lang: string, rate: number) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}

/** Reads `text` aloud in real Filipino, via a server-side Google Cloud TTS voice. Falls back to the
 *  browser's own (often English-only) speech synthesis if the backend call fails. Acts as a toggle --
 *  clicking again while speaking stops playback instead of restarting it. */
export function TTSButton({ text, lang = 'fil-PH', className }: TTSButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'speaking'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setStatus('idle');
  };

  const speak = async () => {
    if (status === 'speaking') {
      stop();
      return;
    }

    const rate = getTtsRate();
    const cacheKey = `${text}::${rate}`;
    const cached = audioCache.get(cacheKey);
    if (cached) {
      setStatus('speaking');
      const audio = new Audio(cached);
      audioRef.current = audio;
      audio.onended = () => setStatus('idle');
      audio.onerror = () => setStatus('idle');
      audio.play();
      return;
    }

    setStatus('loading');
    try {
      const res = await api<{ audioContent: string }>('/tts', { method: 'POST', body: { text, rate } });
      const url = base64ToObjectUrl(res.audioContent);
      audioCache.set(cacheKey, url);
      setStatus('speaking');
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setStatus('idle');
      audio.onerror = () => setStatus('idle');
      audio.play();
    } catch {
      setStatus('speaking');
      speakWithBrowser(text, lang, rate);
      setStatus('idle');
    }
  };

  return (
    <button
      type="button"
      onClick={speak}
      disabled={status === 'loading'}
      aria-pressed={status === 'speaking'}
      className={
        className ??
        `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm focus-visible:outline-3 disabled:opacity-60 ${
          status === 'speaking'
            ? 'border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)]'
        }`
      }
    >
      <IconLabel
        icon={status === 'loading' ? '⏳' : status === 'speaking' ? '⏹️' : '🔈'}
        label={status === 'loading' ? 'Naglo-load...' : status === 'speaking' ? 'Ihinto' : 'Basahin nang malakas'}
      />
    </button>
  );
}
