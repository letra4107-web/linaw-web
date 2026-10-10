import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, ChevronRight, Eye, EyeOff, Info, LockKeyhole, Mail, Plus, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import './parent-profile.css';
import './secondary-tabs-reference.css';

type Child = { id: string; name: string; grade_level: number };
type Progress = { child_id: string; level: string };

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
  const save = useMutation({ mutationFn: async () => { if (!email) throw new Error('Hindi mahanap ang email ng account.'); if (!requirements.every(Boolean)) throw new Error('Kumpletuhin ang password requirements.'); if (password !== confirmation) throw new Error('Hindi tugma ang bagong password.'); const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: current }); if (signInError) throw new Error('Mali ang kasalukuyang password.'); const { error: authError } = await supabase.auth.updateUser({ password }); if (authError) throw authError; }, onSuccess: onSaved, onError: (err: Error) => setError(err.message) });
  pendingRef.current = save.isPending;
  return <div role="dialog" aria-modal="true" aria-labelledby="change-password-title" className="fixed inset-0 z-50 grid place-items-center bg-[#102b4d]/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !save.isPending) close(); }}><form ref={formRef} onSubmit={(event) => { event.preventDefault(); if (!save.isPending) { setError(''); save.mutate(); } }} className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl"><header className="flex items-start justify-between gap-3 px-4 pt-5 sm:px-7 sm:pt-7"><div className="flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-blue-600"><LockKeyhole size={31} /></span><div><h2 id="change-password-title" className="text-2xl font-extrabold text-[#1d3568]">Baguhin ang Password</h2><p className="mt-1 text-sm text-[#6175a4]">Magtakda ng bagong password para mas ligtas ang iyong account.</p></div></div><button type="button" aria-label="Isara" disabled={save.isPending} onClick={close} className="rounded-full bg-blue-50 p-2 text-[#254b8b]"><X /></button></header><div className="grid gap-6 px-4 py-5 sm:px-9 sm:py-7 md:grid-cols-[1.18fr_.82fr]"><div className="space-y-5"><PasswordField disabled={save.isPending} show={show} toggle={() => setShow((value) => !value)} autoComplete="current-password" label="Kasalukuyang Password" value={current} onChange={setCurrent} placeholder="Ilagay ang kasalukuyang password" /><PasswordField disabled={save.isPending} show={show} toggle={() => setShow((value) => !value)} autoComplete="new-password" label="Bagong Password" value={password} onChange={setPassword} placeholder="Ilagay ang bagong password" /><section className="rounded-2xl bg-blue-50 p-4 text-sm text-[#5870a3]"><p className="flex items-center gap-2 font-bold text-[#41629c]"><Info size={19} className="text-blue-600" />Password Requirements:</p><ul className="mt-2 space-y-1.5">{['Hindi bababa sa 8 characters', 'May kasamang malaking letra (A-Z)', 'May kasamang maliit na letra (a-z)', 'May kasamang numero (0-9)', 'May kasamang special character (hal. !@#)'].map((item, index) => <li key={item} className="flex items-center gap-2"><Check size={16} className={requirements[index] ? 'text-cyan-600' : 'text-slate-400'} />{item}</li>)}</ul></section><PasswordField disabled={save.isPending} show={show} toggle={() => setShow((value) => !value)} autoComplete="new-password" label="Kumpirmahin ang Bagong Password" value={confirmation} onChange={setConfirmation} placeholder="Ulitin ang bagong password" />{error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}</div><aside className="hidden flex-col justify-center gap-5 md:flex"><div className="grid min-h-52 place-items-center rounded-[2.25rem] bg-gradient-to-br from-blue-50 via-sky-100 to-cyan-100"><span className="grid h-28 w-28 place-items-center rounded-full border-8 border-white bg-blue-600 text-white shadow-lg"><ShieldCheck size={60} /></span></div><section className="rounded-2xl bg-blue-50 p-4 text-sm text-[#5870a3]"><p className="flex items-center gap-2 font-bold text-[#1d4789]"><ShieldCheck size={19} className="text-blue-600" />Mas Ligtas na Account</p><p className="mt-2 leading-5">Panatilihing ligtas ang iyong impormasyon. Gumamit ng malakas na password na hindi madaling hulaan.</p></section></aside></div><footer className="flex flex-col justify-end gap-3 border-t bg-slate-50 px-4 py-5 sm:flex-row sm:px-9"><button type="button" disabled={save.isPending} onClick={close} className="w-full rounded-xl sm:w-auto sm:min-w-40 border border-[#7691c3] px-5 py-3 font-bold text-[#243a6b]">Kanselahin</button><button disabled={save.isPending} className="w-full rounded-xl sm:w-auto sm:min-w-56 bg-[#0879e8] px-5 py-3 font-bold text-white shadow-sm disabled:opacity-60">{save.isPending ? 'Ina-update...' : 'I-update ang Password →'}</button></footer></form></div>;
}

