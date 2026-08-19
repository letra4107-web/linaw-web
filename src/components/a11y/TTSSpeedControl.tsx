import { useState } from 'react';
import { getTtsRate, setTtsRate, TTS_RATE_PRESETS } from '../../lib/ttsSettings';
import { IconLabel } from './IconLabel';

/** Segmented control for the app-wide "how fast should text be read aloud" preference. */
export function TTSSpeedControl() {
  const [rate, setRate] = useState(getTtsRate);

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Bilis ng Pagbasa ng Boses">
      {TTS_RATE_PRESETS.map((preset) => {
        const active = rate === preset.value;
        return (
          <button
            key={preset.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              setTtsRate(preset.value);
              setRate(preset.value);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
            }`}
          >
            <IconLabel icon={preset.icon} label={preset.label} />
          </button>
        );
      })}
    </div>
  );
}
