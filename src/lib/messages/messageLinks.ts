/** Preserve message text; only http(s) addresses become links. Never render HTML. */
export function messageLinkParts(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  let cursor = 0;
  for (const match of text.matchAll(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi)) {
    let address = match[0].replace(/[.,!?;:]+$/, '');
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
      while (address.endsWith(close) && address.split(close).length > address.split(open).length) address = address.slice(0, -1);
    }
    try {
      const url = new URL(/^www\./i.test(address) ? `https://${address}` : address);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) continue;
      if (match.index! > cursor) parts.push({ text: text.slice(cursor, match.index) });
      parts.push({ text: address, href: url.href });
      cursor = match.index! + address.length;
    } catch { /* Malformed addresses remain plain text. */ }
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
