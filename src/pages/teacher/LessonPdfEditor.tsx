import { useEffect, useId, useRef, useState } from 'react';
import { FileText, Trash2, UploadCloud } from 'lucide-react';
import { validateLessonPdf } from '../../lib/lessons/upload';
import type { LessonPdfChange } from '../../lib/lessons/edit';
import { tagalogError } from '../../lib/validationMessages';

export function LessonPdfEditor({ fileName, hasPdf, change, onChange, disabled, checking, onChecking }: {
  fileName: string | null; hasPdf: boolean; change: LessonPdfChange;
  onChange: (change: LessonPdfChange) => void; disabled: boolean;
  checking: boolean; onChecking: (checking: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const id = useId();
  const [error, setError] = useState('');
  useEffect(() => () => { revision.current++; }, []);
  async function choose(file: File | undefined) {
    if (!file) return;
    const current = ++revision.current;
    setError(''); onChecking(true);
    try {
      await validateLessonPdf(file);
      if (current === revision.current) onChange({ kind: 'replace', file });
    } catch (error) {
      if (current === revision.current) setError(tagalogError(error));
    } finally { if (current === revision.current) onChecking(false); }
  }
  const pendingName = change.kind === 'replace' ? change.file.name : change.kind === 'remove' ? null : hasPdf ? fileName || 'Lesson PDF' : null;
  return <section className="tl-pdf-editor" aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`}>PDF ng aralin</h3>
    <p className="tl-pdf-current"><FileText aria-hidden />{pendingName || 'Walang kalakip na PDF.'}</p>
    <p id={`${id}-help`}>{change.kind === 'remove' ? 'Aalisin ang PDF kapag na-save. Magiging draft ang aralin.' : change.kind === 'replace' ? 'Ipapalit ang napiling PDF kapag na-save ang mga pagbabago.' : 'Pumili ng kapalit na PDF o alisin ang kasalukuyang file. PDF lamang, hanggang 50 MB.'}</p>
    <div className="tl-pdf-buttons">
      <label className="sr-only" htmlFor={id}>Pumili ng kapalit na PDF</label>
      <input ref={input} id={id} type="file" className="sr-only" accept=".pdf,application/pdf" disabled={disabled || checking} aria-describedby={`${id}-help`} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void choose(file); }} />
      <button type="button" className="tl-secondary" disabled={disabled || checking} onClick={() => input.current?.click()}><UploadCloud aria-hidden />{checking ? 'Sinusuri ang PDF...' : pendingName ? 'Palitan ang PDF' : 'Magdagdag ng PDF'}</button>
      {pendingName && <button type="button" className="tl-secondary" disabled={disabled || checking} onClick={() => { setError(''); onChange(hasPdf ? { kind: 'remove' } : { kind: 'keep' }); }}><Trash2 aria-hidden />Alisin ang PDF</button>}
      {change.kind !== 'keep' && <button type="button" className="tl-secondary" disabled={disabled || checking} onClick={() => { setError(''); onChange({ kind: 'keep' }); }}>Kanselahin ang pagbabago sa PDF</button>}
    </div>
    {error && <p className="tl-error" role="alert">{error}</p>}
  </section>;
}
