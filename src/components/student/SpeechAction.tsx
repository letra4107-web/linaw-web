import { useId } from 'react';

type SpeechActionState = 'ready' | 'listening' | 'processing';

interface SpeechActionProps {
  state: SpeechActionState;
  onClick: () => void;
  disabled?: boolean;
  onStopLabel?: string;
  className?: string;
}

/** A calm, consistent speech-control state model for student reading activities. */
export function SpeechAction({ state, onClick, disabled = false, onStopLabel = 'Itigil ang pakikinig', className = '' }: SpeechActionProps) {
  const helpId = useId();
  const listening = state === 'listening';
  const processing = state === 'processing';
  const label = processing ? 'Sinusuri ang sagot...' : listening ? onStopLabel : 'Bigkasin';
  const help = processing ? 'Sandali lang, sine-save ang iyong sagot.' : listening ? 'Nakikinig... pindutin para ihinto.' : 'Pindutin ang mic kapag handa ka na.';

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || processing}
        aria-describedby={helpId}
        className={`relative flex h-24 w-24 items-center justify-center rounded-full text-3xl text-white shadow-raised transition-transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-70 motion-reduce:transition-none ${listening ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-primary)]'}`}
      >
        {listening && <span aria-hidden="true" className="absolute inset-2 rounded-full border-2 border-white/70 motion-safe:animate-pulse" />}
        <span className="relative" aria-hidden="true">{processing ? '…' : listening ? '■' : '🎙️'}</span>
      </button>
      <p id={helpId} aria-live="polite" className="text-center text-sm font-semibold text-[var(--color-text-muted)]">
        {help}
      </p>
      <span className="sr-only">{label}</span>
    </div>
  );
}
