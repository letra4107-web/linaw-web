import { useEffect } from 'react';
import { playTtsSequence } from '../lib/ttsPlayer';
import { TTSButton } from './a11y/TTSButton';
import { ConfettiOverlay } from './ConfettiOverlay';

const CELEBRATE_PALETTE = ['#7c3aed', '#f97316', '#14b8a6', '#eab308', '#ec4899'];
const ENCOURAGE_PALETTE = ['#14b8a6', '#2563eb', '#7c3aed', '#eab308'];

interface PronunciationFeedbackProps {
  correct: boolean;
  message: string;
  speakText?: string;
  detail?: string;
  hint?: string;
  word?: string;
  className?: string;
  autoPlay?: boolean;
}

export function PronunciationFeedback({ correct, message, speakText, detail, hint, word, className = '', autoPlay = true }: PronunciationFeedbackProps) {
  const attemptToken = `${message}|${detail ?? ''}`;

  useEffect(() => {
    if (!autoPlay) return;
    const praise = speakText ?? message;
    const sequence = !correct && word
      ? [praise, 'Ulitin natin. Pakinggan mabuti.', { text: word, rate: 0.6 }, { text: word, rate: 0.6 }]
      : [praise];
    playTtsSequence(sequence);
    // The attempt token intentionally gates replay behavior rather than unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptToken, autoPlay]);

  return <div className={`relative overflow-hidden rounded-xl px-5 py-4 text-center font-semibold ${correct ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-accent-soft)] text-[var(--color-brand-sun)]'} ${className}`}>
    <ConfettiOverlay trigger={autoPlay ? attemptToken : null} palette={correct ? CELEBRATE_PALETTE : ENCOURAGE_PALETTE} />
    <div className="relative">
      <p className="text-base">{message}</p>
      {detail && <p className="mt-1 text-sm font-normal">{detail}</p>}
      {hint && <p className="mt-1 text-sm font-normal">{hint}</p>}
      {word && <div className="mt-2 flex justify-center"><TTSButton text={word} /></div>}
    </div>
  </div>;
}
