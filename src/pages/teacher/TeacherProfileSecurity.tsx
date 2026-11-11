import {Toggle as SwitchControl} from '../../components/a11y/Toggle';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Monitor, ShieldCheck, Smartphone, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';

export function ProfileDialog({ title, children, onClose, busy = false }: { title:string; children:ReactNode; onClose:()=>void; busy?:boolean }) {
  const ref = useRef<HTMLDialogElement>(null), opener = useRef<HTMLElement | null>(null);
  useEffect(() => { if (!opener.current) opener.current = document.activeElement as HTMLElement; const element = ref.current; element?.showModal(); return () => { element?.close(); queueMicrotask(() => { if (opener.current?.isConnected) opener.current.focus({ preventScroll:true }); }); }; }, []);
  return <dialog ref={ref} className="tp-dialog" aria-labelledby="tp-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><header><h2 id="tp-dialog-title">{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Isara ang detalye"><X aria-hidden /></button></header>{children}</dialog>;
}

export function TeacherProfileSecurity({ title='Account Security', description='Mga setting para sa seguridad ng iyong account.', passwordAction }: { title?:string; description?:string; passwordAction?:ReactNode }) {
  const { user } = useAuth();
  const factors = useQuery({ queryKey:['teacher-mfa-factors',user?.id], queryFn:async () => { const { data,error } = await supabase.auth.mfa.listFactors(); if (error) throw error; return data; }, enabled:Boolean(user) });
  const verified = factors.data?.totp.find(factor => factor.status === 'verified');
  const [setup,setSetup] = useState<{ id:string; qr?:string; disabling:boolean } | null>(null);
  const [code,setCode] = useState(''), [notice,setNotice] = useState(''), [busy,setBusy] = useState(false), [sessionsOpen,setSessionsOpen] = useState(false);
  const guard = useRef(false);
  async function begin() {
    if (guard.current) return; guard.current = true; setBusy(true); setNotice(''); setCode('');
    try {
      const { data,error } = await supabase.auth.mfa.listFactors(); if (error) throw error;
      const current = data.totp.find(factor => factor.status === 'verified');
      if (current) setSetup({ id:current.id,disabling:true });
      else {
        for (const pending of data.all.filter(factor => factor.status === 'unverified' && factor.friendly_name === 'LinawLetra Teacher')) {
          const cleanup = await supabase.auth.mfa.unenroll({ factorId:pending.id }); if (cleanup.error) throw cleanup.error;
        }
        const result = await supabase.auth.mfa.enroll({ factorType:'totp',friendlyName:'LinawLetra Teacher' }); if (result.error) throw result.error; setSetup({ id:result.data.id,qr:result.data.totp.qr_code,disabling:false });
      }
    } catch { setNotice('Hindi mabuksan ang two-factor setup. Subukan muli.'); }
    finally { guard.current = false; setBusy(false); }
  }
  async function cancel() {
    if (!setup || guard.current) return; guard.current = true; setBusy(true); setNotice('');
    try {
      if (!setup.disabling) { const { error } = await supabase.auth.mfa.unenroll({ factorId:setup.id }); if (error) throw error; }
      setSetup(null); setCode(''); void factors.refetch();
    } catch { setNotice('Hindi maisara ang setup. Subukan muli upang makansela ang pending factor.'); }
    finally { guard.current = false; setBusy(false); }
  }
  async function confirm() {
    if (!setup || code.length !== 6 || guard.current) return; guard.current = true; setBusy(true); setNotice('');
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId:setup.id,code }); if (error) throw error;
      if (setup.disabling) { const result = await supabase.auth.mfa.unenroll({ factorId:setup.id }); if (result.error) throw result.error; }
      setNotice(setup.disabling ? 'Na-disable ang two-factor authentication.' : 'Naka-enable na ang two-factor authentication.'); setSetup(null); setCode(''); await factors.refetch();
    } catch { setNotice('Hindi ma-verify ang code o ma-update ang factor. Subukan muli.'); }
    finally { guard.current = false; setBusy(false); }
  }
  return <section className="tp-card tp-security"><header className="tp-heading"><span className="tp-icon"><ShieldCheck aria-hidden /></span><div><h2>{title}</h2><p>{description}</p></div></header>
    {passwordAction}
    <div className="tp-security-row"><span className="tp-action-icon green"><Smartphone aria-hidden /></span><div><b>Two-Factor Authentication (Optional)</b><small>Magdagdag ng karagdagang seguridad.</small></div><SwitchControl label="Two-factor authentication" on={Boolean(verified)} disabled={factors.isLoading||Boolean(factors.error)||busy} onClick={()=>void begin()}/></div>
    {factors.error && <p className="tp-notice error" role="alert">Hindi makuha ang MFA status. <button type="button" onClick={() => void factors.refetch()}>Subukan muli</button></p>}
    {!setup && notice && <p className="tp-notice" role="status">{notice}</p>}
    <button type="button" className="tp-security-row tp-session-button" onClick={() => setSessionsOpen(true)}><span className="tp-action-icon blue"><Monitor aria-hidden /></span><span><b>Mga Active na Session</b><small>Tingnan ang session sa browser na ito.</small></span><ChevronRight aria-hidden /></button>
    {setup && <ProfileDialog title={setup.disabling ? 'Pamahalaan ang Two-Factor Authentication' : 'I-enable ang Two-Factor Authentication'} busy={busy} onClose={() => void cancel()}><form className="tp-mfa-form" onSubmit={event => { event.preventDefault(); void confirm(); }}><p>{setup.disabling ? 'Ilagay ang code mula sa iyong authenticator upang i-disable ang factor.' : 'I-scan ang QR code gamit ang authenticator app. Ilagay ang anim na digit upang kumpletuhin ang setup.'}</p>{setup.qr && <img className="tp-qr" src={setup.qr} alt="QR code para sa authenticator setup" />}<label>Authenticator code<input autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} onChange={event => setCode(event.target.value.replace(/\D/g,''))} required pattern="[0-9]{6}" /></label>{notice && <p className="tp-notice error" role="alert">{notice}</p>}<button type="submit" className="tp-primary" disabled={busy || code.length !== 6}>{busy ? 'Pinoproseso…' : setup.disabling ? 'I-disable ang Two-Factor' : 'I-verify at I-enable'}</button><button type="button" className="tp-secondary" disabled={busy} onClick={() => void cancel()}>Kanselahin</button></form></ProfileDialog>}
    {sessionsOpen && <ProfileDialog title="Kasalukuyang Browser Session" onClose={() => setSessionsOpen(false)}><div className="tp-session-details"><Monitor aria-hidden /><b>{user?.email}</b><p>Naka-sign in sa browser na ito.</p><dl><dt>Device</dt><dd>{navigator.platform || 'Kasalukuyang device'}</dd><dt>Session</dt><dd>Aktibo sa browser na ito</dd></dl><p>Ang session na ito lamang ang ipinapakita rito.</p></div></ProfileDialog>}
  </section>;
}
