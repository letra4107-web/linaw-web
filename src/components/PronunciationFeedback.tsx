import { useEffect } from 'react';
import { playTtsSequence } from '../lib/ttsPlayer';
import { TTSButton } from './a11y/TTSButton';
import { ConfettiOverlay } from './ConfettiOverlay';

// Celebratory / encouraging feedback banner shown after a pronunciation attempt --
// reused by Word of the Day, Practice, and Module pages so every result feels the same.
const CELEBRATE_EMOJI = ['🎉', '✨', '⭐', '🌟', '🎊', '👏', '💯', '🥳', '🏆'];
const ENCOURAGE_EMOJI = ['💪', '🌱', '👍', '🙂', '✨', '🤗'];

interface PronunciationFeedbackProps {
  correct: boolean;
  message: string;
  /** Clean version of `message` to speak aloud, when the displayed text has extra bits
   *  (like "+25 XP") that shouldn't be read out loud. Defaults to `message`. */
  speakText?: string;
  detail?: string;
  hint?: string;
  /** The correct word/phrase -- when set and the attempt was wrong, it's spoken aloud
   *  automatically (after the praise text, twice) so the student actually hears the right
   *  pronunciation, not just reads a hint telling them to go listen to it. A replay button
   *  is also shown either way. */
  word?: string;
  className?: string;
  /** Set false when this banner reflects a result that already existed when the component
   *  mounted (e.g. Word of the Day re-fetched already-completed on a page refresh) -- avoids
   *  re-speaking/re-confetti-ing a result the student already heard. Defaults to true, since
   *  every other caller only renders this right after a fresh attempt. */
  autoPlay?: boolean;
}

export function PronunciationFeedback({
  correct,
  message,
  speakText,
  detail,
  hint,
  word,
  className = '',
  autoPlay = true,
}: PronunciationFeedbackProps) {
  // Changes whenever a genuinely new attempt result comes in (not on unrelated parent
  // re-renders), re-triggering auto-speak and the full-page confetti below.
  const attemptToken = `${message}|${detail ?? ''}`;

  useEffect(() => {
    if (!autoPlay) return;
    const praise = speakText ?? message;
    // Always read the praise/encouragement text aloud. When wrong, follow it with "let's
    // repeat, listen well" and then the correct word spoken slowly, twice, so the student
    // actually hears the right pronunciation instead of just being told to go listen to it.
    const sequence =
      !correct && word
        ? [praise, 'Ulitin natin. Pakinggan mabuti.', { text: word, rate: 0.6 }, { text: word, rate: 0.6 }]
        : [praise];
    playTtsSequence(sequence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptToken, autoPlay]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl px-5 py-4 text-center font-semibold ${
        correct
          ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
          : 'bg-[var(--color-accent-soft)] text-[var(--color-brand-sun)]'
      } ${className}`}
    >
      <ConfettiOverlay trigger={autoPlay ? attemptToken : null} emojiPool={correct ? CELEBRATE_EMOJI : ENCOURAGE_EMOJI} />
      <div className="relative">
        <p className="text-base">{message}</p>
        {detail && <p className="mt-1 text-sm font-normal">{detail}</p>}
        {hint && <p className="mt-1 text-sm font-normal">{hint}</p>}
        {word && (
          <div className="mt-2 flex justify-center">
            <TTSButton text={word} />
          </div>
        )}
      </div>
    </div>
  );
}
