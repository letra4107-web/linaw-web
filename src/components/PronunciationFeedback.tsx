import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, RotateCcw, Star, Volume2, X } from 'lucide-react';
import { getReadingAssistantSettings } from '../lib/readingAssistantSettings';
import { playTtsSequence } from '../lib/ttsPlayer';
import { readingFeedbackBand } from '../lib/feedbackMessages';
import { TTSButton } from './a11y/TTSButton';
import { SlowTTSButton } from './a11y/SlowTTSButton';
import { ConfettiOverlay } from './ConfettiOverlay';
import './pronunciation-feedback.css';

interface PronunciationFeedbackProps {
  correct: boolean; message: string; accuracy?: number | null; transcript?: string;
  rewardMessage?: string; speakText?: string; detail?: string; hint?: string; word?: string;
  className?: string; autoPlay?: boolean; attemptId?: string | number;
  onNext?: () => void; onRetry?: () => void;
}
export function PronunciationFeedback({ correct, message, accuracy, transcript, rewardMessage, speakText, detail, hint, word, className = '', autoPlay = true, attemptId, onNext, onRetry }: PronunciationFeedbackProps) {
  const [audioError, setAudioError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [closingSoon, setClosingSoon] = useState(false);
  const [dismissedToken, setDismissedToken] = useState<string | null>(null);
  const playback = useRef<AbortController | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const score = typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 100 ? Math.round(accuracy) : null;
  const attemptToken = `${attemptId ?? ''}|${message}|${detail ?? ''}|${transcript ?? ''}|${score ?? ''}`;
  const praise = speakText ?? message;
  const dismissed = dismissedToken === attemptToken;
  const cancelDismiss = useCallback(() => {
    if (dismissTimer.current !== null) clearTimeout(dismissTimer.current);
    dismissTimer.current = null;
  }, []);
  const dismiss = () => {
    cancelDismiss(); playback.current?.abort(); setSpeaking(false); setClosingSoon(false); setDismissedToken(attemptToken);
  };
  const speakFeedback = useCallback(() => {
    cancelDismiss(); playback.current?.abort();
    const controller = new AbortController(); playback.current = controller;
    setAudioError(''); setSpeaking(true); setClosingSoon(false);
    // The percentage stays visible; only the encouraging message/model is spoken.
    const sequence = !correct && word
      ? [{ text: praise, rate: 0.85 }, { text: 'Ulitin natin. Pakinggan mabuti.', rate: 0.8 }, { text: word, rate: 0.4 }]
      : [{ text: praise, rate: 1 }];
    void playTtsSequence(sequence, 'fil-PH', { signal: controller.signal, reportErrors: true }).then(completed => {
      if (controller.signal.aborted || playback.current !== controller) return;
      setSpeaking(false);
      if (completed) {
        setClosingSoon(true);
        dismissTimer.current = setTimeout(() => {
          if (!controller.signal.aborted && playback.current === controller) setDismissedToken(attemptToken);
          dismissTimer.current = null;
        }, 3000);
      }
    }).catch(() => {
      if (controller.signal.aborted || playback.current !== controller) return;
      setSpeaking(false); setClosingSoon(false);
      setAudioError('Hindi natapos ang audio. Pindutin ang Pakinggan upang subukan muli.');
    });
  }, [attemptToken, cancelDismiss, correct, praise, word]);
  useEffect(() => {
    if (autoPlay && !dismissed && getReadingAssistantSettings().feedbackAutoPlay) speakFeedback();
    return () => { cancelDismiss(); playback.current?.abort(); };
  }, [attemptToken, autoPlay, cancelDismiss, dismissed, speakFeedback]);
  const details = <div className="reading-feedback-result">
    {score !== null && <div className="reading-feedback-score" aria-label={`Kabuuang kawastuhan: ${score}%`}>
      <strong>{score}<span>%</span></strong><span>Kabuuang kawastuhan</span><small>{readingFeedbackBand(score)}</small>
    </div>}
    {(word || transcript || detail) && <dl className="reading-feedback-details">
      {word && <div><dt>Babasahin</dt><dd>{word}</dd></div>}
      {transcript ? <div><dt>Narinig na bigkas</dt><dd>{transcript}</dd></div> : detail && <div><dt>Detalye ng pagsubok</dt><dd>{detail}</dd></div>}
    </dl>}
  </div>;
  if (!autoPlay) return <div role="status" aria-live="polite" className={`reading-feedback-inline ${className}`}>
    <p className="reading-feedback-toast-message">{message}</p>{details}
    {hint && <p className="reading-feedback-toast-hint">{hint}</p>}{rewardMessage && <p className="reading-feedback-reward">{rewardMessage}</p>}
    <div className="mt-2 flex flex-wrap justify-center gap-2"><TTSButton text={praise} rate={0.9} ariaLabel="Pakinggan ang positibong mensahe" />{word && <><TTSButton text={word} /><SlowTTSButton text={word} /></>}</div>
  </div>;
  if (dismissed || typeof document === 'undefined') return null;
  return createPortal(<>
    <ConfettiOverlay trigger={attemptToken} />
    <div className="reading-feedback-layer">
      <section className="reading-feedback-toast" aria-label="Resulta ng iyong pagbasa" data-correct={correct}>
        <div className="reading-feedback-toast-main">
          <span className="reading-feedback-toast-star" aria-hidden="true"><Star size={28} /></span>
          <div className="reading-feedback-toast-copy"><p className="reading-feedback-eyebrow">Resulta ng Iyong Pagbasa</p><p role="status" aria-live="polite" aria-atomic="true" className="reading-feedback-toast-message">{message}</p></div>
          <button type="button" className="reading-feedback-toast-close" aria-label="Isara ang mensahe" onClick={dismiss}><X size={22} /></button>
        </div>
        {details}
        {hint && <p className="reading-feedback-toast-hint">{hint}</p>}{rewardMessage && <p className="reading-feedback-reward">{rewardMessage}</p>}
        {audioError && <p role="alert" className="reading-feedback-toast-error">{audioError}</p>}
        <div className="reading-feedback-footer"><p className="reading-feedback-playback" aria-live="polite">{speaking ? 'Binabasa ng system ang mensahe.' : closingSoon ? 'Magsasara makalipas ang 3 segundo.' : 'Pakinggan muli o isara ang mensahe.'}</p>
          <div className="reading-feedback-toast-actions">
            <button type="button" className="reading-feedback-toast-listen" aria-label="Pakinggan ang positibong mensahe" onClick={speakFeedback}><Volume2 size={20} aria-hidden="true" />{speaking ? 'Pakinggan Muli' : 'Pakinggan'}</button>
            {!correct && onRetry && <button type="button" className="reading-feedback-toast-retry" onClick={onRetry}><RotateCcw size={19} aria-hidden="true" />Ulitin</button>}
            {onNext && <button type="button" className="reading-feedback-toast-next" onClick={onNext}>Susunod<ArrowRight size={19} aria-hidden="true" /></button>}
          </div>
        </div>
      </section>
    </div>
  </>, document.body);
}
