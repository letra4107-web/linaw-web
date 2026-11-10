import { EmailChangeForm } from '../../components/EmailChangeForm';
import { tagalogError } from '../../lib/validationMessages';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BookOpen, Camera, Check, ChevronRight, Eye, EyeOff, Heart, Info, KeyRound, LockKeyhole, Mail, MoreVertical, Plus, ShieldCheck, Star, Sun, UserRound, UsersRound, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase, verifyAccountPassword } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';
import type { ParentLearningPath } from './parentLearningData';
import type { ReadingProfile } from '../../components/ReadingInsightsPanel';
import { ParentHomeArtwork } from './ParentHomeArtwork';
import accountHeroArt from '../../assets/parent/children-family-garden.png';
import accountQuoteArt from '../../assets/parent/settings-family-hug.png';
import './settings-overview-reference.css';

type Child = { id: string; name: string; grade_level: number };
type Progress = { child_id: string; level: string };

function ConnectedChild({ child, level, index }: { child: Child; level?: string; index: number }) {
  const path = useQuery({ queryKey: ['parent-learning-path', child.id], queryFn: () => api<ParentLearningPath>(`/parent/children/${child.id}/learning-path`, { auth: true }) });
  const profile = useQuery({ queryKey: ['parent-reading-profile', child.id], queryFn: () => api<{ profile: ReadingProfile }>(`/parent/children/${child.id}/reading-profile`, { auth: true }) });
  const modules = path.data?.modules ?? [];
  const total = modules.reduce((sum, module) => sum + module.content_item_count, 0);
  const completed = modules.reduce((sum, module) => sum + module.completed_content_item_count, 0);
  const score = profile.data?.profile.averageAccuracy;
  const childLink = `/parent/children?child=${encodeURIComponent(child.id)}`;
  return <article className={`account-child tone-${index % 3}`}>
    <Link className="account-child-main" to={childLink} aria-label={`Tingnan si ${child.name}`}>
      <span className="account-child-avatar" aria-hidden="true"><ParentHomeArtwork kind={index % 3 === 1 ? 'girl' : 'boy'} /></span>
      <div className="account-child-copy"><h3>{child.name}</h3><p>{child.grade_level === 0 ? 'Kindergarten' : `Grade ${child.grade_level}`} · {path.data?.effective_level ?? level ?? '—'}</p>
        <div className="account-child-metrics"><span><BookOpen aria-hidden="true" /><span><b>{path.isSuccess ? `${completed} / ${total}` : '—'}</b><small>Aralin</small></span></span><span><Star aria-hidden="true" /><span><b>{profile.isSuccess && score != null ? `${score}%` : '—'}</b><small>Average Score</small></span></span></div>
      </div><ChevronRight className="account-child-chevron" size={18} aria-hidden="true" />
    </Link>
    <details className="account-child-menu"><summary aria-label={`Mga opsyon para kay ${child.name}`}><MoreVertical size={18} aria-hidden="true" /></summary><div><Link to={childLink}>Tingnan ang Anak</Link><Link to={`/parent/progress?child=${encodeURIComponent(child.id)}`}>Tingnan ang Progreso</Link></div></details>
    {(path.isError || profile.isError) && <p className="account-child-error" role="alert">Hindi makuha ang ilang progreso. <button type="button" onClick={() => { if (path.isError) void path.refetch(); if (profile.isError) void profile.refetch(); }}>Subukan muli</button></p>}
  </article>;
}

