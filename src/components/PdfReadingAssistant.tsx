import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { computeAccuracy, isSpeechRecognitionSupported, listenOnce, normalizeForCompare } from '../lib/speech';
import { TTSButton } from './a11y/TTSButton';
import { IconLabel } from './a11y/IconLabel';
import { cardStyle } from '../lib/cardStyle';

interface PdfMaterialLike { id: string; title: string; extracted_text: string | null; preview_words?: string[]; estimated_minutes?: number | null; chunk_size?: number | null; }
interface Props { material: PdfMaterialLike; assignmentId?: string; mode: 'student' | 'preview'; onAttemptRecorded?: (accuracy: number) => void; }
const FONT_SIZES = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
const FONT_SIZE_LABELS = ['S', 'M', 'L', 'XL'];

function splitChunks(text: string, size: number) {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  return sentences.reduce<string[]>((all, _, index) => {
    if (index % size === 0) all.push(sentences.slice(index, index + size).join(' ').trim());
    return all;
  }, []).filter(Boolean);
}

export function PdfReadingAssistant({ material, assignmentId, mode, onAttemptRecorded }: Props) {
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [wideSpacing, setWideSpacing] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const text = material.extracted_text?.trim() || '';
  const chunks = useMemo(() => splitChunks(text, Math.min(3, Math.max(1, material.chunk_size || 1))), [text, material.chunk_size]);
  const current = chunks[chunkIndex] || '';
  const matched = useMemo(() => new Set(normalizeForCompare(transcript).split(' ').filter(Boolean)), [transcript]);

  useEffect(() => () => stopRef.current(), []);
  useEffect(() => {
    if (mode !== 'student' || !assignmentId || !chunks.length) return;
    void (async () => {
      const childId = await ownChildId(); if (!childId) return;
      const [{ data: assignment }, { data: attempts }] = await Promise.all([
        supabase.from('pdf_assignments').select('status').eq('id', assignmentId).maybeSingle(),
        supabase.from('pdf_reading_attempts').select('chunk_index').eq('pdf_assignment_id', assignmentId).eq('student_id', childId).not('chunk_index', 'is', null),
      ]);
      setSubmitted(['submitted', 'reviewed', 'completed'].includes(assignment?.status || ''));
      const done = new Set((attempts || []).map((row) => Number(row.chunk_index)).filter(Number.isInteger));
      setCompleted(done);
      const next = chunks.findIndex((_, index) => !done.has(index)); if (next >= 0) setChunkIndex(next);
    })();
  }, [assignmentId, chunks, mode]);

  const saveAttempt = async (spoken: string) => {
    const childId = await ownChildId(); if (!childId || !assignmentId) return;
    const score = computeAccuracy(current, spoken);
    const { error: insertError } = await supabase.from('pdf_reading_attempts').insert({ pdf_assignment_id: assignmentId, student_id: childId, transcript: spoken, accuracy: score, chunk_index: chunkIndex, chunk_text: current });
    if (insertError) throw insertError;
    await supabase.from('pdf_assignments').update({ status: 'in_progress' }).eq('id', assignmentId);
    setCompleted((old) => new Set(old).add(chunkIndex)); setTranscript(spoken); setAccuracy(score); onAttemptRecorded?.(score);
  };
  const read = () => {
    if (!isSpeechRecognitionSupported()) { setError('Hindi suportado ng browser mo ang speech recognition. Subukan sa Chrome.'); return; }
    setError(null); setListening(true);
    stopRef.current = listenOnce('fil-PH', async (spoken) => { setListening(false); try { await saveAttempt(spoken); } catch { setError('Hindi na-save ang bahaging ito. Subukan muli.'); } }, (message) => { setListening(false); setError(message); });
  };
  const move = (next: number) => { setChunkIndex(next); setAccuracy(null); setTranscript(''); setError(null); };
  const submit = async () => {
    if (!assignmentId || completed.size < chunks.length) return;
    const { error: submitError } = await supabase.from('pdf_assignments').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', assignmentId);
    if (submitError) { setError('Hindi maipasa ngayon. Subukan muli.'); return; } setSubmitted(true);
  };

  if (!text) return <p className="rounded-xl border p-6 text-center text-[var(--color-text-muted)]" style={cardStyle('--color-brand-coral')}>Walang na-extract na teksto mula sa PDF na ito.</p>;
  return <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3" style={cardStyle('--color-brand-lavender', 8, 25)}>
      <div><p className="font-bold">Handa na tayong magbasa!</p><p className="text-sm text-[var(--color-text-muted)]">Bahagi {chunkIndex + 1} ng {chunks.length}{material.estimated_minutes ? ` · ${material.estimated_minutes} minuto` : ''}</p></div>
      <div className="flex items-center gap-1 rounded-full border border-white/70 bg-white/70 p-1"><button type="button" onClick={() => setFontSizeIndex((i) => Math.max(0, i - 1))} disabled={fontSizeIndex === 0} className="h-8 w-8 rounded-full disabled:opacity-30">A−</button><span className="w-7 text-center text-xs">{FONT_SIZE_LABELS[fontSizeIndex]}</span><button type="button" onClick={() => setFontSizeIndex((i) => Math.min(3, i + 1))} disabled={fontSizeIndex === 3} className="h-8 w-8 rounded-full disabled:opacity-30">A+</button></div>
      <button type="button" onClick={() => setWideSpacing((value) => !value)} className="rounded-full border border-white/70 bg-white/70 px-3 py-2 text-sm"><IconLabel icon="↔️" label={wideSpacing ? 'Normal na Spacing' : 'Mas Malawak na Spacing'} /></button>
    </div>
    {material.preview_words?.length ? <div className="rounded-2xl border p-4" style={cardStyle('--color-brand-sun', 4, 18)}><p className="mb-2 font-bold">Mga salitang paghahandaan</p><div className="flex flex-wrap gap-2">{material.preview_words.slice(0, 5).map((word) => <span key={word} className="rounded-full bg-white px-3 py-1 text-sm font-semibold">{word}</span>)}</div></div> : null}
    <div className="rounded-2xl border bg-[var(--color-surface)] p-7 shadow-card"><p className="mb-3 text-sm font-bold text-[var(--color-primary)]">Basahin nang dahan-dahan</p><p className={`${FONT_SIZES[fontSizeIndex]} ${wideSpacing ? 'tracking-wide' : ''}`} style={{ lineHeight: wideSpacing ? 2.2 : 1.9, wordSpacing: wideSpacing ? '0.25em' : undefined }}>{current.split(/(\s+)/).map((part, index) => <span key={`${part}-${index}`} className={matched.has(normalizeForCompare(part)) ? 'rounded bg-[var(--color-success-soft)] font-semibold text-[var(--color-success)]' : ''}>{part}</span>)}</p></div>
    <div className="flex flex-wrap justify-center gap-3"><TTSButton text={current} className="rounded-full border bg-white px-5 py-3 text-sm font-bold" /><button type="button" onClick={listening ? () => { stopRef.current(); setListening(false); } : read} disabled={submitted || mode === 'preview'} className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"><IconLabel icon="🎙️" label={listening ? 'Itigil' : 'Ako Naman'} /></button></div>
    <p className="text-center text-sm text-[var(--color-text-muted)]">Pakinggan muna, saka basahin ang bahaging ito. Okay lang ang mag-retry.</p>
    {accuracy !== null && <div className="rounded-xl bg-[var(--color-success-soft)] p-4 text-center font-bold text-[var(--color-success)]">{accuracy >= 75 ? 'Magaling! Ituloy natin.' : 'Ayos lang! Pakinggan at subukan muli.'}</div>}
    {error && <p className="rounded-xl bg-[var(--color-danger-soft)] px-4 py-3 text-center text-sm text-[var(--color-danger)]">{error}</p>}
    <div className="flex items-center justify-between gap-3"><button type="button" onClick={() => move(Math.max(0, chunkIndex - 1))} disabled={chunkIndex === 0} className="rounded-full border px-4 py-2 disabled:opacity-40">← Bumalik</button>{chunkIndex < chunks.length - 1 ? <button type="button" onClick={() => move(chunkIndex + 1)} disabled={mode === 'student' && !completed.has(chunkIndex)} className="rounded-full bg-[var(--color-primary)] px-5 py-2 font-bold text-white disabled:opacity-40">Susunod →</button> : submitted ? <span className="font-bold text-[var(--color-success)]">Naipasa na sa guro ✓</span> : <button type="button" onClick={submit} disabled={mode === 'student' && completed.size < chunks.length} className="rounded-full bg-[var(--color-success)] px-5 py-2 font-bold text-white disabled:opacity-40">Ipasa sa Guro</button>}</div>
  </div>;
}
async function ownChildId(): Promise<string | null> { const { data: { user } } = await supabase.auth.getUser(); if (!user) return null; const { data } = await supabase.from('children').select('id').eq('auth_uid', user.id).maybeSingle(); return data?.id ?? null; }
