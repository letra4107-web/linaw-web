import { useEffect, useId, useRef, useState } from 'react';
import { FileText, Trash2, UploadCloud } from 'lucide-react';
import { validateLessonFile, LESSON_FILE_ACCEPT } from '../../lib/lessons/upload';
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
      await validateLessonFile(file);
      if (current === revision.current) onChange({ kind: 'replace', file });
    } catch (error) {
      if (current === revision.current) setError(tagalogError(error));
    } finally { if (current === revision.current) onChecking(false); }
  }
  const pendingName = change.kind === 'replace' ? change.file.name : change.kind === 'remove' ? null : hasPdf ? fileName || 'Lesson file' : null;
  return <section className="tl-pdf-editor" aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`}>File ng aralin</h3>
    <p className="tl-pdf-current"><FileText aria-hidden />{pendingName || 'Walang kalakip na file.'}</p>
    <p id={`${id}-help`}>{change.kind === 'remove' ? 'Aalisin ang file kapag na-save. Magiging draft ang aralin.' : change.kind === 'replace' ? 'Ipapalit ang napiling file kapag na-save ang mga pagbabago.' : 'Pumili ng kapalit na file o alisin ang kasalukuyang file. PDF, Word, PowerPoint, Excel, JPG o PNG, hanggang 50 MB.'}</p>
    <p>PDF version ang ise-save at mabubuksan ng mga mag-aaral. Hindi ise-save ang orihinal na Office o image file.</p>
    <div className="tl-pdf-buttons">
      <label className="sr-only" htmlFor={id}>Pumili ng kapalit na file</label>
      <input ref={input} id={id} type="file" className="sr-only" accept={LESSON_FILE_ACCEPT} disabled={disabled || checking} aria-describedby={`${id}-help`} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void choose(file); }} />
      <button type="button" className="tl-secondary" disabled={disabled || checking} onClick={() => input.current?.click()}><UploadCloud aria-hidden />{checking ? 'Sinusuri ang file...' : pendingName ? 'Palitan ang file' : 'Magdagdag ng file'}</button>
      {pendingName && <button type="button" className="tl-secondary" disabled={disabled || checking} onClick={() => { setError(''); onChange(hasPdf ? { kind: 'remove' } : { kind: 'keep' }); }}><Trash2 aria-hidden />Alisin ang file</button>}
      {change.kind !== 'keep' && <button type="button" className="tl-secondary" disabled={disabled || checking} onClick={() => { setError(''); onChange({ kind: 'keep' }); }}>Kanselahin ang pagbabago sa file</button>}
    </div>
    {error && <p className="tl-error" role="alert">{error}</p>}
  </section>;
}
