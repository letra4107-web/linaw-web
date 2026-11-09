import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, RotateCcw, Star, Volume2, X } from 'lucide-react';
import { playTtsSequence } from '../lib/ttsPlayer';
import { TTSButton } from './a11y/TTSButton';
import { SlowTTSButton } from './a11y/SlowTTSButton';
import { ConfettiOverlay } from './ConfettiOverlay';
import './pronunciation-feedback.css';

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
  onNext?: () => void;
  onRetry?: () => void;
}

export function PronunciationFeedback({ correct, message, speakText, detail, hint, word, className = '', autoPlay = true, attemptId, onNext, onRetry }: PronunciationFeedbackProps) {
  const [audioError, setAudioError] = useState('');
  const [dismissedToken, setDismissedToken] = useState<string | null>(null);
  const playback = useRef<AbortController | null>(null);
  const attemptToken = `${attemptId ?? ''}|${message}|${detail ?? ''}`;
  const praise = speakText ?? message;
  const dismissed = dismissedToken === attemptToken;

  const speakFeedback = useCallback(() => {
    playback.current?.abort();
    const controller = new AbortController();
    playback.current = controller;
    setAudioError('');
    const sequence = !correct && word
      ? [{ text: praise, rate: 0.85 }, { text: 'Ulitin natin. Pakinggan mabuti.', rate: 0.8 }, { text: word, rate: 0.4 }]
      : [{ text: praise, rate: 1 }];
    void playTtsSequence(sequence, 'fil-PH', { signal: controller.signal, reportErrors: true }).catch(() => {
      if (!controller.signal.aborted) setAudioError('Pindutin ang Pakinggan para marinig ang mensahe.');
    });
  }, [correct, praise, word]);

  useEffect(() => {
    if (autoPlay && !dismissed) speakFeedback();
    return () => playback.current?.abort();
  }, [attemptToken, autoPlay, dismissed, speakFeedback]);

  // A previously completed Word of the Day stays in its home card. Fresh
  // results appear in the viewport without adding height to the reading page.
  if (!autoPlay) return <div role="status" aria-live="polite" className={`rounded-xl bg-[var(--color-success-soft)] px-5 py-4 text-center text-[var(--color-text)] ${className}`}>
    <p className="font-semibold">{message}</p>
    <div className="mt-2 flex justify-center"><TTSButton text={praise} rate={0.9} ariaLabel="Pakinggan ang positibong mensahe" /></div>
    {hint && <p className="mt-1 text-sm">{hint}</p>}
    {word && <div className="mt-2 flex flex-wrap justify-center gap-2"><TTSButton text={word} /><SlowTTSButton text={word} /></div>}
  </div>;

  if (dismissed || typeof document === 'undefined') return null;

  return createPortal(<>
    <ConfettiOverlay trigger={attemptToken} />
    <section className="reading-feedback-toast" aria-label="Mensahe sa iyong pagbasa" data-correct={correct}>
      <div className="reading-feedback-toast-main">
        <span className="reading-feedback-toast-star" aria-hidden="true"><Star size={25} /></span>
        <div className="reading-feedback-toast-copy">
          <p role="status" aria-live="polite" aria-atomic="true" className="reading-feedback-toast-message">{message}</p>
          {detail && <p className="reading-feedback-toast-detail" title={detail}>{detail}</p>}
          {!correct && word && <p className="reading-feedback-toast-detail">Pakinggan at ulitin: <strong>{word}</strong></p>}
        </div>
        <button type="button" className="reading-feedback-toast-close" aria-label="Isara ang mensahe" onClick={() => setDismissedToken(attemptToken)}><X size={18} /></button>
      </div>
      {audioError && <p className="reading-feedback-toast-error">{audioError}</p>}
      <div className="reading-feedback-toast-actions">
        <button type="button" className="reading-feedback-toast-listen" aria-label="Pakinggan ang positibong mensahe" onClick={speakFeedback}><Volume2 size={18} aria-hidden="true" />Pakinggan</button>
        {!correct && onRetry && <button type="button" className="reading-feedback-toast-retry" onClick={onRetry}><RotateCcw size={17} aria-hidden="true" />Ulitin</button>}
        {onNext && <button type="button" className="reading-feedback-toast-next" onClick={onNext}>Susunod<ArrowRight size={18} aria-hidden="true" /></button>}
      </div>
    </section>
  </>, document.body);
}
