import { useId, useRef, useState } from 'react';
import { Bold, IndentIncrease, Italic, Link2, List, ListOrdered, Smile, Underline } from 'lucide-react';
import { descriptionParts, insertDescriptionFormat } from '../../lib/lessons/description';

export function LessonDescription({ value }: { value: string }) {
  return <div className="tl-description-preview">{descriptionParts(value).map((part, index) => part.kind === 'bold' ? <strong key={index}>{part.text}</strong> : part.kind === 'italic' ? <em key={index}>{part.text}</em> : part.kind === 'underline' ? <u key={index}>{part.text}</u> : part.kind === 'link' ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">{part.text}</a> : <span key={index}>{part.text}</span>)}</div>;
}

export function LessonDescriptionEditor({ value, onChange, disabled = false, maxLength = 500 }: { value: string; onChange: (value: string) => void; disabled?: boolean; maxLength?: number }) {
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const savedSelection = useRef({ start: 0, end: 0 });
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  function remember() { if (input.current) savedSelection.current = { start: input.current.selectionStart, end: input.current.selectionEnd }; }
  function format(kind: Parameters<typeof insertDescriptionFormat>[3]) {
    const { start, end } = savedSelection.current;
    const result = insertDescriptionFormat(value, start, end, kind, maxLength);
    if (!result) { setMessage(`Hanggang ${maxLength} character lamang.`); return; }
    onChange(result.value); setMessage('');
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(result.start, result.end); remember(); });
  }
  const tools = [{ Icon: Bold, kind: 'bold', label: 'Bold' }, { Icon: Italic, kind: 'italic', label: 'Italic' }, { Icon: Underline, kind: 'underline', label: 'Underline' }, { Icon: List, kind: 'bullet', label: 'Bullet list' }, { Icon: ListOrdered, kind: 'number', label: 'Numbered list' }, { Icon: IndentIncrease, kind: 'indent', label: 'Indent' }] as const;
  return <div className="tl-description-field"><label htmlFor={id}>Deskripsyon <span aria-hidden="true">*</span></label><div className="tl-editor"><div className="tl-editor-toolbar" role="group" aria-label="Ayos ng deskripsyon">{tools.map(({ Icon, kind, label }) => <button type="button" key={kind} aria-label={label} title={label} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => format(kind)}><Icon aria-hidden /></button>)}<i aria-hidden="true" /><button type="button" aria-label="Magdagdag ng link" title="Magdagdag ng link" aria-expanded={linkOpen} disabled={disabled} onClick={() => setLinkOpen((open) => !open)}><Link2 aria-hidden /></button><button type="button" aria-label="Magdagdag ng emoji" title="Magdagdag ng emoji" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => format('emoji')}><Smile aria-hidden /></button></div>
      {linkOpen && <div className="tl-editor-link"><label htmlFor={`${id}-link`} className="sr-only">Link URL</label><input id={`${id}-link`} type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://..." disabled={disabled} /><button type="button" disabled={disabled} onClick={() => {
        try {
          const url = new URL(link); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid');
          const { start, end } = savedSelection.current;
          const next = value.slice(0, start) + `[${value.slice(start, end) || 'Link'}](${url.href})` + value.slice(end);
          if (next.length > maxLength) { setMessage(`Hanggang ${maxLength} character lamang.`); return; }
          onChange(next); setLinkOpen(false); setLink(''); setMessage(''); input.current?.focus();
        } catch { setMessage('Maglagay ng wastong http o https na link.'); }
      }}>Ilagay</button></div>}
      <textarea ref={input} id={id} value={value} onChange={(event) => { onChange(event.target.value); setMessage(''); }} onSelect={remember} onKeyUp={remember} onClick={remember} onBlur={remember} placeholder="Maglagay ng maikling paglalarawan ng aralin..." required maxLength={maxLength} disabled={disabled} aria-describedby={`${id}-count`} /><small id={`${id}-count`}>{value.length}/{maxLength}</small></div>{message && <p className="tl-editor-notice" role="status">{message}</p>}</div>;
}
