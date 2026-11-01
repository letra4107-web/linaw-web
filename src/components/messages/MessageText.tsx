import { messageLinkParts } from '../../lib/messages/messageLinks';

export function MessageText({ text }: { text: string }) {
  return <>{messageLinkParts(text).map((part, index) => part.href
    ? <a key={index} className="message-text-link" href={part.href} target="_blank" rel="noopener noreferrer">{part.text}</a>
    : <span key={index}>{part.text}</span>)}</>;
}
