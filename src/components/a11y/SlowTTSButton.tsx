import { useState } from 'react';
import { needsSlowFilipinoPronunciation } from '../../lib/filipinoSyllables';
import { playTts } from '../../lib/ttsPlayer';
import { IconLabel } from './IconLabel';

export function SlowTTSButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  if (!needsSlowFilipinoPronunciation(text)) return null;
  return <button type="button" disabled={playing} onClick={async () => { setPlaying(true); try { await playTts(text, 0.6, 'fil-PH'); } finally { setPlaying(false); } }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/70 px-3 py-1.5 text-sm hover:border-[var(--color-primary)] disabled:opacity-60">
    <IconLabel icon="🐢" label={playing ? 'Binibigkas nang mabagal...' : 'Bigkasin nang mabagal'} />
  </button>;
}
