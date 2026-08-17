import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce, normalizeForCompare } from '../lib/speech';
import { TTSButton } from './a11y/TTSButton';
import { IconLabel } from './a11y/IconLabel';

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

export function PdfReadingAssistant({ material, assignmentId, mode, onAttemptRecorded }: PdfReadingAssistantProps) {
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [wideSpacing, setWideSpacing] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);

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
    listenOnce(
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFontSizeIndex((i) => Math.max(0, i - 1))}
          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
        >
          <IconLabel icon="🔽" label="Liitan ang Font" />
        </button>
        <button
          type="button"
          onClick={() => setFontSizeIndex((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
        >
          <IconLabel icon="🔼" label="Palakihin ang Font" />
        </button>
        <button
          type="button"
          onClick={() => setWideSpacing((v) => !v)}
          aria-pressed={wideSpacing}
          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
        >
          <IconLabel icon="↔️" label={wideSpacing ? 'Normal na Spacing' : 'Mas Malawak na Spacing'} />
        </button>
        <TTSButton text={text} />
      </div>

      {!text && (
        <p className="text-[var(--color-text-muted)]">Walang na-extract na teksto mula sa PDF na ito.</p>
      )}

      {text && (
        <p
          className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 leading-relaxed ${FONT_SIZES[fontSizeIndex]} ${
            wideSpacing ? 'tracking-wide' : ''
          }`}
          style={wideSpacing ? { lineHeight: 2.2, wordSpacing: '0.3em' } : { lineHeight: 1.8 }}
        >
          {words.map((word, i) => {
            const isMatched = spokenWordSet.has(normalizeForCompare(word));
            return (
              <span key={i} className={isMatched && lastTranscript ? 'bg-[var(--color-primary)]/20 rounded px-0.5' : ''}>
                {word}{' '}
              </span>
            );
          })}
        </p>
      )}

      {mode === 'student' && text && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={readAloud}
            disabled={listening}
            className="self-start rounded-full bg-[var(--color-primary)] px-6 py-3 text-white disabled:opacity-60"
          >
            <IconLabel icon="🎤" label={listening ? 'Nakikinig...' : 'Basahin nang Malakas'} />
          </button>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          {lastAccuracy !== null && (
            <p className="text-sm">
              Huling accuracy: <strong>{lastAccuracy}%</strong>{' '}
              {lastAccuracy >= 75 ? '🎉 Magaling!' : 'Subukan ulit para lumakas pa.'}
            </p>
          )}
        </div>
      )}

      {mode === 'preview' && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Preview mode — ipinapakita ang parehong reading assistant na makikita ng mag-aaral.
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
