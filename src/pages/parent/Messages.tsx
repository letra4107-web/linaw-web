import { tagalogError } from '../../lib/validationMessages';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ChevronRight, EllipsisVertical, FileText, Heart, Paperclip, Plus, Search, Send, Smile, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import noActivitiesArt from '../../assets/parent/no activities.png';
import messagesFamilyArt from '../../assets/parent/messages-family-reading.png';
import messagesStarArt from '../../assets/parent/messages-star-books.png';
import { loadMessageReplies } from '../../lib/messages/replies';
import { MessageReactions } from '../../components/messages/MessageReactions';
import { useMessageReactions } from '../../lib/messages/useMessageReactions';
import { MESSAGE_REFRESH_MS, useMessageUpdates } from '../../lib/messages/useMessageUpdates';
import { useChatScroll } from '../../lib/messages/useChatScroll';
import { loadTeacherMessages } from '../../lib/messages/teacherAttachments';
import type { StoredTeacherMessage } from '../../lib/messages/teacherAttachments';
import { isAnnouncement, parentConversations } from '../../lib/messages/parentConversations';
import { MessageText } from '../../components/messages/MessageText';
import { MessageAvatar } from '../../components/messages/MessageAvatar';
import { useMessageProfilePhotos } from '../../lib/messages/useMessageProfilePhotos';
import './messages-reference.css';

type MessageRow = StoredTeacherMessage;
interface ReplySubmission { thread: MessageRow; text: string; attachment: File | null; parentId: string; }
type Filter = 'all' | 'teacher' | 'announcement';
const dateTime = (value: string) => new Intl.DateTimeFormat('fil-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const dateShort = (value: string) => new Intl.DateTimeFormat('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));

