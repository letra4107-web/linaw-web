import { useEffect, useState } from 'react';
import { playTtsSequence } from '../lib/ttsPlayer';
import { TTSButton } from './a11y/TTSButton';
import { SlowTTSButton } from './a11y/SlowTTSButton';
import { ConfettiOverlay } from './ConfettiOverlay';

interface PronunciationFeedbackProps {
  correct: boolean;
  message: string;
  speakText?: string;
  detail?: string;
  hint?: string;
  word?: string;
  className?: string;
  autoPlay?: boolean;
  attemptId?: string | number;
}

export function PronunciationFeedback({ correct, message, speakText, detail, hint, word, className = '', autoPlay = true, attemptId }: PronunciationFeedbackProps) {
  const [audioError, setAudioError] = useState('');
  const attemptToken = `${attemptId ?? ''}|${message}|${detail ?? ''}`;
  const praise = speakText ?? message;

  useEffect(() => {
    if (!autoPlay) return;
    const controller = new AbortController();
    setAudioError('');
    const sequence = !correct && word
      ? [{ text: praise, rate: 0.85 }, { text: 'Ulitin natin. Pakinggan mabuti.', rate: 0.8 }, { text: word, rate: 0.4 }]
      : [{ text: praise, rate: 1 }];
    void playTtsSequence(sequence, 'fil-PH', { signal: controller.signal, reportErrors: true }).catch(() => {
      if (!controller.signal.aborted) setAudioError('Pindutin ang audio button para marinig ang mensahe.');
    });
    return () => controller.abort();
  }, [attemptToken, autoPlay, correct, praise, word]);

  return <div role="status" aria-live="polite" aria-atomic="true" className={`relative overflow-hidden rounded-xl px-5 py-4 text-center font-semibold ${correct ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : 'bg-[var(--color-accent-soft)] text-[var(--color-primary)]'} ${className}`}>
    <ConfettiOverlay trigger={autoPlay ? attemptToken : null} />
    <div className="relative">
      <p className="text-base">{message}</p>
      <div className="mt-2 flex justify-center"><TTSButton text={praise} rate={0.9} ariaLabel="Pakinggan ang positibong mensahe" /></div>
      {audioError && <p className="mt-1 text-sm font-normal">{audioError}</p>}
      {detail && <p className="mt-1 text-sm font-normal">{detail}</p>}
      {hint && <p className="mt-1 text-sm font-normal">{hint}</p>}
      {word && <div className="mt-2 flex flex-wrap justify-center gap-2"><TTSButton text={word} /><SlowTTSButton text={word} /></div>}
    </div>
  </div>;
}