function PasswordField({ label, value, onChange, placeholder, show, toggle, disabled, autoComplete }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; show: boolean; toggle: () => void; disabled: boolean; autoComplete: string }) {
  return <label className="block text-sm font-bold text-[#233c70]">{label} <em className="not-italic text-red-500">*</em><span className="relative mt-2 block"><input required disabled={disabled} type={show ? 'text' : 'password'} value={value} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-11 w-full rounded-xl border border-blue-200 bg-white px-4 pr-12 font-normal text-slate-800 outline-none focus:border-blue-500" /><button type="button" disabled={disabled} aria-label={show ? 'Itago ang password' : 'Ipakita ang password'} onClick={toggle} className="absolute inset-y-0 right-0 px-4 text-[#254b8b]">{show ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>;
}

function PasswordModal({ close, email, onSaved }: { close: () => void; email?: string; onSaved: () => void }) {
  const [current, setCurrent] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState(''); const [show, setShow] = useState(false); const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  const pendingRef = useRef(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const modal = formRef.current;
    modal?.querySelector<HTMLInputElement>('input')?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pendingRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab' || !modal) return;
      const controls = Array.from(modal.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)'));
      const first = controls[0]; const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, []);
  const requirements = [password.length >= 8, /[A-Z]/.test(password), /[a-z]/.test(password), /\d/.test(password), /[!@#$%^&*]/.test(password)];
  const save = useMutation({ meta: { saveFeedback: 'Na-save ang mga pagbabago.' }, mutationFn: async () => { if (!email) throw new Error('Hindi mahanap ang email ng account.'); if (!requirements.every(Boolean)) throw new Error("Sundin ang lahat ng kinakailangan sa password."); if (password !== confirmation) throw new Error('Hindi tugma ang bagong password.'); await verifyAccountPassword(email, current, (await supabase.auth.getUser()).data.user!.id); const { error: authError } = await supabase.auth.updateUser({ password }); if (authError) throw authError; }, onSuccess: onSaved, onError: (err: Error) => setError(tagalogError(err)) });
  pendingRef.current = save.isPending;
  return <div role="dialog" aria-modal="true" aria-labelledby="change-password-title" className="fixed inset-0 z-50 grid place-items-center bg-[#102b4d]/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !save.isPending) close(); }}><form ref={formRef} onSubmit={(event) => { event.preventDefault(); if (!save.isPending) { setError(''); save.mutate(); } }} className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl"><header className="flex items-start justify-between gap-3 px-4 pt-5 sm:px-7 sm:pt-7"><div className="flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-blue-600"><LockKeyhole size={31} /></span><div><h2 id="change-password-title" className="text-2xl font-extrabold text-[#1d3568]">Baguhin ang Password</h2><p className="mt-1 text-sm text-[#6175a4]">Magtakda ng bagong password para mas ligtas ang iyong account.</p></div></div><button type="button" aria-label="Isara" disabled={save.isPending} onClick={close} className="rounded-full bg-blue-50 p-2 text-[#254b8b]"><X /></button></header><div className="grid gap-6 px-4 py-5 sm:px-9 sm:py-7 md:grid-cols-[1.18fr_.82fr]"><div className="space-y-5"><PasswordField disabled={save.isPending} show={show} toggle={() => setShow((value) => !value)} autoComplete="current-password" label="Kasalukuyang Password" value={current} onChange={setCurrent} placeholder="Ilagay ang kasalukuyang password" /><PasswordField disabled={save.isPending} show={show} toggle={() => setShow((value) => !value)} autoComplete="new-password" label="Bagong Password" value={password} onChange={setPassword} placeholder="Ilagay ang bagong password" /><section className="rounded-2xl bg-blue-50 p-4 text-sm text-[#5870a3]"><p className="flex items-center gap-2 font-bold text-[#41629c]"><Info size={19} className="text-blue-600" />Mga kinakailangan sa password:</p><ul className="mt-2 space-y-1.5">{['Hindi bababa sa 8 karakter', 'May kasamang malaking letra (A-Z)', 'May kasamang maliit na letra (a-z)', 'May kasamang numero (0-9)', 'May kasamang natatanging simbolo (hal. !@#)'].map((item, index) => <li key={item} className="flex items-center gap-2"><Check size={16} className={requirements[index] ? 'text-cyan-600' : 'text-slate-400'} />{item}</li>)}</ul></section><PasswordField disabled={save.isPending} show={show} toggle={() => setShow((value) => !value)} autoComplete="new-password" label="Kumpirmahin ang Bagong Password" value={confirmation} onChange={setConfirmation} placeholder="Ulitin ang bagong password" />{error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}</div><aside className="hidden flex-col justify-center gap-5 md:flex"><div className="grid min-h-52 place-items-center rounded-[2.25rem] bg-gradient-to-br from-blue-50 via-sky-100 to-cyan-100"><span className="grid h-28 w-28 place-items-center rounded-full border-8 border-white bg-blue-600 text-white shadow-lg"><ShieldCheck size={60} /></span></div><section className="rounded-2xl bg-blue-50 p-4 text-sm text-[#5870a3]"><p className="flex items-center gap-2 font-bold text-[#1d4789]"><ShieldCheck size={19} className="text-blue-600" />Mas Ligtas na Account</p><p className="mt-2 leading-5">Panatilihing ligtas ang iyong impormasyon. Gumamit ng malakas na password na hindi madaling hulaan.</p></section></aside></div><footer className="flex flex-col justify-end gap-3 border-t bg-slate-50 px-4 py-5 sm:flex-row sm:px-9"><button type="button" disabled={save.isPending} onClick={close} className="w-full rounded-xl sm:w-auto sm:min-w-40 border border-[#7691c3] px-5 py-3 font-bold text-[#243a6b]">Kanselahin</button><button disabled={save.isPending} className="w-full rounded-xl sm:w-auto sm:min-w-56 bg-[#0879e8] px-5 py-3 font-bold text-white shadow-sm disabled:opacity-60">{save.isPending ? 'Ina-update...' : 'I-update ang Password →'}</button></footer></form></div>;
}

export default function Settings() {
  const { user, identity, refreshIdentity } = useAuth(); const client = useQueryClient(); const input = useRef<HTMLInputElement>(null); const [searchParams, setSearchParams] = useSearchParams(); const [passwordOpen, setPasswordOpen] = useState(searchParams.get('password') === 'change'); const [message, setMessage] = useState('');
  const childrenQuery = useQuery({ queryKey: ['parent-profile-children', user?.id], queryFn: async () => { const { data, error } = await supabase.from('children').select('id,name,grade_level').order('name'); if (error) throw error; return data as Child[]; }, enabled: !!user });
  const children = childrenQuery.data ?? [];
  const { data: progress = [] } = useQuery({ queryKey: ['parent-children-progress', children.map((item) => item.id)], queryFn: async () => { const { data, error } = await supabase.from('child_progress').select('child_id,level').in('child_id', children.map((item) => item.id)); if (error) throw error; return data as Progress[]; }, enabled: children.length > 0 });
  const { data: profile } = useQuery({ queryKey: ['parent-profile', user?.id], queryFn: async () => { const { data, error } = await supabase.from('parents').select('avatar_url,full_name,phone_number').eq('auth_uid', user!.id).maybeSingle(); if (error) throw error; return data as { avatar_url: string | null; full_name: string; phone_number: string | null } | null; }, enabled: !!user });
  const factors = useQuery({ queryKey: ['parent-mfa-factors', user?.id], queryFn: async () => { const { data, error } = await supabase.auth.mfa.listFactors(); if (error) throw error; return data; }, enabled: Boolean(user) });
  const mfaEnabled = factors.data?.totp.some((factor) => factor.status === 'verified') === true;
  const upload = useMutation({ meta: { saveFeedback: 'Na-save ang mga pagbabago.' }, mutationFn: async (file: File) => { if (!user) throw new Error('Kailangang naka-sign in.'); if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) throw new Error("Pumili ng larawan na hanggang 2 MB."); const ext = file.name.split('.').pop() || 'jpg'; const path = `${user.id}/avatar-${Date.now()}.${ext}`; const { error: uploadError } = await supabase.storage.from('parent-avatars').upload(path, file, { contentType: file.type }); if (uploadError) throw uploadError; const { data } = supabase.storage.from('parent-avatars').getPublicUrl(path); const { error: updateError } = await supabase.from('parents').update({ avatar_url: data.publicUrl }).eq('auth_uid', user.id).select('auth_uid').single(); if (updateError) throw updateError; }, onSuccess: () => { setMessage('Na-update ang profile photo.'); void client.invalidateQueries({ queryKey: ['message-profile-photos'] }); client.invalidateQueries({ queryKey: ['parent-profile', user?.id] }); }, onError: (error: Error) => setMessage(tagalogError(error)) });
  useEffect(() => { if (searchParams.get('password') === 'change') setPasswordOpen(true); }, [searchParams]);
  const closePassword = () => {
    setPasswordOpen(false);
    if (searchParams.has('password')) { const next = new URLSearchParams(searchParams); next.delete('password'); setSearchParams(next, { replace: true }); }
  };
  const [draftName,setDraftName]=useState<string|null>(null),[draftPhone,setDraftPhone]=useState<string|null>(null);
  const contact=useMutation({meta:{saveFeedback:'Profile updated successfully'},mutationFn:async()=>{
    const {error}=await supabase.rpc('save_parent_contact',{p_name:(draftName ?? profile?.full_name ?? identity?.displayName ?? '').trim(),p_phone:(draftPhone ?? profile?.phone_number ?? '').trim()});if(error)throw error;
  },onSuccess:async()=>{await client.invalidateQueries({queryKey:['parent-profile']});await refreshIdentity();setDraftName(null);setDraftPhone(null);}});
  const displayName = profile?.full_name || identity?.displayName || 'Magulang';
  const initials = displayName.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const verified = Boolean(user?.email_confirmed_at);
  return (
    <div className="parent-account-reference">
      <header className="account-hero">
        <img src={accountHeroArt} className="account-hero-art" alt="" aria-hidden="true" fetchPriority="high" decoding="sync" />
        <div className="account-hero-copy"><p>PARENT PROFILE</p><h1>Aking <em>Detalye</em> <Sun aria-hidden="true" /></h1><span>Ang iyong account at mga anak, magkakasama sa isang lugar.</span></div>
        <aside className="account-hero-note">Mas maganda ang bukas para sa inyong anak, sama-sama! <Heart fill="currentColor" aria-hidden="true" /></aside>
      </header>
      {message && <p role="status" className="account-message">{message}</p>}
      <div className="account-primary-grid">
      <section className="account-card account-personal" aria-labelledby="account-personal-title">
        <header className="account-card-heading"><span className="account-icon blue"><UserRound aria-hidden="true" /></span><div><h2 id="account-personal-title">Personal na Impormasyon</h2><p>Mga detalye ng iyong account sa LinawLetra.</p></div><button type="button" className="account-outline" onClick={() => input.current?.click()} disabled={upload.isPending}><Camera size={16} aria-hidden="true" /> {upload.isPending ? 'Ina-upload...' : 'Palitan ang Larawan'}</button></header>
        <div className="account-personal-grid">
          <div className="account-identity"><div className="account-photo-wrap"><button type="button" aria-label="Mag-upload ng profile photo" onClick={() => input.current?.click()} disabled={upload.isPending} className="account-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile photo" /> : initials}</button><span className="account-camera" aria-hidden="true"><Camera size={18} /></span></div><div className="account-identity-name"><h3>{displayName}</h3><span>Parent</span></div><p>Magulang na laging suporta sa paglalakbay sa pagbasa ng anak.</p></div>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Larawan ng profile" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.target.value = ''; }} />
          <form className="account-fields" onSubmit={event=>{event.preventDefault();if(!contact.isPending)contact.mutate();}}>
            <label>Buong Pangalan<input aria-label="Buong Pangalan" required minLength={2} maxLength={100} value={draftName ?? displayName} onChange={event=>{setDraftName(event.target.value);if(!contact.isPending)contact.reset();}} disabled={contact.isPending}/></label>
            <label>Mobile Number<input aria-label="Mobile Number" type="tel" maxLength={25} value={draftPhone ?? profile?.phone_number ?? ''} onChange={event=>{setDraftPhone(event.target.value);if(!contact.isPending)contact.reset();}} disabled={contact.isPending}/></label>
            <p><Mail aria-hidden="true"/>{user?.email}</p><EmailChangeForm/>
            <p>Magulang</p><button className="account-primary" disabled={contact.isPending || !profile} type="submit">{contact.isPending?'Sine-save...':'I-save ang Profile'}</button>
            {contact.error && <p role="alert">{tagalogError(contact.error)}</p>}
          </form>
        </div>
      </section>
      <aside className="account-family-quote"><img src={accountQuoteArt} alt="" aria-hidden="true" decoding="sync" /><blockquote>“Ang inyong suporta ngayon, mas maliwanag na paglalakbay sa pagbasa bukas.” <Heart fill="currentColor" aria-hidden="true" /></blockquote></aside>
      </div>
      <section className="account-card account-children" aria-labelledby="account-children-title">
        <header className="account-card-heading"><span className="account-icon gold"><UsersRound aria-hidden="true" /></span><div><h2 id="account-children-title">Konektadong Mga Anak</h2><p>Suportahan ang bawat hakbang ng kanilang pag-aaral.</p></div><Link className="account-primary" to="/parent/children?enroll=1"><Plus size={17} aria-hidden="true" /> Magdagdag ng Anak</Link></header>
        <div className="account-child-list">{childrenQuery.isLoading ? <p className="account-empty" role="status">Kinukuha ang mga anak...</p> : childrenQuery.isError ? <p className="account-empty" role="alert">Hindi makuha ang listahan ng mga anak. <button type="button" onClick={() => void childrenQuery.refetch()}>Subukan muli</button></p> : children.map((child, index) => <ConnectedChild key={child.id} child={child} level={progress.find((item) => item.child_id === child.id)?.level} index={index} />)}{childrenQuery.isSuccess && !children.length && <p className="account-empty">Wala pang konektadong anak. Magdagdag ng anak upang masubaybayan ang kanilang pag-aaral.</p>}</div>
      </section>
      <div className="account-secondary-grid">
        <section className="account-card account-contact" aria-labelledby="account-contact-title"><header className="account-card-heading"><span className="account-icon blue"><Mail aria-hidden="true" /></span><div><h2 id="account-contact-title">Email at Kontak</h2><p>Dito ipinapadala ang mga update, anunsyo, at importanteng impormasyon.</p></div></header><div className="account-contact-email"><Mail aria-hidden="true" /><div><small>Email Address</small><b>{user?.email ?? 'Walang nakatalang email'}</b></div>{verified && <span className="account-verified"><Check size={13} aria-hidden="true" /> Verified</span>}</div><Link className="account-action" to="/parent/app-settings"><span className="account-icon rose"><Bell aria-hidden="true" /></span><span><b>Notification Preferences</b><small>Piliin kung anong updates ang gusto mong matanggap.</small></span><ChevronRight size={19} aria-hidden="true" /></Link></section>
        <section className="account-card account-security" aria-labelledby="account-security-title"><header className="account-card-heading"><span className="account-icon rose"><LockKeyhole aria-hidden="true" /></span><div><h2 id="account-security-title">Seguridad ng Account</h2><p>Panatilihing ligtas ang iyong impormasyon.</p></div></header><div className="account-action"><span className="account-icon gold"><KeyRound aria-hidden="true" /></span><span><b>Baguhin ang Password</b><small>Maglagay ng bagong password para mas secure ang iyong account.</small></span><button type="button" className="account-rose-button" onClick={() => { setMessage(''); setPasswordOpen(true); }}>Baguhin <ChevronRight size={16} aria-hidden="true" /></button></div><div className="account-action"><span className="account-icon green"><ShieldCheck aria-hidden="true" /></span><span><b>Two-Factor Authentication</b><small>{mfaEnabled ? 'Naka-enable ang dagdag na proteksyon sa account.' : 'Magdagdag ng karagdagang seguridad sa iyong account.'}</small></span><Link className="account-rose-button" to="/parent/app-settings">{mfaEnabled || factors.isError || factors.isPending ? 'I-manage' : 'I-enable'} <ChevronRight size={16} aria-hidden="true" /></Link></div></section>
      </div>
      {passwordOpen && <PasswordModal email={user?.email} close={closePassword} onSaved={() => { closePassword(); setMessage('Na-update na ang iyong password.'); }} />}
    </div>
  );
}