function AttachmentLink({ path, name }: { path: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const access = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.storage.from('parent-message-files').createSignedUrl(path, 60);
      if (error || !data?.signedUrl) throw new Error(tagalogError(error) ?? 'Hindi mabuksan ang attachment.');
      return data.signedUrl;
    },
    onSuccess: setUrl,
  });
  useEffect(() => {
    if (!url) return;
    const expires = window.setTimeout(() => setUrl(null), 55_000);
    return () => window.clearTimeout(expires);
  }, [url]);
  const content = <><span><FileText size={25} /></span><b>{name}</b><Paperclip size={17} /></>;
  return <>
    {url ? <a className="messages-file-link" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Buksan ang attachment: ${name}`}>{content}</a> : <button type="button" className="messages-file-link" disabled={access.isPending} onClick={() => access.mutate()} aria-label={`Ihanda ang attachment: ${name}`}>{content}</button>}
    <small role="status">{access.isPending ? 'Inihahanda ang file...' : url ? 'Handa na. Pindutin ang file upang buksan.' : access.error ? tagalogError(access.error) : ''}</small>
  </>;
}

export default function ParentMessages() {
  const { user, identity } = useAuth();
  useMessageUpdates('parent');
  const photos = useMessageProfilePhotos('parent');
  const queryClient = useQueryClient();
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [childChoices, setChildChoices] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Record<string, File | null>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const emojiRef = useRef<HTMLDetailsElement>(null);

  const { data: messageResult, isLoading, error, refetch } = useQuery({
    queryKey: ['parent-messages', user?.id],
    queryFn: () => loadTeacherMessages(supabase, { parentId: user!.id, includeChildren: true }),
    enabled: Boolean(user),
    // Teacher follow-ups are delivered through teacher_messages. Refresh the
    // parent inbox while it is open so a newly sent reply becomes visible
    // without requiring the parent to reload the page.
    refetchInterval: MESSAGE_REFRESH_MS,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
  const messages = messageResult?.rows;
  const conversations = useMemo(() => parentConversations(messages ?? []), [messages]);
  const teacherIds = useMemo(() => Array.from(new Set((messages ?? []).map((message) => message.teacher_id))), [messages]);
  const { data: teacherNames } = useQuery({
    queryKey: ['parent-messages-teachers', teacherIds],
    queryFn: async () => {
      if (!teacherIds.length) return {} as Record<string, string>;
      const { data, error: queryError } = await supabase.from('users').select('id, name').in('id', teacherIds);
      if (queryError) throw queryError;
      return Object.fromEntries((data ?? []).map((teacher) => [teacher.id, teacher.name ?? 'Guro']));
    }, enabled: teacherIds.length > 0,
  });
  const markRead = useMutation({ mutationFn: async (ids: string[]) => { if (!ids.length) return; const { error: updateError } = await supabase.from('teacher_messages').update({ read: true }).in('id', ids).eq('parent_id', user!.id); if (updateError) throw updateError; }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parent-messages'] }) });
  const visibleMessages = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return conversations.filter((conversation) => {
      const teacher = teacherNames?.[conversation.teacherId] ?? 'Guro';
      const matchesFilter = filter === 'all' || (filter === 'teacher' && conversation.hasTeacherMessages) || (filter === 'announcement' && conversation.hasAnnouncements);
      return matchesFilter && (!needle || `${teacher} ${conversation.children.map(child => child.name).join(' ')} ${conversation.messages.map(message => `${message.message} ${message.attachment_name ?? ''}`).join(' ')}`.toLocaleLowerCase().includes(needle));
    });
  }, [filter, conversations, search, teacherNames]);
  useEffect(() => { if (!visibleMessages.length) setSelectedId(null); else if (!selectedId || !visibleMessages.some((conversation) => conversation.teacherId === selectedId)) setSelectedId(visibleMessages[0].teacherId); }, [selectedId, visibleMessages]);
  const selectedConversation = visibleMessages.find((conversation) => conversation.teacherId === selectedId) ?? visibleMessages[0];
  useEffect(() => {
    if (selectedConversation) setChildChoices(values => values[selectedConversation.teacherId] ? values : { ...values, [selectedConversation.teacherId]: selectedConversation.latest.child_id });
  }, [selectedConversation]);
  const selectedTeacherId = selectedConversation?.teacherId;
  const selectedChildId = selectedTeacherId ? childChoices[selectedTeacherId] ?? selectedConversation.latest.child_id : undefined;
  const selected = selectedConversation?.messages.find(message => message.child_id === selectedChildId) ?? selectedConversation?.latest;
  const conversationMessages = useMemo(() => selectedConversation?.messages ?? [], [selectedConversation]);
  const conversationIds = conversationMessages.map((message) => message.id).sort();
  const draft = selectedTeacherId ? drafts[selectedTeacherId] ?? '' : '';
  const attachment = selectedTeacherId ? attachments[selectedTeacherId] ?? null : null;
  const setDraft = (text: string) => { if (selectedTeacherId) setDrafts((values) => ({ ...values, [selectedTeacherId]: text })); };
  const setAttachment = (file: File | null) => { if (selectedTeacherId) setAttachments((values) => ({ ...values, [selectedTeacherId]: file })); };
  useEffect(() => { setChatSearch(''); setChatSearchOpen(false); setMenuOpen(false); setNotice(null); if (emojiRef.current) emojiRef.current.open = false; if (attachmentRef.current) attachmentRef.current.value = ''; }, [selectedTeacherId]);
  const { data: replyResult, error: repliesError, refetch: refetchReplies } = useQuery({
    queryKey: ['parent-message-replies', user?.id, selectedTeacherId, conversationIds],
    queryFn: () => loadMessageReplies(supabase, conversationIds),
    enabled: Boolean(selected),
    // Keep the current history visible while fetching a new teacher follow-up.
    // Never carry replies into another teacher's conversation.
    placeholderData: (previous, query) => query && query.queryKey[1] === user?.id && query.queryKey[2] === selectedTeacherId ? previous : undefined,
    refetchInterval: MESSAGE_REFRESH_MS, refetchOnWindowFocus: 'always', refetchOnReconnect: 'always',
  });
  const replies = replyResult?.rows;
  const attachmentsAvailable = replyResult?.attachmentsAvailable === true;
  const reactions = useMessageReactions(selected ? [...conversationMessages.map((message) => ({ kind: 'teacher' as const, id: message.id })), ...(replies ?? []).map((reply) => ({ kind: 'reply' as const, id: reply.id }))] : []);
  const sendReply = useMutation({
    mutationFn: async ({ thread, text, attachment: file, parentId }: ReplySubmission) => {
      let attachmentPath: string | null = null;
      try {
        if (file) {
          if (!attachmentsAvailable) throw new Error('Hindi pa available ang attachments. Maaari ka munang magpadala ng text.');
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
          attachmentPath = `${parentId}/${crypto.randomUUID()}-${safeName}`;
          const { error: uploadError } = await supabase.storage.from('parent-message-files').upload(attachmentPath, file, { contentType: file.type || 'application/octet-stream', upsert: false });
          if (uploadError) throw uploadError;
        }
        const { error: insertError } = await supabase.from('parent_teacher_replies').insert({ teacher_message_id: thread.id, teacher_id: thread.teacher_id, child_id: thread.child_id, parent_id: parentId, message: text, ...(file ? { attachment_name: file.name, attachment_path: attachmentPath } : {}) });
        if (insertError) throw insertError;
      } catch (replyError) { if (attachmentPath) await supabase.storage.from('parent-message-files').remove([attachmentPath]); throw replyError; }
    },
    onSuccess: (_data, submission) => { setDrafts((values) => ({ ...values, [submission.thread.teacher_id]: '' })); setAttachments((values) => ({ ...values, [submission.thread.teacher_id]: null })); if (selectedTeacherId === submission.thread.teacher_id) { if (attachmentRef.current) attachmentRef.current.value = ''; setNotice('Naipadala ang reply mo sa guro.'); } void queryClient.invalidateQueries({ queryKey: ['parent-message-replies'] }); },
    onError: (replyError: Error) => setNotice(tagalogError(replyError)),
    onSettled: () => { submittingRef.current = false; },
  });
  const teacherCount = conversations.filter(conversation => conversation.hasTeacherMessages).length;
  const announcementCount = conversations.filter(conversation => conversation.hasAnnouncements).length;
  const selectedTeacher = selected ? teacherNames?.[selected.teacher_id] ?? 'Guro' : 'Pumili ng mensahe';
  const chatNeedle = chatSearch.trim().toLocaleLowerCase();
  const matchesChat = (text: string) => !chatNeedle || text.toLocaleLowerCase().includes(chatNeedle);
  const conversation = [
    ...conversationMessages.map((message) => ({ kind: 'teacher' as const, ...message })),
    ...(replies ?? []).map((reply) => ({ kind: 'reply' as const, ...reply })),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const visibleConversation = conversation.filter((item) => matchesChat(`${item.message} ${item.attachment_name ?? ''}`));
  const latest = visibleConversation.at(-1);
  const chatRef = useChatScroll(selectedTeacherId ?? '', latest ? `${latest.kind}:${latest.id}:${visibleConversation.length}` : undefined);
  const addEmoji = (emoji: string) => {
    if (sendReply.isPending) return;
    const field = composeRef.current;
    const start = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? start;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    if (next.length > 500) return;
    setDraft(next);
    setNotice(null);
    if (emojiRef.current) emojiRef.current.open = false;
    field?.focus();
    requestAnimationFrame(() => field?.setSelectionRange(start + emoji.length, start + emoji.length));
  };
  const selectMessage = (conversation: (typeof conversations)[number]) => { setSelectedId(conversation.teacherId); setMenuOpen(false); if (conversation.unreadIds.length) markRead.mutate(conversation.unreadIds); };
  const handleReply = () => { if (submittingRef.current || sendReply.isPending) return; if (!selected || !user) { setNotice('Pumili muna ng mensahe mula sa guro.'); return; } if (!draft.trim()) { setNotice('Sumulat muna ng mensahe para sa guro.'); composeRef.current?.focus(); return; } submittingRef.current = true; sendReply.mutate({ thread: selected, text: draft.trim(), attachment, parentId: user.id }); };
  const chooseAttachment = (file?: File) => { if (!file) return; if (file.size > 5 * 1024 * 1024) { setNotice('Hanggang 5 MB lang ang maaaring i-attach.'); return; } setAttachment(file); setNotice(null); };

  return (
    <div className="parent-messages-reference">
      <header className="messages-hero">
        <img className="messages-banner-illustration" src={messagesFamilyArt} alt="" aria-hidden="true" fetchPriority="high" decoding="async" />
        <div className="messages-hero-copy">
          <p>KOMUNIKASYON</p>
          <h1>Mga <em>Mensahe</em> <Send aria-hidden="true" /></h1>
          <span>Makipag-ugnayan sa mga guro para sa updates, tanong, at suporta sa pag-aaral ng iyong anak.</span>
        </div>
        <aside className="messages-hero-note">Mas magandang pag-unlad para sa inyong anak, sama-sama! <Heart size={18} fill="currentColor" aria-hidden="true" /></aside>
      </header>
      {photos.error && <div className="messages-error" role="status">Hindi ma-load ang profile photos. <button type="button" onClick={() => void photos.refetch()}>Subukan muli ang photos</button></div>}
      {error && <div className="messages-error" role="alert">Hindi ma-load ang mga mensahe. <button type="button" onClick={() => void refetch()}>Subukan muli</button></div>}
      <div className="messages-main-grid">
        <section className="messages-inbox" aria-label="Inbox ng mga mensahe">
          <div className="messages-inbox-heading">
            <h2>Mga Mensahe</h2>
            <button type="button" disabled={!selected || sendReply.isPending} title={!selected ? 'Kailangan muna ng mensahe mula sa guro bago sumagot.' : undefined} onClick={() => { setNotice(null); composeRef.current?.focus(); }}><Plus size={17} /> Sumagot sa Guro</button>
          </div>
          <label className="messages-search">
            <Search size={19} aria-hidden="true" />
            <input disabled={sendReply.isPending} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Maghanap ng mensahe..." aria-label="Maghanap ng mensahe" />
          </label>
          <div className="messages-filter" role="tablist" aria-label="Salain ang mga mensahe" onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || sendReply.isPending) return;
            event.preventDefault();
            const filters: Filter[] = ['all', 'teacher', 'announcement'];
            const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (filters.indexOf(filter) + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
            setFilter(filters[index]);
            event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus();
          }}>
            <button id="messages-filter-all" type="button" disabled={sendReply.isPending} role="tab" tabIndex={filter === 'all' ? 0 : -1} aria-controls="messages-thread-panel" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>Lahat ({conversations.length})</button>
            <button id="messages-filter-teacher" type="button" disabled={sendReply.isPending} role="tab" tabIndex={filter === 'teacher' ? 0 : -1} aria-controls="messages-thread-panel" aria-selected={filter === 'teacher'} onClick={() => setFilter('teacher')}>Mula sa Guro ({teacherCount})</button>
            <button id="messages-filter-announcement" type="button" disabled={sendReply.isPending} role="tab" tabIndex={filter === 'announcement' ? 0 : -1} aria-controls="messages-thread-panel" aria-selected={filter === 'announcement'} onClick={() => setFilter('announcement')}>Anunsyo ({announcementCount})</button>
          </div>
          <div id="messages-thread-panel" role="tabpanel" aria-labelledby={`messages-filter-${filter}`}>
          {isLoading ? <div className="messages-loading" role="status">Naglo-load ng mga mensahe...</div> : (
            <div className="messages-thread-list">
              {visibleMessages.map((conversation) => {
                const message = conversation.latest;
                const teacher = teacherNames?.[conversation.teacherId] ?? 'Guro';
                const announcement = isAnnouncement(message.message);
                return (
                  <button type="button" disabled={sendReply.isPending} key={conversation.teacherId} onClick={() => selectMessage(conversation)} aria-pressed={selectedTeacherId === conversation.teacherId} className={`messages-thread ${selectedTeacherId === conversation.teacherId ? 'is-selected' : ''}`}>
                    <MessageAvatar className={`messages-avatar ${announcement ? 'announcement' : ''}`} url={photos.avatars[conversation.teacherId]} name={teacher} />
                    <span className="messages-thread-copy"><b>{teacher}</b><small>{message.message.replace(/\s+/g, ' ')}</small><small>{conversation.children.map(child => child.name).join(', ')}</small></span>
                    <time dateTime={message.created_at}>{dateShort(message.created_at)}<br />{' '}{new Intl.DateTimeFormat('fil-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(message.created_at))}</time>
                    <ChevronRight className="messages-thread-chevron" size={18} aria-hidden="true" />
                    {conversation.unreadIds.length > 0 && <span className="messages-unread"><span className="sr-only">{conversation.unreadIds.length} hindi pa nababasang mensahe</span></span>}
                  </button>
                );
              })}
              {!visibleMessages.length && <div className="messages-empty"><img src={noActivitiesArt} alt="" /><h3>{search || filter !== 'all' ? 'Walang tugmang mensahe' : 'Wala pang mensahe'}</h3><p>{search || filter !== 'all' ? 'Subukan ang ibang salita o filter.' : 'Makikita rito ang mga update mula sa guro.'}</p></div>}
            </div>
          )}
          </div>
        </section>
        <section className="messages-conversation" aria-label="Napiling pag-uusap">
          <img className="messages-chat-art" src={messagesStarArt} alt="" aria-hidden="true" decoding="async" />
          {selected ? (
            <>
              <div className="messages-conversation-heading">
                <MessageAvatar className="messages-avatar large" url={photos.avatars[selected.teacher_id]} name={selectedTeacher} />
                <div className="messages-contact-copy"><h2>{selectedTeacher}</h2><p>{selectedConversation?.children.map(child => child.name).join(', ')}</p></div>
                <div className="messages-contact-actions">
                  <button type="button" aria-label="Maghanap sa pag-uusap" aria-expanded={chatSearchOpen} onClick={() => { setChatSearchOpen((open) => !open); setChatSearch(''); }}><Search size={21} /></button>
                <div className="messages-menu">
                  <button type="button" aria-label="Higit pang opsyon" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><EllipsisVertical size={23} /></button>
                  {menuOpen && <div><button type="button" onClick={() => { markRead.mutate(selectedConversation?.unreadIds ?? []); setMenuOpen(false); }}>Markahang nabasa</button><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(selected.message); setNotice('Nakopya ang mensahe.'); } catch { setNotice('Hindi makopya ang mensahe sa browser na ito.'); } setMenuOpen(false); }}>Kopyahin ang mensahe</button></div>}
                </div>
                </div>
              </div>
              {chatSearchOpen && <label className="messages-chat-search"><Search size={18} aria-hidden="true" /><input autoFocus value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder="Hanapin sa pag-uusap..." aria-label="Hanapin sa pag-uusap" /><button type="button" aria-label="Isara ang paghahanap" onClick={() => { setChatSearchOpen(false); setChatSearch(''); }}><X size={18} /></button></label>}
              <div className="messages-chat" ref={chatRef}>
                <div className="messages-date-divider"><span>{dateShort(conversation[0]?.created_at ?? selected.created_at)}</span></div>
                {visibleConversation.map((item) => item.kind === 'teacher' ? <div className="messages-incoming-row" key={`teacher-${item.id}`}>
                  <MessageAvatar className="messages-avatar small" url={photos.avatars[selected.teacher_id]} name={selectedTeacher} />
                  <div><div className="messages-bubble incoming"><MessageText text={item.message} />{item.attachment_path && <AttachmentLink key={item.attachment_path} path={item.attachment_path} name={item.attachment_name ?? 'Attachment'} />}</div><time className="messages-message-meta" dateTime={item.created_at}>{dateTime(item.created_at)}</time><MessageReactions target={{ kind: 'teacher', id: item.id }} reactions={reactions} /></div>
                </div> : <div className="messages-parent-reply" key={`reply-${item.id}`}>
                  <MessageAvatar className="messages-avatar parent" url={photos.ownAvatarUrl} name={identity?.displayName ?? 'Magulang'} />
                  <div className="messages-bubble outgoing"><MessageText text={item.message} />{item.attachment_path && <AttachmentLink key={item.attachment_path} path={item.attachment_path} name={item.attachment_name ?? 'Attachment'} />}</div>
                  <time className="messages-message-meta" dateTime={item.created_at}>{dateTime(item.created_at)} <CheckCheck size={16} aria-label="Naipadala" /></time>
                  <MessageReactions target={{ kind: 'reply', id: item.id }} reactions={reactions} />
                </div>)}
                {repliesError && <div className="messages-error" role="alert">Hindi ma-load ang mga reply. <button type="button" onClick={() => void refetchReplies()}>Subukan muli</button></div>}
                {reactions.failed && <div className="messages-error" role="alert">Hindi ma-save o ma-load ang reactions. <button type="button" onClick={reactions.retry}>Subukan muli ang reactions</button></div>}
                {chatNeedle && !visibleConversation.length && <p className="messages-chat-no-results" role="status">Walang tugmang mensahe sa pag-uusap na ito.</p>}
              </div>
              <form className="messages-composer" onSubmit={(event) => { event.preventDefault(); handleReply(); }}>
                {(selectedConversation?.children.length ?? 0) > 1 && <label className="messages-child-choice">Tungkol kay<select aria-label="Anak na tinutukoy sa reply" disabled={sendReply.isPending} value={selectedChildId} onChange={event => setChildChoices(values => ({ ...values, [selectedTeacherId!]: event.target.value }))}>{selectedConversation!.children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
                <input ref={attachmentRef} disabled={sendReply.isPending || !attachmentsAvailable} className="messages-file-input" type="file" accept=".pdf,.doc,.docx,image/*" onChange={(event) => chooseAttachment(event.target.files?.[0])} />
                <div className="messages-compose-row">
                  <button type="button" disabled={sendReply.isPending || !attachmentsAvailable} className="messages-attach" aria-label="Mag-attach ng file (PDF, image, o document; hanggang 5 MB)" title={attachmentsAvailable ? 'Mag-attach ng file' : 'Hindi pa available ang attachments; maaari kang magpadala ng text'} onClick={() => attachmentRef.current?.click()}><Paperclip size={25} /></button>
                  <div className="messages-compose-field"><textarea ref={composeRef} disabled={sendReply.isPending} rows={1} value={draft} onChange={(event) => { setDraft(event.target.value); setNotice(null); }} maxLength={500} placeholder="Sumulat ng mensahe..." aria-label="Isulat ang reply para sa guro" aria-describedby="messages-character-count" /><span id="messages-character-count" className="messages-character-count">{draft.length}/500</span></div>
                  <details className="messages-emoji" ref={emojiRef}><summary aria-label="Magdagdag ng emoji"><Smile size={23} aria-hidden="true" /></summary><div aria-label="Mga emoji">{['😊', '❤️', '👍', '🙏', '📚', '✨'].map((emoji) => <button type="button" key={emoji} disabled={sendReply.isPending} aria-label={`Idagdag ${emoji}`} onClick={() => addEmoji(emoji)}>{emoji}</button>)}</div></details>
                  <button type="submit" disabled={sendReply.isPending || !draft.trim()} className="messages-send"><Send size={20} /> {sendReply.isPending ? 'Ipinapadala...' : 'Ipadala'}</button>
                </div>
                {attachment && <div className="messages-attachment-chip"><FileText size={16} /><span>{attachment.name}</span><button type="button" disabled={sendReply.isPending} onClick={() => { setAttachment(null); if (attachmentRef.current) attachmentRef.current.value = ''; }} aria-label="Alisin ang attachment"><X size={15} /></button></div>}
                {notice && <p className="messages-notice" role="status">{notice}</p>}
                {markRead.error && <p className="messages-notice" role="alert">Hindi mamarkahang nabasa ang mensahe ngayon.</p>}
              </form>
            </>
          ) : <div className="messages-no-selection"><span><Bell size={30} /></span><h2>Mga mensahe ng inyong pamilya</h2><p>Kapag may update ang guro, maaari mo itong basahin at sagutin dito.</p></div>}
        </section>
      </div>
    </div>
  );
}
