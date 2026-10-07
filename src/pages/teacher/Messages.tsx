import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Search, Send, Smile } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import teacherHeroBackground from '../../assets/teacher/Teacher Home Hero Banner Background.png';
import teacherIllustration from '../../assets/teacher/Teacher Illustration.png';

interface RosterRow { student_id: string; children: { id: string; name: string; parent_id: string; grade_level: number } | null; }
interface ParentOption { parentId: string; label: string; childIds: string[]; childNames: string[]; gradeLabel: string; }
interface SentMessageRow { id: string; parent_id: string; child_id: string; message: string; read: boolean; created_at: string; children: { name: string } | null; }
interface ParentReplyRow { id: string; teacher_message_id: string; parent_id: string; child_id: string; message: string; read: boolean; created_at: string; }

const initials = (value: string) => value.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
const timeLabel = (value: string) => new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const dayLabel = (value: string) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));

export default function TeacherMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedParentId, setSelectedParentId] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const { data: roster } = useQuery({
    queryKey: ['teacher-roster', user?.id],
    queryFn: async () => {
      const { data, error: queryError } = await supabase.from('teacher_student_links').select('student_id, children(id, name, parent_id, grade_level)');
      if (queryError) throw queryError;
      return data as unknown as RosterRow[];
    },
    enabled: Boolean(user),
  });
  const parentIds = Array.from(new Set((roster ?? []).map((row) => row.children?.parent_id).filter(Boolean))) as string[];
  const { data: parentNames } = useQuery({
    queryKey: ['teacher-roster-parent-names', parentIds],
    queryFn: async () => {
      if (!parentIds.length) return {} as Record<string, string>;
      const { data, error: queryError } = await supabase.from('users').select('id, name, email').in('id', parentIds);
      if (queryError) throw queryError;
      return Object.fromEntries((data ?? []).map((parent) => [parent.id, parent.name ?? parent.email ?? 'Magulang']));
    },
    enabled: parentIds.length > 0,
  });
  const parentOptions = useMemo<ParentOption[]>(() => parentIds.map((parentId) => {
    const children = (roster ?? []).filter((row) => row.children?.parent_id === parentId).map((row) => row.children!).filter(Boolean);
    return { parentId, label: parentNames?.[parentId] ?? 'Magulang', childIds: children.map((child) => child.id), childNames: children.map((child) => child.name), gradeLabel: children.map((child) => `Grade ${child.grade_level}`).join(', ') };
  }), [parentIds.join(','), roster, parentNames]);
  const { data: sent, isLoading: sentLoading, error: sentError } = useQuery({
    queryKey: ['teacher-sent-messages', user?.id],
    queryFn: async () => {
      const { data, error: queryError } = await supabase.from('teacher_messages')
        .select('id, parent_id, child_id, message, read, created_at, children(name)')
        .eq('teacher_id', user!.id).order('created_at', { ascending: false });
      if (queryError) throw queryError;
      return data as unknown as SentMessageRow[];
    },
    enabled: Boolean(user),
  });
  const { data: replies, isLoading: repliesLoading, error: repliesError } = useQuery({
    queryKey: ['teacher-parent-message-replies', user?.id],
    queryFn: async () => {
      const { data, error: queryError } = await supabase.from('parent_teacher_replies')
        .select('id, teacher_message_id, parent_id, child_id, message, read, created_at')
        .eq('teacher_id', user!.id).order('created_at', { ascending: false });
      if (queryError) throw queryError;
      return data as ParentReplyRow[];
    },
    enabled: Boolean(user),
  });
  const selectedId = selectedParentId || parentOptions[0]?.parentId || '';
  const selectedParent = parentOptions.find((parent) => parent.parentId === selectedId);
  const conversation = [
    ...(sent ?? []).filter((item) => item.parent_id === selectedId).map((item) => ({ ...item, author: 'teacher' as const })),
    ...(replies ?? []).filter((item) => item.parent_id === selectedId).map((item) => ({ ...item, author: 'parent' as const })),
  ].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const filteredParents = parentOptions.filter((parent) => {
    const phrase = query.trim().toLowerCase();
    return !phrase || parent.label.toLowerCase().includes(phrase) || parent.childNames.some((name) => name.toLowerCase().includes(phrase));
  });
  const latestFor = (parentId: string) => [...(sent ?? []).filter((item) => item.parent_id === parentId), ...(replies ?? []).filter((item) => item.parent_id === parentId)].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const unreadFor = (parentId: string) => (replies ?? []).filter((item) => item.parent_id === parentId && !item.read).length;
  const markRepliesRead = useMutation({
    mutationFn: async (parentId: string) => {
      const { error: updateError } = await supabase.from('parent_teacher_replies').update({ read: true }).eq('teacher_id', user!.id).eq('parent_id', parentId).eq('read', false);
      if (updateError) throw updateError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-parent-message-replies'] }),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const parent = parentOptions.find((item) => item.parentId === selectedId);
      if (!parent?.childIds.length) throw new Error('Pumili muna ng magulang.');
      if (!message.trim()) throw new Error('Sumulat muna ng mensahe.');
      const { error: insertError } = await supabase.from('teacher_messages').insert({ teacher_id: user!.id, parent_id: parent.parentId, child_id: parent.childIds[0], message: message.trim() });
      if (insertError) throw insertError;
    },
    onSuccess: () => { setMessage(''); setError(null); setSelectedParentId(selectedId); queryClient.invalidateQueries({ queryKey: ['teacher-sent-messages'] }); },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  return <div className="teacher-messages-reference flex min-w-0 flex-col gap-4 pb-6">
    <header className="teacher-messages-hero"><img src={teacherHeroBackground} alt="" aria-hidden="true" /><div className="teacher-messages-hero__wash" aria-hidden="true" /><div><p>Family communication</p><h1>Mga Mensahe <Send /></h1><span>Makipag-ugnayan at makipagtulungan sa mga magulang para sa mas mahusay na pag-unlad ng bata.</span></div><img className="teacher-messages-hero__teacher" src={teacherIllustration} alt="" aria-hidden="true" /><aside>Mas bukas na komunikasyon, mas malinaw na pag-unlad! ♥</aside></header>

    <section className="teacher-message-workspace" aria-label="Mga pag-uusap">
      <aside className="teacher-message-list-panel">
        <header><span><Mail /></span><div><h2>Mga Pag-uusap</h2><p>Makipag-usap sa mga magulang at tagapag-alaga.</p></div><button type="button" onClick={() => { setError(null); setNewMessageOpen(true); }}><Send /> Bagong Mensahe</button></header>
        <label className="teacher-message-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hanapin ang magulang o mag-aaral..." /></label>
        <nav aria-label="Mga pag-uusap sa mga magulang">
          {(sentLoading || repliesLoading) && <p className="teacher-message-list-empty">Naglo-load ng mga pag-uusap...</p>}
          {(sentError || repliesError) && <p className="teacher-message-list-empty">Hindi ma-load ang messages: {(sentError ?? repliesError)?.message}</p>}
          {!sentLoading && !repliesLoading && !sentError && !repliesError && !filteredParents.length && <p className="teacher-message-list-empty">Walang magulang na naka-link sa iyong roster.</p>}
          {filteredParents.map((parent) => { const latest = latestFor(parent.parentId); const unread = unreadFor(parent.parentId); return <button key={parent.parentId} type="button" className={selectedId === parent.parentId ? 'is-selected' : ''} onClick={() => { setSelectedParentId(parent.parentId); setError(null); markRepliesRead.mutate(parent.parentId); }}><span>{initials(parent.label)}</span><i><b>{parent.label}</b><small>{latest?.message ?? `Magulang ni ${parent.childNames.join(', ')}`}</small></i><time>{latest ? timeLabel(latest.created_at) : ''}{unread > 0 && <em>{unread}</em>}</time></button>; })}
        </nav>
      </aside>

      <article className="teacher-message-conversation">
        {selectedParent ? <>
          <header><span>{initials(selectedParent.label)}</span><div><h2>{selectedParent.label}</h2><p>Magulang ni {selectedParent.childNames.join(', ')} {selectedParent.gradeLabel ? `· ${selectedParent.gradeLabel}` : ''}</p></div></header>
          <div className="teacher-message-thread"><p className="teacher-message-date">{conversation.length ? dayLabel(conversation[conversation.length - 1].created_at) : 'Simulan ang pag-uusap'}</p>{!conversation.length && <p className="teacher-message-thread-empty">Wala pang mensahe sa pag-uusap na ito. Magpadala ng update sa magulang gamit ang box sa ibaba.</p>}{conversation.map((item) => <div className={`teacher-message-bubble ${item.author === 'teacher' ? 'teacher' : 'parent'}`} key={`${item.author}-${item.id}`}><p>{item.message}</p><small>{item.author === 'teacher' ? `Ikaw · ${timeLabel(item.created_at)} ${item.read ? '✓✓' : '✓'}` : `${selectedParent.label} · ${timeLabel(item.created_at)}`}</small></div>)}</div>
          <form className="teacher-message-composer" onSubmit={(event) => { event.preventDefault(); setError(null); sendMessage.mutate(); }}><label><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Isulat ang iyong mensahe..." /><button type="button" className="teacher-message-emoji" onClick={() => setMessage((value) => `${value}${value ? ' ' : ''}🙂`)} aria-label="Magdagdag ng smiley"><Smile /></button></label><button className="teacher-message-send" type="submit" disabled={sendMessage.isPending} aria-label="Ipadala ang mensahe"><Send /></button>{error && <p role="alert">{error}</p>}</form>
        </> : <div className="teacher-message-no-selection"><Mail /><h2>Pumili ng pag-uusap</h2><p>Pumili ng magulang sa kaliwa upang makita o magpadala ng mensahe.</p></div>}
      </article>
    </section>

    {newMessageOpen && <div className="teacher-new-message-modal" role="dialog" aria-modal="true" aria-labelledby="new-message-title" onMouseDown={() => setNewMessageOpen(false)}>
      <article onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p>Bagong mensahe</p><h2 id="new-message-title">Piliin ang Tatanggap</h2><span>Pumili ng magulang na gusto mong padalhan ng update.</span></div><button type="button" onClick={() => setNewMessageOpen(false)} aria-label="Isara">×</button></header>
        <div className="teacher-new-message-modal__list">
          {parentOptions.map((parent) => <button key={parent.parentId} type="button" onClick={() => { setSelectedParentId(parent.parentId); setMessage(''); setNewMessageOpen(false); }}><span>{initials(parent.label)}</span><i><b>{parent.label}</b><small>Magulang ni {parent.childNames.join(', ')}{parent.gradeLabel ? ` · ${parent.gradeLabel}` : ''}</small></i><Send /></button>)}
          {!parentOptions.length && <p>Wala pang magulang na naka-link sa iyong mga mag-aaral.</p>}
        </div>
      </article>
    </div>}
  </div>;
}
