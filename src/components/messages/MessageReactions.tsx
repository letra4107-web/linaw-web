import { useRef } from 'react';
import { SmilePlus } from 'lucide-react';
import type { ReactionTarget, useMessageReactions } from '../../lib/messages/useMessageReactions';
import './message-reactions.css';

const EMOJIS = ['❤️', '👍', '😊', '🎉', '🙏'] as const;
const LABELS = ['Puso', 'Like', 'Masaya', 'Pagbati', 'Salamat'];

export function MessageReactions({ target, reactions }: { target: ReactionTarget; reactions: ReturnType<typeof useMessageReactions> }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const rows = reactions.forTarget(target);
  const own = rows.find((row) => row.user_id === reactions.userId);
  return <div className="message-reactions" aria-label="Reactions sa mensahe">
    {EMOJIS.map((emoji, index) => {
      const count = rows.filter((row) => row.emoji === emoji).length;
      return count > 0 ? <button key={emoji} type="button" className="message-reaction-count" disabled={!reactions.ready || reactions.busy} aria-label={`${LABELS[index]}: ${count} reaction${count > 1 ? 's' : ''}`} aria-pressed={own?.emoji === emoji} onClick={() => reactions.react(target, emoji)}><span aria-hidden="true">{emoji}</span> {count}</button> : null;
    })}
    <details ref={menuRef} className="message-reaction-picker"><summary aria-label="Mag-react sa mensahe"><SmilePlus size={17} aria-hidden="true" /></summary><div>
      {!reactions.ready && <p>Hindi pa available ang reactions.</p>}
      {EMOJIS.map((emoji, index) => <button key={emoji} type="button" disabled={!reactions.ready || reactions.busy} aria-label={LABELS[index]} aria-pressed={own?.emoji === emoji} onClick={() => { reactions.react(target, emoji); if (menuRef.current) menuRef.current.open = false; }}>{emoji}</button>)}
    </div></details>
  </div>;
}
