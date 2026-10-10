import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, EllipsisVertical, FileText, Heart, Megaphone, Paperclip, Plus, Search, Send, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import noActivitiesArt from '../../assets/parent/no activities.png';
import './messages-reference.css';

interface MessageRow { id: string; teacher_id: string; child_id: string; message: string; read: boolean; created_at: string; children: { name: string } | null; }
interface ReplyRow { id: string; message: string; created_at: string; attachment_name: string | null; attachment_path: string | null; }
interface ReplySubmission { thread: MessageRow; text: string; attachment: File | null; parentId: string; }
type Filter = 'all' | 'teacher' | 'announcement';
const dateTime = (value: string) => new Intl.DateTimeFormat('fil-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const dateShort = (value: string) => new Intl.DateTimeFormat('fil-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
const initials = (name: string) => name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GU';
const isAnnouncement = (message: string) => /anunsyo|paalala|conference|takdang-aralin/i.test(message);

export default function ParentMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['parent-messages', user?.id],
    queryFn: async () => {
      const { data, error: queryError } = await supabase.from('teacher_messages').select('id, teacher_id, child_id, message, read, created_at, children(name)').order('created_at', { ascending: false });
      if (queryError) throw queryError;
      return data as unknown as MessageRow[];
    },
    enabled: Boolean(user),
    // Teacher follow-ups are delivered through teacher_messages. Refresh the
    // parent inbox while it is open so a newly sent reply becomes visible
    // without requiring the parent to reload the page.
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
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
  const markRead = useMutation({ mutationFn: async (id: string) => { const { error: updateError } = await supabase.from('teacher_messages').update({ read: true }).eq('id', id); if (updateError) throw updateError; }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parent-messages'] }) });
  const visibleMessages = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return (messages ?? []).filter((message) => {
      const teacher = teacherNames?.[message.teacher_id] ?? 'Guro';
      const matchesFilter = filter === 'all' || (filter === 'teacher' && !isAnnouncement(message.message)) || (filter === 'announcement' && isAnnouncement(message.message));
      return matchesFilter && (!needle || `${teacher} ${message.children?.name ?? ''} ${message.message}`.toLocaleLowerCase().includes(needle));
    });
  }, [filter, messages, search, teacherNames]);
  useEffect(() => { if (!visibleMessages.length) setSelectedId(null); else if (!selectedId || !visibleMessages.some((message) => message.id === selectedId)) setSelectedId(visibleMessages[0].id); }, [selectedId, visibleMessages]);
  const selected = visibleMessages.find((message) => message.id === selectedId) ?? visibleMessages[0];
  const { data: replies, error: repliesError } = useQuery({ queryKey: ['parent-message-replies', selected?.id], queryFn: async () => { const { data, error: queryError } = await supabase.from('parent_teacher_replies').select('id, message, created_at, attachment_name, attachment_path').eq('teacher_message_id', selected!.id).order('created_at', { ascending: true }); if (queryError) throw queryError; return data as ReplyRow[]; }, enabled: Boolean(selected), refetchInterval: 10_000 });
  const sendReply = useMutation({
    mutationFn: async ({ thread, text, attachment: file, parentId }: ReplySubmission) => {
      let attachmentPath: string | null = null;
      try {
        if (file) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
          attachmentPath = `${parentId}/${crypto.randomUUID()}-${safeName}`;
          const { error: uploadError } = await supabase.storage.from('parent-message-files').upload(attachmentPath, file, { contentType: file.type || 'application/octet-stream', upsert: false });
          if (uploadError) throw uploadError;
        }
        const { error: insertError } = await supabase.from('parent_teacher_replies').insert({ teacher_message_id: thread.id, teacher_id: thread.teacher_id, child_id: thread.child_id, parent_id: parentId, message: text, attachment_name: file?.name ?? null, attachment_path: attachmentPath });
        if (insertError) throw insertError;
      } catch (replyError) { if (attachmentPath) await supabase.storage.from('parent-message-files').remove([attachmentPath]); throw replyError; }
    },
    onSuccess: (_data, submission) => { if (selected?.id === submission.thread.id) { setDraft(''); setAttachment(null); if (attachmentRef.current) attachmentRef.current.value = ''; setNotice('Naipadala ang reply mo sa guro.'); } void queryClient.invalidateQueries({ queryKey: ['parent-message-replies', submission.thread.id] }); },
    onError: (replyError: Error) => setNotice(replyError.message),
    onSettled: () => { submittingRef.current = false; },
  });
  const teacherCount = (messages ?? []).filter((message) => !isAnnouncement(message.message)).length;
  const announcementCount = (messages ?? []).length - teacherCount;
  const selectedTeacher = selected ? teacherNames?.[selected.teacher_id] ?? 'Guro' : 'Pumili ng mensahe';
  const selectMessage = (message: MessageRow) => { setSelectedId(message.id); setMenuOpen(false); if (!message.read) markRead.mutate(message.id); };
  const handleReply = () => { if (submittingRef.current || sendReply.isPending) return; if (!selected || !user) { setNotice('Pumili muna ng mensahe mula sa guro.'); return; } if (!draft.trim()) { setNotice('Sumulat muna ng mensahe para sa guro.'); composeRef.current?.focus(); return; } submittingRef.current = true; sendReply.mutate({ thread: selected, text: draft.trim(), attachment, parentId: user.id }); };
  const chooseAttachment = (file?: File) => { if (!file) return; if (file.size > 5 * 1024 * 1024) { setNotice('Hanggang 5 MB lang ang maaaring i-attach.'); return; } setAttachment(file); setNotice(null); };
  const openAttachment = async (path: string) => { const { data, error: linkError } = await supabase.storage.from('parent-message-files').createSignedUrl(path, 60); if (linkError || !data?.signedUrl) { setNotice(linkError?.message ?? 'Hindi mabuksan ang attachment.'); return; } window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); };

  return (
    <div className="parent-messages-reference">
      <header className="messages-hero">
        <div className="messages-hero-copy">
          <p>KOMUNIKASYON</p>
          <h1>Mga Mensahe</h1>
          <span>Makipag-ugnayan sa mga guro para sa updates, tanong, at suporta sa pag-aaral ng iyong anak.</span>
        </div>
        <aside className="messages-hero-note">Mas magandang pag-unlad para sa inyong anak, sama-sama! <Heart size={18} fill="currentColor" aria-hidden="true" /></aside>
      </header>
      {error && <p className="messages-error" role="alert">Hindi ma-load ang mga mensahe. Subukan ulit mamaya.</p>}
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
          <div className="messages-filter" role="tablist" aria-label="Salain ang mga mensahe">
            <button type="button" disabled={sendReply.isPending} role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>Lahat ({messages?.length ?? 0})</button>
            <button type="button" disabled={sendReply.isPending} role="tab" aria-selected={filter === 'teacher'} onClick={() => setFilter('teacher')}>Mula sa Guro ({teacherCount})</button>
            <button type="button" disabled={sendReply.isPending} role="tab" aria-selected={filter === 'announcement'} onClick={() => setFilter('announcement')}>Anunsyo ({announcementCount})</button>
          </div>
          {isLoading ? <div className="messages-loading" role="status">Naglo-load ng mga mensahe...</div> : (
            <div className="messages-thread-list">
              {visibleMessages.map((message) => {
                const teacher = teacherNames?.[message.teacher_id] ?? 'Guro';
                const announcement = isAnnouncement(message.message);
                return (
                  <button type="button" disabled={sendReply.isPending} key={message.id} onClick={() => selectMessage(message)} aria-pressed={selected?.id === message.id} className={`messages-thread ${selected?.id === message.id ? 'is-selected' : ''}`}>
                    <span className={`messages-avatar ${announcement ? 'announcement' : ''}`}>{announcement ? <Megaphone size={23} aria-hidden="true" /> : initials(teacher)}</span>
                    <span className="messages-thread-copy"><b>{announcement ? 'Anunsyo mula sa Guro' : teacher}</b><small>{message.message.replace(/\s+/g, ' ')}</small></span>
                    <time dateTime={message.created_at}>{dateShort(message.created_at)}<br />{new Intl.DateTimeFormat('fil-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(message.created_at))}</time>
                    {!message.read && <i aria-label="Hindi pa nababasa" />}
                  </button>
                );
              })}
              {!visibleMessages.length && <div className="messages-empty"><img src={noActivitiesArt} alt="" /><h3>{search || filter !== 'all' ? 'Walang tugmang mensahe' : 'Wala pang mensahe'}</h3><p>{search || filter !== 'all' ? 'Subukan ang ibang salita o filter.' : 'Makikita rito ang mga update mula sa guro.'}</p></div>}
            </div>
          )}
        </section>
        <section className="messages-conversation" aria-label="Napiling pag-uusap">
          {selected ? (
            <>
              <div className="messages-conversation-heading">
                <span className="messages-avatar large">{initials(selectedTeacher)}</span>
                <div className="messages-contact-copy"><h2>{selectedTeacher}</h2><p>{selected.children?.name ? `Guro ni ${selected.children.name}` : 'Guro'}</p></div>
                <div className="messages-menu">
                  <button type="button" aria-label="Higit pang opsyon" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><EllipsisVertical size={23} /></button>
                  {menuOpen && <div><button type="button" onClick={() => { markRead.mutate(selected.id); setMenuOpen(false); }}>Markahang nabasa</button><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(selected.message); setNotice('Nakopya ang mensahe.'); } catch { setNotice('Hindi makopya ang mensahe sa browser na ito.'); } setMenuOpen(false); }}>Kopyahin ang mensahe</button></div>}
                </div>
              </div>
              <div className="messages-chat">
                <div className="messages-date-divider"><span>{dateShort(selected.created_at)}</span></div>
                <div className="messages-incoming-row">
                  <span className="messages-avatar small" aria-hidden="true">{initials(selectedTeacher)}</span>
                  <div><div className="messages-bubble incoming">{selected.message}</div><time className="messages-message-meta" dateTime={selected.created_at}>{dateTime(selected.created_at)}</time></div>
                </div>
                {repliesError && <p className="messages-error" role="alert">Hindi ma-load ang mga reply. Subukan ulit mamaya.</p>}
                {(replies ?? []).map((reply) => (
                  <div className="messages-parent-reply" key={reply.id}>
                    <div className="messages-bubble outgoing">{reply.message}{reply.attachment_path && <button type="button" className="messages-file-link" onClick={() => openAttachment(reply.attachment_path!)}><span><FileText size={25} /></span><b>{reply.attachment_name ?? 'Attachment'}</b><Paperclip size={17} /></button>}</div>
                    <time className="messages-message-meta" dateTime={reply.created_at}>{dateTime(reply.created_at)} <CheckCheck size={16} aria-label="Naipadala" /></time>
                  </div>
                ))}
              </div>
              <form className="messages-composer" onSubmit={(event) => { event.preventDefault(); handleReply(); }}>
                <input ref={attachmentRef} disabled={sendReply.isPending} className="messages-file-input" type="file" accept=".pdf,.doc,.docx,image/*" onChange={(event) => chooseAttachment(event.target.files?.[0])} />
                <div className="messages-compose-row">
                  <button type="button" disabled={sendReply.isPending} className="messages-attach" aria-label="Mag-attach ng file (PDF, image, o document; hanggang 5 MB)" title="Mag-attach ng file" onClick={() => attachmentRef.current?.click()}><Paperclip size={25} /></button>
                  <textarea ref={composeRef} disabled={sendReply.isPending} rows={1} value={draft} onChange={(event) => { setDraft(event.target.value); setNotice(null); }} maxLength={500} placeholder="Sumulat ng mensahe..." aria-label="Isulat ang reply para sa guro" />
                  <span className="messages-character-count">{draft.length}/500</span>
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
