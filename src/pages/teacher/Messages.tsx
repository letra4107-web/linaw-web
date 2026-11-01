import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, CheckCheck, ChevronRight, Download, FileText, Heart, Mail, MoreHorizontal, Paperclip, Plus, Search, Send, SlidersHorizontal, Smile, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { MessageReactions } from '../../components/messages/MessageReactions';
import { useMessageReactions } from '../../lib/messages/useMessageReactions';
import { MESSAGE_REFRESH_MS, useMessageUpdates } from '../../lib/messages/useMessageUpdates';
import { useChatScroll } from '../../lib/messages/useChatScroll';
import { loadTeacherParentReplies, teacherConversation } from '../../lib/messages/teacherMessages';
import type { TeacherMessage } from '../../lib/messages/teacherMessages';
import { loadTeacherMessages, MESSAGE_FILE_ACCEPT, validateMessageAttachment } from '../../lib/messages/teacherAttachments';
import { MessageText } from '../../components/messages/MessageText';
import classroom from '../../assets/teacher/Teacher Home Hero Banner Background.png';
import teacher from '../../assets/teacher/Teacher Illustration.png';
import { MessageAvatar } from '../../components/messages/MessageAvatar';
import { useMessageProfilePhotos } from '../../lib/messages/useMessageProfilePhotos';
import './messages-reference.css';

interface RosterRow { student_id: string; children: { id: string; name: string; parent_id: string; grade_level: number | null } | null; }
interface ParentOption { parentId: string; label: string; avatarUrl?: string | null; children: NonNullable<RosterRow['children']>[]; }
type Filter = 'all' | 'messages' | 'unread' | 'files';
const grade = (value: number | null) => value === 0 ? 'Kindergarten' : `Grade ${value ?? '—'}`;
const time = (value: string) => new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }).format(new Date(value));
const day = (value: string) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(value));
function ParentAvatar({ small = false, url, name }: { small?: boolean; url?: string | null; name: string }) { return <MessageAvatar className={`tm-avatar${small ? ' small' : ''}`} url={url} name={name} />; }

