import { useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce, normalizeForCompare } from '../lib/speech';
import { TTSButton } from './a11y/TTSButton';
import { IconLabel } from './a11y/IconLabel';
import { cardStyle } from '../lib/cardStyle';

interface PdfMaterialLike {
  id: string;
  title: string;
  extracted_text: string | null;
}

interface PdfReadingAssistantProps {
  material: PdfMaterialLike;
  /** Present only in student mode -- enables recording attempts + status updates. */
  assignmentId?: string;
  mode: 'student' | 'preview';
  onAttemptRecorded?: (accuracy: number) => void;
}

const FONT_SIZES = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
const FONT_SIZE_LABELS = ['S', 'M', 'L', 'XL'];

export function PdfReadingAssistant({ material, assignmentId, mode, onAttemptRecorded }: PdfReadingAssistantProps) {
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [wideSpacing, setWideSpacing] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const stopListeningRef = useRef<() => void>(() => {});

  const text = material.extracted_text?.trim() || '';
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const spokenWordSet = useMemo(() => new Set(normalizeForCompare(lastTranscript).split(' ').filter(Boolean)), [lastTranscript]);

  const readAloud = () => {
    if (!isSpeechRecognitionSupported()) {
      setError('Hindi suportado ng browser mo ang speech recognition. Subukan sa Chrome.');
      return;
    }
    setError(null);
    setListening(true);
    stopListeningRef.current = listenOnce(
      'fil-PH',
      async (transcript) => {
        setListening(false);
        setLastTranscript(transcript);
        const accuracy = computeAccuracy(text, transcript);
        setLastAccuracy(accuracy);
        onAttemptRecorded?.(accuracy);

        if (mode === 'student' && assignmentId) {
          const { error: insertErr } = await supabase.from('pdf_reading_attempts').insert({
            pdf_assignment_id: assignmentId,
            student_id: (await getOwnChildId()) ?? undefined,
            transcript,
            accuracy,
          });
          if (insertErr) {
            setError(insertErr.message);
            return;
          }
          if (accuracy >= 75) {
            await supabase.from('pdf_assignments').update({ status: 'completed' }).eq('id', assignmentId);
          } else {
            await supabase.from('pdf_assignments').update({ status: 'in_progress' }).eq('id', assignmentId);
          }
        }
      },
      (message) => {
        setListening(false);
        setError(message);
      },
    );
  };

  const stopListening = () => {
    stopListeningRef.current();
    setListening(false);
  };

  const isGood = lastAccuracy !== null && lastAccuracy >= 75;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-3" style={cardStyle('--color-brand-lavender', 8, 25)}>
        <div className="flex items-center gap-1 rounded-full border border-white/70 bg-white/70 p-1">
          <button
            type="button"
            onClick={() => setFontSizeIndex((i) => Math.max(0, i - 1))}
            disabled={fontSizeIndex === 0}
            title="Liitan ang Font"
            aria-label="Liitan ang Font"
            className="flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-white disabled:opacity-30"
          >
            A<span className="text-xs">−</span>
          </button>
          <span className="w-7 text-center text-xs font-semibold text-[var(--color-text-muted)]">
            {FONT_SIZE_LABELS[fontSizeIndex]}
          </span>
          <button
            type="button"
            onClick={() => setFontSizeIndex((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
            disabled={fontSizeIndex === FONT_SIZES.length - 1}
            title="Palakihin ang Font"
            aria-label="Palakihin ang Font"
            className="flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-white disabled:opacity-30"
          >
            A<span className="text-base">+</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setWideSpacing((v) => !v)}
          aria-pressed={wideSpacing}
          className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            wideSpacing
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-white/70 bg-white/70 hover:border-[var(--color-primary)]'
          }`}
        >
          <IconLabel icon="↔️" label={wideSpacing ? 'Normal na Spacing' : 'Mas Malawak na Spacing'} />
        </button>

        <TTSButton
          text={text}
          className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium hover:border-[var(--color-primary)]"
        />
      </div>

      {!text && (
        <p className="rounded-xl border p-6 text-center text-[var(--color-text-muted)]" style={cardStyle('--color-brand-coral')}>
          Walang na-extract na teksto mula sa PDF na ito.
        </p>
      )}

      {text && (
        <p
          className={`rounded-2xl border bg-[var(--color-surface)] p-7 shadow-card ${FONT_SIZES[fontSizeIndex]} ${
            wideSpacing ? 'tracking-wide' : ''
          }`}
          style={{
            borderColor: 'var(--color-border)',
            lineHeight: wideSpacing ? 2.2 : 1.9,
            wordSpacing: wideSpacing ? '0.3em' : undefined,
          }}
        >
          {words.map((word, i) => {
            const isMatched = spokenWordSet.has(normalizeForCompare(word));
            return (
              <span
                key={i}
                className={`rounded px-1 transition-colors ${
                  isMatched && lastTranscript ? 'bg-[var(--color-success-soft)] text-[var(--color-success)] font-semibold' : ''
                }`}
              >
                {word}{' '}
              </span>
            );
          })}
        </p>
      )}

      {mode === 'student' && text && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border p-6" style={cardStyle('--color-brand-sun', 6, 20)}>
          <button
            type="button"
            onClick={listening ? stopListening : readAloud}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${
              listening ? 'bg-[var(--color-danger)]' : ''
            }`}
            style={!listening ? { backgroundImage: 'linear-gradient(135deg, var(--color-hero-from), var(--color-hero-via))' } : undefined}
          >
            {listening && <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-danger)]/60" />}
            <span className="relative" aria-hidden="true">
              {listening ? '⏹️' : '🎤'}
            </span>
          </button>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            {listening ? 'Nakikinig... (pindutin para ihinto)' : 'Pindutin at basahin nang malakas'}
          </p>

          {error && (
            <p className="w-full rounded-xl bg-[var(--color-danger-soft)] px-4 py-2.5 text-center text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          {lastAccuracy !== null && (
            <div
              className={`w-full rounded-xl px-5 py-4 text-center ${
                isGood ? 'bg-[var(--color-success-soft)]' : 'bg-[var(--color-accent-soft)]'
              }`}
            >
              <p className={`text-2xl font-bold ${isGood ? 'text-[var(--color-success)]' : 'text-[var(--color-brand-sun)]'}`}>
                {lastAccuracy}%
              </p>
              <div className="mx-auto mt-2 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-white/70">
                <div
                  className={`h-full rounded-full transition-[width] ${isGood ? 'bg-[var(--color-success)]' : 'bg-[var(--color-brand-sun)]'}`}
                  style={{ width: `${Math.min(100, lastAccuracy)}%` }}
                />
              </div>
              <p className={`mt-2 text-sm font-medium ${isGood ? 'text-[var(--color-success)]' : 'text-[var(--color-brand-sun)]'}`}>
                {isGood ? '🎉 Magaling! Tapos na ang gawaing ito.' : 'Malapit na! Subukan ulit para lumakas pa.'}
              </p>
            </div>
          )}
        </div>
      )}

      {mode === 'preview' && (
        <p className="text-sm text-[var(--color-text-muted)]">
          <IconLabel icon="👀" label="Preview mode — ipinapakita ang parehong reading assistant na makikita ng mag-aaral." />
        </p>
      )}
    </div>
  );
}

async function getOwnChildId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('children').select('id').eq('auth_uid', user.id).maybeSingle();
  return data?.id ?? null;
}
