import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { getTtsPlaybackRate, getTtsRate, isIsolatedFilipinoVowel } from '../../lib/ttsSettings';
import { IconLabel } from './IconLabel';
import { trackEvent } from '../../lib/analytics';
import { createFilipinoUtterance } from '../../lib/filipinoVoice';
import { stopTtsPlayback } from '../../lib/ttsPlayer';

interface TTSButtonProps {
  text: string;
  lang?: string;
  /** Use for explanatory sentences that should not inherit the learner's slow word-reading speed. */
  rate?: number;
  className?: string;
  /** Lets public pages use the server-side ElevenLabs voice with a strict anonymous rate limit. */
  publicAccess?: boolean;
  /** Supplies the target when a compact lesson button hides its visible label. */
  ariaLabel?: string;
}

// Cache decoded audio per spoken text+rate so repeat plays (e.g. re-reading the same word)
// don't re-hit the TTS API -- keyed by rate too since the same text sounds different at each speed.
const audioCache = new Map<string, string>();
const audioGenerationRates = new Map<string, number>();
const TTS_AUDIO_CACHE_VERSION = 'filipino-v11';

function base64ToObjectUrl(base64: string): string {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) buffer[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
}

/** Reads `text` aloud through the server-side Filipino Cloud TTS voice. Acts as a toggle --
 *  clicking again while speaking stops playback instead of restarting it. */
export function TTSButton({ text, lang = 'fil-PH', rate: requestedRate, className, publicAccess = false, ariaLabel }: TTSButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'speaking'>('idle');
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackId = useRef(0);
  const browserSpeaking = useRef(false);

  useEffect(() => {
    setStatus('idle');
    setError('');
    return () => {
      playbackId.current += 1;
      audioRef.current?.pause();
      audioRef.current = null;
      if (browserSpeaking.current) window.speechSynthesis?.cancel();
      browserSpeaking.current = false;
    };
  }, [text, lang, requestedRate, publicAccess]);

  const stop = () => {
    playbackId.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    if (browserSpeaking.current) window.speechSynthesis?.cancel();
    browserSpeaking.current = false;
    setStatus('idle');
  };

  // If cloud audio is unavailable, only an installed Filipino/Tagalog voice
  // may read the text. A device's default English voice misreads short words.
  const speakWithBrowser = (rate: number, id: number) => {
    const fail = () => {
      if (id !== playbackId.current) return;
      browserSpeaking.current = false;
      setStatus('idle');
      setError('Hindi tumugtog ang tunog. Suriin ang audio at subukan muli.');
    };
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      fail();
      return;
    }
    try {
      const utterance = createFilipinoUtterance(text, rate);
      if (!utterance) { fail(); return; }
      utterance.onend = () => {
        if (id !== playbackId.current) return;
        browserSpeaking.current = false;
        setStatus('idle');
      };
      utterance.onerror = (event) => {
        if (event.error === 'canceled' || event.error === 'interrupted') {
          if (id === playbackId.current) { browserSpeaking.current = false; setStatus('idle'); }
        } else fail();
      };
      window.speechSynthesis.cancel();
      browserSpeaking.current = true;
      setError('');
      setStatus('speaking');
      window.speechSynthesis.speak(utterance);
    } catch { fail(); }
  };

  const speak = async () => {
    if (status === 'speaking') {
      stop();
      return;
    }
    if (status === 'loading') return;
    stopTtsPlayback();
    const id = ++playbackId.current;
    setError('');

    // Letter-vowel drills are always clear, natural-speed sounds. This also
    // prevents a saved .4/.5 reading setting from slowing A/E/I/O/U.
    const rate = isIsolatedFilipinoVowel(text) ? 1 : requestedRate ?? getTtsRate();
    const cacheKey = `${TTS_AUDIO_CACHE_VERSION}::${text}::${rate}`;
    setStatus('loading');
    try {
      let url = audioCache.get(cacheKey);
      if (!url) {
        const res = await api<{ audioContent: string; speakingRate?: number }>(publicAccess ? '/public/tts' : '/tts', { method: 'POST', auth: !publicAccess, body: { text, rate } });
        if (id !== playbackId.current) return;
        url = base64ToObjectUrl(res.audioContent);
        audioCache.set(cacheKey, url);
        if (res.speakingRate !== undefined) audioGenerationRates.set(url, res.speakingRate);
      }
      if (id !== playbackId.current) return;
      setStatus('speaking');
      const audio = new Audio(url);
      audio.playbackRate = getTtsPlaybackRate(rate, audioGenerationRates.get(url));
      audioRef.current = audio;
      audio.onended = () => { if (id === playbackId.current) setStatus('idle'); };
      audio.onerror = () => {
        if (id !== playbackId.current) return;
        audioRef.current = null;
        setStatus('idle');
        setError('Hindi tumugtog ang tunog. Suriin ang audio at subukan muli.');
      };
      await audio.play();
    } catch {
      if (id !== playbackId.current) return;
      audioRef.current?.pause();
      audioRef.current = null;
      trackEvent('speech_request_failed', { surface: 'tts_button' });
      speakWithBrowser(rate, id);
    }
  };

  return (
    <><button
      type="button"
      onClick={speak}
      disabled={status === 'loading'}
      aria-pressed={status === 'speaking'}
      aria-label={status === 'idle' ? ariaLabel : undefined}
      className={
        className ??
        `inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm focus-visible:outline-3 disabled:opacity-60 ${
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
    </button>{error && <span role="alert" className="text-sm text-[var(--color-danger)]">{error}</span>}</>
  );
}