function ReplyAttachment({ path, name, author }: { path: string; name: string; author: 'parent' | 'teacher' }) {
  const [url, setUrl] = useState('');
  const access = useMutation({ mutationFn: async () => {
    const { data, error } = await supabase.storage.from('parent-message-files').createSignedUrl(path, 60);
    if (error || !data?.signedUrl) throw new Error('Hindi mabuksan ang file. Subukan muli.');
    return data.signedUrl;
  }, onSuccess: setUrl });
  useEffect(() => { if (!url) return; const timer = window.setTimeout(() => setUrl(''), 55_000); return () => window.clearTimeout(timer); }, [url]);
  const content = <><span><FileText aria-hidden /></span><b>{name}<small>Attachment mula sa {author === 'teacher' ? 'guro' : 'magulang'}</small></b><Download aria-hidden /></>;
  return <div className="tm-file">{url ? <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Buksan ang attachment: ${name}`}>{content}</a> : <button type="button" disabled={access.isPending} onClick={() => access.mutate()} aria-label={`Ihanda ang attachment: ${name}`}>{content}</button>}<small role="status">{access.isPending ? 'Inihahanda ang file…' : access.error ? access.error.message : url ? 'Handa na. Pindutin ang file upang buksan.' : ''}</small></div>;
}

function NewMessageDialog({ parents, loading, onClose, onSelect }: { parents: ParentOption[]; loading: boolean; onClose: () => void; onSelect: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), opener = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState('');
  useEffect(() => { if (!opener.current) opener.current = document.activeElement as HTMLElement; const element = dialog.current; element?.showModal(); return () => { element?.close(); queueMicrotask(() => opener.current?.isConnected && opener.current.focus({ preventScroll: true })); }; }, []);
  const matches = parents.filter(parent => `${parent.label} ${parent.children.map(child => child.name).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <dialog ref={dialog} className="tm-new-dialog" aria-labelledby="tm-new-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><span><p>BAGONG MENSAHE</p><h2 id="tm-new-title">Piliin ang Tatanggap</h2><small>Mga magulang na konektado sa iyong klase.</small></span><button type="button" onClick={onClose} aria-label="Isara ang bagong mensahe"><X aria-hidden /></button></header>
    <label className="tm-search"><Search aria-hidden /><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Hanapin ang magulang o mag-aaral…" aria-label="Hanapin ang tatanggap" /></label>
    <div>{loading ? <p role="status">Kinukuha ang mga magulang…</p> : matches.length ? matches.map(parent => <button type="button" key={parent.parentId} onClick={() => onSelect(parent.parentId)}><ParentAvatar url={parent.avatarUrl} name={parent.label} /><span><b>{parent.label}</b><small>{parent.children.map(child => child.name).join(', ')}</small></span><ChevronRight aria-hidden /></button>) : <p>Walang magulang na tugma sa paghahanap.</p>}</div>
  </dialog>;
}

export default function TeacherMessages() {
  const { user, identity } = useAuth(); useMessageUpdates('teacher');
  const photos = useMessageProfilePhotos('teacher');
  const queryClient = useQueryClient(), composer = useRef<HTMLTextAreaElement>(null), emojiMenu = useRef<HTMLDetailsElement>(null), chatMenu = useRef<HTMLDetailsElement>(null), sendGuard = useRef(false);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [childChoices, setChildChoices] = useState<Record<string,string>>({});
  const [drafts, setDrafts] = useState<Record<string,string>>({});
  const [attachments, setAttachments] = useState<Record<string, File | null>>({});
  const attachmentInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(''), [filter, setFilter] = useState<Filter>('all'), [sort, setSort] = useState('recent');
  const [filtersOpen, setFiltersOpen] = useState(false), [newMessageOpen, setNewMessageOpen] = useState(false), [mobileChat, setMobileChat] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false), [chatSearch, setChatSearch] = useState('');
  const [sendError, setSendError] = useState<{ parentId:string; text:string } | null>(null);

  // Other teacher pages cache a narrower roster selection without parent_id.
  const roster = useQuery({ queryKey: ['teacher-message-roster', user?.id], queryFn: async () => {
    const { data, error } = await supabase.from('teacher_student_links').select('student_id, children(id, name, parent_id, grade_level)').eq('teacher_id', user!.id);
    if (error) throw error; return data as unknown as RosterRow[];
  }, enabled: Boolean(user) });
  const parentIds = useMemo(() => [...new Set((roster.data ?? []).flatMap(row => row.children?.parent_id ? [row.children.parent_id] : []))], [roster.data]);
  const names = useQuery({ queryKey: ['teacher-roster-parent-names', user?.id, parentIds], queryFn: async () => {
    const { data, error } = await supabase.from('users').select('id, name, email').in('id', parentIds);
    if (error) throw error; return Object.fromEntries((data ?? []).map(parent => [parent.id, parent.name || parent.email || 'Magulang']));
  }, enabled: parentIds.length > 0 });
  const parents = useMemo<ParentOption[]>(() => parentIds.map(parentId => ({ parentId, label: names.data?.[parentId] ?? 'Magulang', avatarUrl: photos.avatars[parentId], children: [...new Map((roster.data ?? []).flatMap(row => row.children?.parent_id === parentId ? [[row.children.id, row.children] as const] : [])).values()] })), [parentIds, roster.data, names.data, photos.avatars]);
  const sent = useQuery({ queryKey: ['teacher-sent-messages', user?.id], queryFn: async () => {
    return loadTeacherMessages(supabase, { teacherId: user!.id });
  }, enabled: Boolean(user), refetchInterval: MESSAGE_REFRESH_MS, refetchOnWindowFocus: 'always', refetchOnReconnect: 'always' });
  const sentMessages: TeacherMessage[] = sent.data?.rows ?? [];
  const attachmentsAvailable = sent.data?.attachmentsAvailable === true;
  const replies = useQuery({ queryKey: ['teacher-parent-message-replies', user?.id], queryFn: () => loadTeacherParentReplies(supabase, user!.id), enabled: Boolean(user), refetchInterval: MESSAGE_REFRESH_MS, refetchOnWindowFocus: 'always', refetchOnReconnect: 'always' });
  const contactsLoading = roster.isLoading || names.isLoading, dataError = roster.error || names.error || sent.error || replies.error;
  const selectedId = selectedParentId || parents[0]?.parentId || '', selectedParent = parents.find(parent => parent.parentId === selectedId);
  const conversation = teacherConversation(sentMessages, replies.data ?? [], selectedId);
  const reactions = useMessageReactions(conversation.map(item => ({ kind: item.author === 'teacher' ? 'teacher' : 'reply', id: item.id })));
  const visibleConversation = conversation.filter(item => `${item.message} ${item.attachment_name ?? ''}`.toLowerCase().includes(chatSearch.trim().toLowerCase()));
  const latest = visibleConversation.at(-1), chatRef = useChatScroll(selectedId, latest ? `${latest.author}:${latest.id}:${visibleConversation.length}` : undefined);
  const contacts = parents.map(parent => {
    const items = teacherConversation(sentMessages, replies.data ?? [], parent.parentId);
    return { ...parent, latest:items.at(-1), unread:(replies.data ?? []).filter(reply => reply.parent_id === parent.parentId && !reply.read).length, hasFiles:items.some(item => Boolean(item.attachment_path)) };
  });
  const counts = { all:contacts.length, messages:contacts.filter(parent => parent.latest).length, unread:contacts.filter(parent => parent.unread).length, files:contacts.filter(parent => parent.hasFiles).length };
  const filtered = contacts.filter(parent => (filter === 'all' || filter === 'messages' && parent.latest || filter === 'unread' && parent.unread || filter === 'files' && parent.hasFiles) && `${parent.label} ${parent.children.map(child => child.name).join(' ')} ${parent.latest?.message ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a,b) => sort === 'name' ? a.label.localeCompare(b.label) : (b.latest?.created_at ?? '').localeCompare(a.latest?.created_at ?? '') || a.label.localeCompare(b.label));
  const draft = drafts[selectedId] ?? '', childId = childChoices[selectedId] || selectedParent?.children[0]?.id || '';
  const attachment = attachments[selectedId] ?? null;
  useEffect(() => { if (attachmentInput.current) attachmentInput.current.value = ''; }, [selectedId]);
  const markRead = useMutation({ mutationFn: async (parentId:string) => {
    const { error } = await supabase.from('parent_teacher_replies').update({ read:true }).eq('teacher_id', user!.id).eq('parent_id',parentId).eq('read',false);
    if (error) throw error;
  }, onSuccess: () => queryClient.invalidateQueries({ queryKey:['teacher-parent-message-replies'] }) });
  const send = useMutation({ mutationFn: async ({ parentId,childId,text,file }: { parentId:string; childId:string; text:string; raw:string; file:File|null }) => {
    if (!parents.some(parent => parent.parentId === parentId && parent.children.some(child => child.id === childId))) throw new Error('Pumili muna ng magulang at mag-aaral.');
    if (!text && !file) throw new Error('Sumulat muna ng mensahe o pumili ng file.');
    let attachmentPath: string | null = null;
    try {
      if (file) {
        if (!attachmentsAvailable) throw new Error('Hindi pa available ang teacher attachments. Maaari ka munang magpadala ng text o link.');
        await validateMessageAttachment(file);
        attachmentPath = `${user!.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
        const { error } = await supabase.storage.from('parent-message-files').upload(attachmentPath, file, { contentType: file.type || 'application/octet-stream', upsert: false });
        if (error) throw error;
      }
      const { error } = await supabase.from('teacher_messages').insert({ teacher_id:user!.id,parent_id:parentId,child_id:childId,message:text || 'Nagpadala ng file.',...(file ? { attachment_name:file.name,attachment_path:attachmentPath,attachment_type:file.type || null } : {}) });
      if (error) throw error;
    } catch (error) {
      if (attachmentPath) await supabase.storage.from('parent-message-files').remove([attachmentPath]);
      throw error;
    }
  }, onSuccess: (_result,submission) => {
    setDrafts(values => values[submission.parentId] === submission.raw ? { ...values,[submission.parentId]:'' } : values);
    setAttachments(values => values[submission.parentId] === submission.file ? { ...values,[submission.parentId]:null } : values);
    if (selectedId === submission.parentId && attachmentInput.current) attachmentInput.current.value = '';
    setSendError(null); void queryClient.invalidateQueries({ queryKey:['teacher-sent-messages'] });
  }, onError: (_error,submission) => setSendError({ parentId:submission.parentId,text:submission.file ? 'Hindi naipadala ang file. Naka-save pa rito ang draft mo. Subukan muli.' : 'Hindi naipadala ang mensahe. Naka-save pa rito ang draft mo. Subukan muli.' }), onSettled: () => { sendGuard.current = false; } });
  function selectParent(id:string) {
    setSelectedParentId(id); setMobileChat(true); setChatSearch(''); setChatSearchOpen(false);
    if (emojiMenu.current) emojiMenu.current.open = false; if (chatMenu.current) chatMenu.current.open = false;
    if (contacts.some(parent => parent.parentId === id && parent.unread)) markRead.mutate(id);
  }
  function submit() { if (sendGuard.current || !selectedParent || (!draft.trim() && !attachment)) return; sendGuard.current = true; setSendError(null); send.mutate({ parentId:selectedId,childId,text:draft.trim(),raw:draft,file:attachment }); }
  async function chooseAttachment(file?: File) {
    if (!file || send.isPending) return;
    const parentId = selectedId;
    try { await validateMessageAttachment(file); setAttachments(values => ({ ...values,[parentId]:file })); setSendError(null); }
    catch (error) { setSendError({parentId,text:error instanceof Error ? error.message : 'Hindi mabasa ang file.'}); if (attachmentInput.current) attachmentInput.current.value = ''; }
  }
  function addEmoji(emoji:string) {
    const field = composer.current, start = field?.selectionStart ?? draft.length, end = field?.selectionEnd ?? start, next = draft.slice(0,start)+emoji+draft.slice(end);
    if (next.length > 500) return; setDrafts(values => ({ ...values,[selectedId]:next })); if (emojiMenu.current) emojiMenu.current.open = false;
    field?.focus(); requestAnimationFrame(() => field?.setSelectionRange(start+emoji.length,start+emoji.length));
  }
  const filters: { id:Filter; label:string }[] = [{ id:'all',label:'Lahat' },{ id:'messages',label:'May Mensahe' },{ id:'unread',label:'Di pa Nabasa' },{ id:'files',label:'May File' }];
  function retry() { void roster.refetch(); if (parentIds.length) void names.refetch(); void sent.refetch(); void replies.refetch(); }

  return <div className={`teacher-messages-design${mobileChat ? ' tm-mobile-chat' : ''}`}>
    <header className="tm-hero"><img className="tm-hero-background" src={classroom} alt="" aria-hidden /><div className="tm-hero-copy"><p>FAMILY COMMUNICATION</p><h1>Mga Mensahe <Send aria-hidden /></h1><p>Makipag-ugnayan at makipagtulungan sa mga magulang<br className="tm-wide-break" /> para sa mas mahusay na pag-unlad ng bata.</p></div><img className="tm-hero-teacher" src={teacher} alt="" aria-hidden /><blockquote>Mas bukas na<br /> komunikasyon,<br /> mas malinaw na<br /> pag-unlad! <Heart aria-hidden /><Send aria-hidden /></blockquote></header>
    {photos.error && <p className="tm-notice" role="status">Hindi ma-load ang profile photos. <button type="button" onClick={() => void photos.refetch()}>Subukan muli ang photos</button></p>}
    <QueryErrorNotice error={dataError} onRetry={retry} message="Hindi ma-load ang ilang bahagi ng mga pag-uusap. Subukan muli." />
    <section className="tm-workspace" aria-label="Mga pag-uusap">
      <aside className="tm-inbox"><header><span className="tm-heading-icon"><Mail aria-hidden /></span><div><h2>Mga Pag-uusap</h2><p>Makipag-usap sa mga magulang at tagapag-alaga.</p></div><button type="button" className="tm-new" onClick={() => setNewMessageOpen(true)}><Plus aria-hidden /><span>Bagong Mensahe</span></button></header>
        <div className="tm-find"><label className="tm-search"><Search aria-hidden /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Hanapin ang magulang o mag-aaral…" aria-label="Hanapin ang magulang o mag-aaral" /></label><button type="button" className="tm-icon-button" aria-label="Ayusin ang mga pag-uusap" aria-expanded={filtersOpen} aria-controls="tm-sort" onClick={() => setFiltersOpen(value => !value)}><SlidersHorizontal aria-hidden /></button></div>
        {filtersOpen && <label className="tm-sort" id="tm-sort">Ayusin ayon sa<select value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Pinakabagong mensahe</option><option value="name">Pangalan ng magulang</option></select></label>}
        <div className="tm-filters" aria-label="Salain ang mga pag-uusap">{filters.map(entry => <button type="button" key={entry.id} aria-pressed={filter === entry.id} disabled={contactsLoading || Boolean(roster.error)} onClick={() => setFilter(entry.id)}>{entry.label} ({contactsLoading || dataError ? '—' : counts[entry.id]})</button>)}</div>
        <nav className="tm-contact-list" aria-label="Mga magulang">{contactsLoading ? <p className="tm-empty" role="status">Kinukuha ang mga pag-uusap…</p> : roster.error ? <p className="tm-empty">Hindi makuha ang mga magulang. Subukan muli sa itaas.</p> : filtered.length ? filtered.map(parent => <button type="button" key={parent.parentId} className={selectedId === parent.parentId ? 'is-selected' : ''} aria-pressed={selectedId === parent.parentId} onClick={() => selectParent(parent.parentId)}><ParentAvatar url={parent.avatarUrl} name={parent.label} /><span className="tm-contact-copy"><b>{parent.label}</b><small>{parent.children.map(child => `${child.name} · ${grade(child.grade_level)}`).join(', ')}</small><p>{sent.error || replies.error ? 'Hindi makuha ang pinakabagong mensahe' : parent.latest?.message || (parent.hasFiles ? 'May attachment' : 'Simulan ang pag-uusap')}</p></span><span className="tm-contact-meta">{parent.latest && <time dateTime={parent.latest.created_at}>{time(parent.latest.created_at)}</time>}{parent.unread > 0 && <em aria-label={`${parent.unread} hindi pa nababasang reply`}>{parent.unread}</em>}<ChevronRight aria-hidden /></span></button>) : <div className="tm-empty"><Mail aria-hidden /><strong>{parents.length ? 'Walang tugmang pag-uusap.' : 'Wala pang magulang na naka-link sa iyong roster.'}</strong>{parents.length > 0 && <button type="button" onClick={() => { setQuery(''); setFilter('all'); }}>I-reset ang paghahanap</button>}</div>}</nav>
      </aside>
      <article className="tm-chat" aria-label="Bukas na pag-uusap">
        {selectedParent ? <><header className="tm-chat-heading"><button type="button" className="tm-back tm-icon-button" aria-label="Bumalik sa mga pag-uusap" onClick={() => setMobileChat(false)}><ArrowLeft aria-hidden /></button><ParentAvatar url={selectedParent.avatarUrl} name={selectedParent.label} /><div><h2>{selectedParent.label}</h2><p>{selectedParent.children.map(child => `${child.name} · ${grade(child.grade_level)}`).join(', ')}</p></div><button type="button" className="tm-icon-button" aria-label="Hanapin sa pag-uusap" aria-expanded={chatSearchOpen} onClick={() => { setChatSearchOpen(value => !value); setChatSearch(''); }}><Search aria-hidden /></button><details className="tm-chat-menu" ref={chatMenu}><summary aria-label="Mga aksyon sa pag-uusap"><MoreHorizontal aria-hidden /></summary><div><button type="button" onClick={() => { markRead.mutate(selectedId); if (chatMenu.current) chatMenu.current.open = false; }}>Markahang nabasa ang mga reply</button><button type="button" onClick={() => { setChatSearch(''); setChatSearchOpen(false); if (chatMenu.current) chatMenu.current.open = false; composer.current?.focus(); }}>Sumulat ng mensahe</button></div></details></header>
          {chatSearchOpen && <label className="tm-chat-search tm-search"><Search aria-hidden /><input autoFocus aria-label="Hanapin sa bukas na pag-uusap" placeholder="Hanapin sa pag-uusap…" value={chatSearch} onChange={event => setChatSearch(event.target.value)} /></label>}
          <div className="tm-thread" ref={chatRef} tabIndex={0} role="region" aria-label="Kasaysayan ng pag-uusap">
            {reactions.failed && <div className="tm-notice" role="alert">Hindi ma-load o ma-save ang reactions. <button type="button" onClick={reactions.retry}>Subukan muli ang reactions</button></div>}
            {markRead.error && <div className="tm-notice" role="alert">Hindi mamarkahang nabasa ang mga reply. <button type="button" onClick={() => markRead.mutate(selectedId)}>Subukan muli</button></div>}
            {(sent.isLoading || replies.isLoading) && <p className="tm-empty" role="status">Kinukuha ang mga mensahe…</p>}
            {!sent.isLoading && !replies.isLoading && !visibleConversation.length && <div className="tm-empty"><Mail aria-hidden /><strong>{sent.error || replies.error ? 'Hindi makuha ang buong pag-uusap.' : chatSearch ? 'Walang mensaheng tugma sa paghahanap.' : 'Simulan ang pag-uusap.'}</strong><p>{!chatSearch && !sent.error && !replies.error ? 'Magpadala ng update sa magulang gamit ang box sa ibaba.' : ''}</p></div>}
            {visibleConversation.map((item,index) => <div className="tm-message-group" key={`${item.author}-${item.id}`}>
              {(index === 0 || day(item.created_at) !== day(visibleConversation[index-1].created_at)) && <div className="tm-date"><time dateTime={item.created_at}>{day(item.created_at)}</time></div>}
              <div className={`tm-message ${item.author}`}>
                <MessageAvatar className="tm-avatar small" url={item.author === 'teacher' ? photos.ownAvatarUrl : selectedParent.avatarUrl} name={item.author === 'teacher' ? identity?.displayName ?? 'Guro' : selectedParent.label} /><div className="tm-message-content"><div className="tm-bubble">{item.message && <p><MessageText text={item.message} /></p>}{item.attachment_path && <ReplyAttachment path={item.attachment_path} name={item.attachment_name || 'Attachment'} author={item.author} />}</div><small className="tm-message-time"><time dateTime={item.created_at}>{time(item.created_at)}</time>{item.author === 'teacher' && (item.read ? <CheckCheck aria-label="Nabasa" /> : <Check aria-label="Naipadala" />)}</small><MessageReactions target={{ kind:item.author === 'teacher' ? 'teacher' : 'reply',id:item.id }} reactions={reactions} /></div>
              </div>
            </div>)}
          </div>
          <form className="tm-composer" onSubmit={event => { event.preventDefault(); submit(); }}>
            {selectedParent.children.length > 1 && <label className="tm-child-choice">Tungkol kay<select value={childId} onChange={event => setChildChoices(values => ({ ...values,[selectedId]:event.target.value }))}>{selectedParent.children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
            <input ref={attachmentInput} className="tm-file-input" type="file" accept={MESSAGE_FILE_ACCEPT} disabled={send.isPending || !attachmentsAvailable} aria-label="Pumili ng file para sa magulang" onChange={event => void chooseAttachment(event.target.files?.[0])} />
            <div className="tm-compose-row"><button type="button" className="tm-attach" disabled={send.isPending || !attachmentsAvailable} onClick={() => attachmentInput.current?.click()} aria-label="Mag-attach ng file para sa magulang" title={attachmentsAvailable ? 'PDF, PNG/JPG/WebP, Word o TXT; hanggang 5 MB' : 'Hindi pa available ang teacher files; maaari kang magpadala ng text o link.'}><Paperclip aria-hidden /></button><label className="tm-compose-field"><span className="sr-only">Isulat ang iyong mensahe</span><textarea ref={composer} aria-label="Isulat ang iyong mensahe" rows={1} maxLength={500} value={draft} onChange={event => setDrafts(values => ({ ...values,[selectedId]:event.target.value }))} placeholder="Isulat ang iyong mensahe…" onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} /><details ref={emojiMenu} className="tm-emoji"><summary aria-label="Magdagdag ng emoji"><Smile aria-hidden /></summary><div>{['😊','❤️','👍','🎉','🙏','✨'].map(emoji => <button type="button" key={emoji} onClick={() => addEmoji(emoji)} aria-label={`Idagdag ang ${emoji}`}>{emoji}</button>)}</div></details></label><button type="submit" className="tm-send" disabled={send.isPending || (!draft.trim() && !attachment) || !childId} aria-label="Ipadala ang mensahe"><Send aria-hidden /></button></div>
            {attachment && <div className="tm-attachment-chip"><FileText aria-hidden /><span>{attachment.name}</span><button type="button" aria-label="Alisin ang teacher attachment" disabled={send.isPending} onClick={() => { setAttachments(values => ({ ...values,[selectedId]:null })); if (attachmentInput.current) attachmentInput.current.value = ''; }}><X aria-hidden /></button></div>}
            <div className="tm-compose-foot"><small>{send.isPending ? 'Ipinapadala…' : 'Enter para ipadala · Shift+Enter para sa bagong linya'}</small><small>{draft.length}/500</small></div>
            {sendError?.parentId === selectedId && <p className="tm-notice" role="alert">{sendError.text}</p>}
          </form>
        </> : <div className="tm-no-selection"><Mail aria-hidden /><h2>{contactsLoading ? 'Kinukuha ang mga pag-uusap…' : 'Pumili ng pag-uusap'}</h2><p>Pumili ng magulang upang makipag-usap tungkol sa pag-aaral ng bata.</p></div>}
      </article>
    </section>
    {newMessageOpen && <NewMessageDialog parents={parents} loading={contactsLoading} onClose={() => setNewMessageOpen(false)} onSelect={id => { selectParent(id); setNewMessageOpen(false); window.setTimeout(() => composer.current?.focus(),0); }} />}
  </div>;
}
