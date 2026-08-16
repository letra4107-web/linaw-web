import { useState } from 'react';
import { IconLabel } from './IconLabel';

interface TTSButtonProps {
  text: string;
  lang?: string;
  className?: string;
}

/** Reads `text` aloud via the browser's speech synthesis. Filipino-first, falls back silently if unsupported. */
export function TTSButton({ text, lang = 'fil-PH', className }: TTSButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={speak}
      aria-pressed={speaking}
      className={
        className ??
        'inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:outline-3'
      }
    >
      <IconLabel icon={speaking ? '🔊' : '🔈'} label={speaking ? 'Naririnig...' : 'Basahin nang malakas'} />
    </button>
  );
}
