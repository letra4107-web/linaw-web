import { getReadingAssistantSettings } from '../../lib/readingAssistantSettings';
import { tagalogError } from '../../lib/validationMessages';
import { useEffect, useRef, useState } from 'react';
import { needsSlowFilipinoPronunciation } from '../../lib/filipinoSyllables';
import { playTtsSequence } from '../../lib/ttsPlayer';
import { IconLabel } from './IconLabel';

export function SlowTTSButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    setPlaying(false);
    setError('');
    return () => { controller.current?.abort(); controller.current = null; };
  }, [text]);
  if (!needsSlowFilipinoPronunciation(text)) return null;
  return <><button type="button" disabled={playing} onClick={async () => {
    if (controller.current) return;
    const request = new AbortController(); controller.current = request;
    setPlaying(true); setError('');
    try { await playTtsSequence([{ text, rate: getReadingAssistantSettings().slowReadingRate }], 'fil-PH', { signal: request.signal, reportErrors: true }); }
    catch (error) { if (!request.signal.aborted) setError(error instanceof Error ? tagalogError(error) : 'Hindi tumugtog ang tunog. Subukan muli.'); }
    finally { if (!request.signal.aborted) { controller.current = null; setPlaying(false); } }
  }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/70 px-3 py-1.5 text-sm hover:border-[var(--color-primary)] disabled:opacity-60">
    <IconLabel icon="🐢" label={playing ? 'Binibigkas nang mabagal...' : 'Bigkasin nang mabagal'} />
  </button>{error && <span role="alert" className="text-sm text-[var(--color-danger)]">{error}</span>}</>;
}
