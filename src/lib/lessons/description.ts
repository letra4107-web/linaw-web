export type DescriptionPart = { kind: 'text' | 'bold' | 'italic' | 'underline' | 'link'; text: string; href?: string };

/** A small, text-only formatting subset; never interprets HTML. */
export function descriptionParts(value: string): DescriptionPart[] {
  const pattern = /\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const result: DescriptionPart[] = [];
  let start = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > start) result.push({ kind: 'text', text: value.slice(start, match.index) });
    if (match[1]) result.push({ kind: 'bold', text: match[1] });
    else if (match[2]) result.push({ kind: 'underline', text: match[2] });
    else if (match[3]) result.push({ kind: 'italic', text: match[3] });
    else result.push({ kind: 'link', text: match[4], href: match[5] });
    start = match.index + match[0].length;
  }
  if (start < value.length) result.push({ kind: 'text', text: value.slice(start) });
  return result;
}

export function insertDescriptionFormat(value: string, start: number, end: number, kind: 'bold' | 'italic' | 'underline' | 'bullet' | 'number' | 'indent' | 'emoji', maxLength = 500) {
  const selected = value.slice(start, end);
  const marks = { bold: '**', italic: '*', underline: '__' };
  let replacement = '';
  let cursorStart = start;
  let cursorEnd = end;
  if (kind === 'bold' || kind === 'italic' || kind === 'underline') {
    const mark = marks[kind];
    replacement = `${mark}${selected}${mark}`;
    cursorStart += mark.length; cursorEnd += mark.length;
  } else if (kind === 'emoji') {
    replacement = `${selected} 😊`; cursorStart = cursorEnd = start + replacement.length;
  } else {
    const lines = (selected || '').split('\n');
    replacement = lines.map((line, index) => `${kind === 'bullet' ? '• ' : kind === 'number' ? `${index + 1}. ` : '  '}${line}`).join('\n');
    cursorStart = start; cursorEnd = start + replacement.length;
  }
  const next = value.slice(0, start) + replacement + value.slice(end);
  return next.length > maxLength ? null : { value: next, start: cursorStart, end: cursorEnd };
}
