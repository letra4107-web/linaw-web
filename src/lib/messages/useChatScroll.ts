import { useEffect, useLayoutEffect, useRef } from 'react';

/** Keep new messages visible when already reading the latest messages. */
export function useChatScroll(conversationKey: string, latestId?: string) {
  const ref = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previous = useRef('');
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const track = () => { nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100; };
    node.addEventListener('scroll', track, { passive: true });
    return () => node.removeEventListener('scroll', track);
  }, [conversationKey]);
  useLayoutEffect(() => {
    const node = ref.current;
    if (node && (previous.current !== conversationKey || nearBottom.current)) {
      node.scrollTop = node.scrollHeight;
      nearBottom.current = true;
    }
    previous.current = conversationKey;
  }, [conversationKey, latestId]);
  return ref;
}