export default function Settings() {
  const { user, identity } = useAuth(); const client = useQueryClient(); const input = useRef<HTMLInputElement>(null); const [searchParams, setSearchParams] = useSearchParams(); const [passwordOpen, setPasswordOpen] = useState(searchParams.get('password') === 'change'); const [message, setMessage] = useState('');
  const { data: children = [] } = useQuery({ queryKey: ['parent-profile-children', user?.id], queryFn: async () => { const { data, error } = await supabase.from('children').select('id,name,grade_level').order('name'); if (error) throw error; return data as Child[]; }, enabled: !!user });
  const { data: progress = [] } = useQuery({ queryKey: ['parent-children-progress', children.map((item) => item.id)], queryFn: async () => { const { data, error } = await supabase.from('child_progress').select('child_id,level').in('child_id', children.map((item) => item.id)); if (error) throw error; return data as Progress[]; }, enabled: children.length > 0 });
  const { data: profile } = useQuery({ queryKey: ['parent-profile', user?.id], queryFn: async () => { const { data, error } = await supabase.from('parents').select('avatar_url').eq('auth_uid', user!.id).maybeSingle(); if (error) throw error; return data as { avatar_url: string | null } | null; }, enabled: !!user });
  const upload = useMutation({ mutationFn: async (file: File) => { if (!user) throw new Error('Kailangang naka-sign in.'); if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) throw new Error('Pumili ng image file na hanggang 2 MB.'); const ext = file.name.split('.').pop() || 'jpg'; const path = `${user.id}/avatar-${Date.now()}.${ext}`; const { error: uploadError } = await supabase.storage.from('parent-avatars').upload(path, file, { contentType: file.type }); if (uploadError) throw uploadError; const { data } = supabase.storage.from('parent-avatars').getPublicUrl(path); const { error: updateError } = await supabase.from('parents').update({ avatar_url: data.publicUrl }).eq('auth_uid', user.id).select('auth_uid').single(); if (updateError) throw updateError; }, onSuccess: () => { setMessage('Na-update ang profile photo.'); client.invalidateQueries({ queryKey: ['parent-profile', user?.id] }); }, onError: (error: Error) => setMessage(error.message) });
  useEffect(() => { if (searchParams.get('password') === 'change') setPasswordOpen(true); }, [searchParams]);
  const closePassword = () => {
    setPasswordOpen(false);
    if (searchParams.has('password')) { const next = new URLSearchParams(searchParams); next.delete('password'); setSearchParams(next, { replace: true }); }
  };
  const initials = (identity?.displayName ?? 'AE').split(' ').map((part) => part[0]).join('').slice(0, 2);
  return (
    <div className="parent-profile-page">
      <header className="parent-profile-hero"><div><p>PARENT PROFILE</p><h1>Aking Detalye</h1><span>Ang iyong account at mga anak, magkakasama sa isang lugar.</span></div></header>
      {message && <p role="status" className="profile-message">{message}</p>}
      <section className="profile-card">
        <header><b className="profile-icon"><UserRound /></b><div><h2>Personal na Impormasyon</h2><p>Mga detalye ng iyong account sa LinawLetra.</p></div><button type="button" className="outline" onClick={() => input.current?.click()} disabled={upload.isPending}><Camera size={16} /> {upload.isPending ? 'Ina-upload...' : 'Palitan ang larawan'}</button></header>
        <div className="personal-grid">
          <button type="button" aria-label="Mag-upload ng profile photo" onClick={() => input.current?.click()} disabled={upload.isPending} className="profile-avatar relative overflow-hidden">{profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile photo" className="h-full w-full object-cover" /> : initials}</button>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate(file); event.target.value = ''; }} />
          <div className="field-grid"><label>Buong Pangalan<input readOnly value={identity?.displayName ?? ''} /></label><label>Email Address<span className="verified"><span>{user?.email ?? 'Walang email'}</span>{user?.email_confirmed_at && <b><Check size={13} /> Verified</b>}</span></label><label>Mobile Number<input readOnly value={user?.phone ?? ''} placeholder="Walang nakatalang numero" /></label><label>Role<input readOnly value="Magulang" /></label></div>
        </div>
      </section>
      <section className="profile-card children">
        <header><b className="profile-icon gold"><UsersRound /></b><div><h2>Konektadong Mga Anak</h2><p>Suportahan ang bawat hakbang ng kanilang pag-aaral.</p></div><Link className="add" to="/parent/children"><Plus size={17} /> Magdagdag ng Anak</Link></header>
        <div className="child-list">{children.map((child) => <Link key={child.id} to={`/parent/children?child=${encodeURIComponent(child.id)}`}><span>{child.name[0]}</span><div><b>{child.name}</b><small>Grade {child.grade_level} • {progress.find((item) => item.child_id === child.id)?.level ?? 'Beginner'}</small></div><ChevronRight size={19} /></Link>)}{!children.length && <p className="profile-empty">Wala pang konektadong anak. Magdagdag ng anak upang masubaybayan ang kanilang pag-aaral.</p>}</div>
      </section>
      <div className="profile-secondary-grid">
        <section className="profile-card contact"><header><b className="profile-icon"><Mail /></b><div><h2>Email at Kontak</h2><p>Dito ipinapadala ang mga update ng iyong account.</p></div></header><p className="profile-contact-value">{user?.email ?? 'Walang nakatalang email'}</p><Link className="profile-settings-link" to="/parent/app-settings">Notification preferences <ChevronRight size={17} /></Link></section>
        <section className="profile-card actions"><header><b className="profile-icon red"><LockKeyhole /></b><div><h2>Seguridad ng Account</h2><p>Panatilihing ligtas ang iyong impormasyon.</p></div></header><div className="action"><LockKeyhole size={20} /><div><b>Baguhin ang Password</b></div><button type="button" onClick={() => { setMessage(''); setPasswordOpen(true); }}>Baguhin <ChevronRight size={16} /></button></div></section>
      </div>
      {passwordOpen && <PasswordModal email={user?.email} close={closePassword} onSaved={() => { closePassword(); setMessage('Na-update na ang iyong password.'); }} />}
    </div>
  );
}
