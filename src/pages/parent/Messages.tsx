import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, EllipsisVertical, FileText, Info, Paperclip, Search, Send, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import './messages.css';
import './messages-replies.css';

interface MessageRow { id: string; teacher_id: string; child_id: string; message: string; read: boolean; created_at: string; children: { name: string } | null; }
interface ReplyRow { id: string; message: string; created_at: string; attachment_name: string | null; attachment_path: string | null; }
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
    }, enabled: Boolean(user),
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
  const { data: replies } = useQuery({ queryKey: ['parent-message-replies', selected?.id], queryFn: async () => { const { data, error: queryError } = await supabase.from('parent_teacher_replies').select('id, message, created_at, attachment_name, attachment_path').eq('teacher_message_id', selected!.id).order('created_at', { ascending: true }); if (queryError) throw queryError; return data as ReplyRow[]; }, enabled: Boolean(selected) });
  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selected || !user) throw new Error('Pumili muna ng mensahe.');
      let attachmentPath: string | null = null;
      try {
        if (attachment) {
          const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '-');
          attachmentPath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
          const { error: uploadError } = await supabase.storage.from('parent-message-files').upload(attachmentPath, attachment, { contentType: attachment.type || 'application/octet-stream', upsert: false });
          if (uploadError) throw uploadError;
        }
        const { error: insertError } = await supabase.from('parent_teacher_replies').insert({ teacher_message_id: selected.id, teacher_id: selected.teacher_id, child_id: selected.child_id, parent_id: user.id, message: draft.trim(), attachment_name: attachment?.name ?? null, attachment_path: attachmentPath });
        if (insertError) throw insertError;
      } catch (replyError) { if (attachmentPath) await supabase.storage.from('parent-message-files').remove([attachmentPath]); throw replyError; }
    },
    onSuccess: () => { setDraft(''); setAttachment(null); if (attachmentRef.current) attachmentRef.current.value = ''; setNotice('Naipadala ang reply mo sa guro.'); queryClient.invalidateQueries({ queryKey: ['parent-message-replies', selected?.id] }); },
    onError: (replyError: Error) => setNotice(replyError.message),
  });
  const unread = (messages ?? []).filter((message) => !message.read).length;
  const teacherCount = (messages ?? []).filter((message) => !isAnnouncement(message.message)).length;
  const announcementCount = (messages ?? []).length - teacherCount;
  const selectedTeacher = selected ? teacherNames?.[selected.teacher_id] ?? 'Guro' : 'Pumili ng mensahe';
  const selectMessage = (message: MessageRow) => { setSelectedId(message.id); setMenuOpen(false); if (!message.read) markRead.mutate(message.id); };
  const handleReply = () => { if (!draft.trim()) { setNotice('Sumulat muna ng mensahe para sa guro.'); composeRef.current?.focus(); return; } sendReply.mutate(); };
  const chooseAttachment = (file?: File) => { if (!file) return; if (file.size > 5 * 1024 * 1024) { setNotice('Hanggang 5 MB lang ang maaaring i-attach.'); return; } setAttachment(file); setNotice(null); };
  const openAttachment = async (path: string) => { const { data, error: linkError } = await supabase.storage.from('parent-message-files').createSignedUrl(path, 60); if (linkError || !data?.signedUrl) { setNotice(linkError?.message ?? 'Hindi mabuksan ang attachment.'); return; } window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); };

  return <div className="parent-messages-reference">
    <header className="messages-hero"><div className="messages-hero-copy"><p>FAMILY AT SCHOOL</p><h1>Mga Mensahe</h1><span>Makipag-ugnayan sa mga guro para sa updates, tanong, at suporta sa pag-aaral ng iyong anak.</span></div><div className="messages-hero-art" aria-hidden="true"><div className="messages-chat-mark">...</div><div className="messages-book-stack">=</div><div className="messages-family" /></div></header>
    {error && <p className="messages-error" role="alert">Hindi ma-load ang mga mensahe. Subukan ulit mamaya.</p>}
    <div className="messages-main-grid">
      <section className="messages-inbox" aria-label="Inbox ng mga mensahe"><div className="messages-inbox-heading"><h2>Mga Mensahe</h2><button type="button" onClick={() => { setNotice(null); composeRef.current?.focus(); }}>+ Bagong Mensahe</button></div><label className="messages-search"><Search size={20} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Maghanap ng mensahe..." aria-label="Maghanap ng mensahe" /></label><div className="messages-filter" role="tablist" aria-label="Salain ang mga mensahe"><button type="button" role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>Lahat ({messages?.length ?? 0})</button><button type="button" role="tab" aria-selected={filter === 'teacher'} onClick={() => setFilter('teacher')}>Mula sa Guro ({teacherCount})</button><button type="button" role="tab" aria-selected={filter === 'announcement'} onClick={() => setFilter('announcement')}>Anunsyo ({announcementCount})</button></div>{isLoading ? <div className="messages-loading">Naglo-load ng mga mensahe...</div> : <div className="messages-thread-list">{visibleMessages.map((message) => { const teacher = teacherNames?.[message.teacher_id] ?? 'Guro'; const title = message.message.split('\n').find(Boolean) ?? 'Mensahe mula sa guro'; return <button type="button" key={message.id} onClick={() => selectMessage(message)} className={`messages-thread ${selected?.id === message.id ? 'is-selected' : ''}`}><span className="messages-avatar">{initials(teacher)}</span><span className="messages-thread-copy"><b>{teacher}</b><strong>{title.slice(0, 44)}{title.length > 44 ? '...' : ''}</strong><small>{message.message.replace(/\s+/g, ' ').slice(0, 92)}</small></span><time>{dateShort(message.created_at)}<br />{new Intl.DateTimeFormat('fil-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(message.created_at))}</time>{!message.read && <i aria-label="Hindi pa nababasa" />}</button>; })}{!visibleMessages.length && <div className="messages-empty">Walang mensaheng tugma sa filter na ito.</div>}</div>}</section>
      <section className="messages-conversation" aria-label="Napiling pag-uusap">{selected ? <><div className="messages-conversation-heading"><span className="messages-avatar large">{initials(selectedTeacher)}</span><span><h2>{selectedTeacher}</h2><p>{selected.children?.name ? `Guro ni ${selected.children.name}` : 'Guro'}</p></span><div className="messages-menu"><button type="button" aria-label="Higit pang opsyon" onClick={() => setMenuOpen((open) => !open)}><EllipsisVertical size={24} /></button>{menuOpen && <div><button type="button" onClick={() => { selectMessage(selected); setNotice('Minarkahan na ang mensahe bilang nabasa.'); }}>Markahang nabasa</button><button type="button" onClick={() => { navigator.clipboard?.writeText(selected.message); setNotice('Nakopya ang mensahe.'); setMenuOpen(false); }}>Kopyahin ang mensahe</button></div>}</div></div><div className="messages-info"><Info size={19} /><span>Ang mga mensaheng ito ay para sa pag-aaral at suporta ng iyong anak.</span></div><div className="messages-chat"><div className="messages-message-meta">{selectedTeacher} - {dateTime(selected.created_at)}</div><div className="messages-bubble incoming">{selected.message}</div>{(replies ?? []).map((reply) => <div className="messages-parent-reply" key={reply.id}><div className="messages-message-meta">Ikaw - {dateTime(reply.created_at)}</div><div className="messages-bubble outgoing">{reply.message}{reply.attachment_path && <button type="button" className="messages-file-link" onClick={() => openAttachment(reply.attachment_path!)}><FileText size={16} /> {reply.attachment_name ?? 'Attachment'}</button>}</div></div>)}</div><form className="messages-composer" onSubmit={(event) => { event.preventDefault(); handleReply(); }}><textarea ref={composeRef} value={draft} onChange={(event) => { setDraft(event.target.value); setNotice(null); }} maxLength={500} placeholder="Sumulat ng mensahe..." aria-label="Isulat ang reply para sa guro" /><input ref={attachmentRef} className="messages-file-input" type="file" accept=".pdf,.doc,.docx,image/*" onChange={(event) => chooseAttachment(event.target.files?.[0])} /><div><button type="button" className="messages-attach" onClick={() => attachmentRef.current?.click()}><Paperclip size={22} /> Mag-attach ng file<br /><small>(PDF, Image, Doc)</small></button><span>{draft.length}/500</span><button type="submit" disabled={sendReply.isPending} className="messages-send"><Send size={19} /> {sendReply.isPending ? 'Ipinapadala...' : 'Ipadala'}</button></div>{attachment && <div className="messages-attachment-chip"><FileText size={16} /> {attachment.name}<button type="button" onClick={() => { setAttachment(null); if (attachmentRef.current) attachmentRef.current.value = ''; }} aria-label="Alisin ang attachment"><X size={15} /></button></div>}{notice && <p className="messages-notice" role="status">{notice}</p>}</form></> : <div className="messages-no-selection"><Bell size={34} /><h2>Wala pang mensahe</h2><p>Lalabas dito ang mga update ng guro para sa iyong anak.</p></div>}</section>
    </div><span className="messages-unread" aria-label={`${unread} bagong mensahe`}>{unread}</span>
  </div>;
}
