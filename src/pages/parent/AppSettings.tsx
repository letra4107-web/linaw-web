import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { BarChart3, Bell, CalendarDays, Database, Download, Globe2, LockKeyhole, Megaphone, MessageSquare, Monitor, Moon, Palette, ShieldCheck, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useAccessibility, type ThemeMode } from '../../lib/a11y/AccessibilityContext';
import './app-settings.css';
import './app-settings-theme.css';
import './app-settings-dark.css';
import './secondary-tabs-reference.css';

type Channel = 'inApp' | 'email' | 'sms';
type PreferenceKey = 'progress' | 'teacher' | 'schedule' | 'announcements';
type Preferences = Record<PreferenceKey, Record<Channel, boolean>>;
interface ParentSettings { auth_uid: string; notification_preferences: Preferences; preferred_language: string; preferred_theme: ThemeMode; two_factor_preference: boolean; }
const DEFAULT_PREFERENCES: Preferences = { progress: { inApp: true, email: true, sms: false }, teacher: { inApp: true, email: true, sms: false }, schedule: { inApp: true, email: true, sms: false }, announcements: { inApp: true, email: true, sms: false } };
const rows: { key: PreferenceKey; icon: 'bars' | 'message' | 'calendar' | 'megaphone'; title: string; description: string }[] = [
  { key: 'progress', icon: 'bars', title: 'Progress Updates', description: 'Mga update sa reading progress, nakumpleto na aktibidad, at achievement ng iyong anak.' },
  { key: 'teacher', icon: 'message', title: 'Mga Mensahe mula sa Guro', description: 'Mga bagong mensahe, anunsyo, at feedback mula sa guro.' },
  { key: 'schedule', icon: 'calendar', title: 'Schedule Reminders', description: 'Mga paalala para sa reading sessions, activities, at mahahalagang petsa.' },
  { key: 'announcements', icon: 'megaphone', title: 'Mga Anunsyo ng Paaralan', description: 'Mahalagang abiso at updates mula sa LinawLetra at paaralan.' },
];
const normalise = (value?: Partial<Preferences>): Preferences => ({ progress: { ...DEFAULT_PREFERENCES.progress, ...value?.progress }, teacher: { ...DEFAULT_PREFERENCES.teacher, ...value?.teacher }, schedule: { ...DEFAULT_PREFERENCES.schedule, ...value?.schedule }, announcements: { ...DEFAULT_PREFERENCES.announcements, ...value?.announcements } });

function Switch({ checked, label, onClick, disabled = false }: { checked: boolean; label: string; onClick: () => void; disabled?: boolean }) { return <button type="button" disabled={disabled} role="switch" aria-checked={checked} aria-label={label} onClick={onClick} className={`parent-settings-switch ${checked ? 'on' : ''}`}><i /></button>; }
function NotificationIcon({ name }: { name: (typeof rows)[number]['icon'] }) { const Icon = name === 'bars' ? BarChart3 : name === 'message' ? MessageSquare : name === 'calendar' ? CalendarDays : Megaphone; return <Icon size={22} aria-hidden="true" />; }

export default function ParentAppSettings() {
  const { user } = useAuth(); const queryClient = useQueryClient(); const { theme, setTheme } = useAccessibility(); const [downloadStatus, setDownloadStatus] = useState<string | null>(null); const [mfaSetup, setMfaSetup] = useState<{ factorId: string; qr: string } | null>(null); const [mfaCode, setMfaCode] = useState(''); const [mfaStatus, setMfaStatus] = useState<string | null>(null); const [language, setLanguage] = useState('fil'); const [mfaPending, setMfaPending] = useState(false); const [downloadPending, setDownloadPending] = useState(false); const mfaBusy = useRef(false); const downloadBusy = useRef(false); const mfaModalRef = useRef<HTMLDivElement>(null); const cancelMfaRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const settingsQuery = useQuery({ queryKey: ['parent-settings-reference', user?.id], queryFn: async () => { const { data, error } = await supabase.from('parents_settings').select('auth_uid, notification_preferences, preferred_language, preferred_theme, two_factor_preference').eq('auth_uid', user!.id).maybeSingle(); if (error) throw error; if (data) return { ...data, preferred_theme: data.preferred_theme ?? 'default', notification_preferences: normalise(data.notification_preferences as Partial<Preferences>) } as ParentSettings; const initial = { auth_uid: user!.id, notification_preferences: DEFAULT_PREFERENCES, preferred_language: 'fil', preferred_theme: 'default' as ThemeMode, two_factor_preference: false }; const { data: inserted, error: insertError } = await supabase.from('parents_settings').insert(initial).select().single(); if (insertError) throw insertError; return inserted as ParentSettings; }, enabled: Boolean(user) });
  const settings = settingsQuery.data;
  const factorsQuery = useQuery({
    queryKey: ['parent-mfa-factors', user?.id],
    queryFn: async () => { const { data, error } = await supabase.auth.mfa.listFactors(); if (error) throw error; return data; },
    enabled: Boolean(user),
  });
  const verifiedFactor = factorsQuery.data?.totp.find((factor) => factor.status === 'verified');
  const update = useMutation({
    mutationFn: async (patch: Partial<ParentSettings>) => {
      if (!user || !settings) throw new Error('Hintaying ma-load muna ang iyong settings.');
      const { error } = await supabase.from('parents_settings').update(patch).eq('auth_uid', user.id).select('auth_uid').single();
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['parent-settings-reference', user?.id] }), queryClient.invalidateQueries({ queryKey: ['parent-layout-language', user?.id] })]);
    },
    onError: () => { setLanguage(settings?.preferred_language ?? 'fil'); if (settings) setTheme(settings.preferred_theme); },
  });
  const updateChannel = (key: PreferenceKey, channel: Channel) => { if (!settings || update.isPending) return; const prefs = normalise(settings.notification_preferences); prefs[key][channel] = !prefs[key][channel]; update.mutate({ notification_preferences: prefs }); };
  const updateTheme = (nextTheme: ThemeMode) => { setTheme(nextTheme); update.mutate({ preferred_theme: nextTheme }); };
  useEffect(() => { if (!settings?.preferred_language) return; setLanguage(settings.preferred_language); document.documentElement.lang = settings.preferred_language === 'en' ? 'en' : 'fil'; document.documentElement.dataset.language = settings.preferred_language; }, [settings?.preferred_language]);
  const toggleMfa = async () => {
    if (mfaBusy.current || !settings || update.isPending) return;
    mfaBusy.current = true; setMfaPending(true); setMfaStatus(null);
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      const verified = factors?.totp.find((factor) => factor.status === 'verified');
      if (verified) {
        const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
        if (removeError) throw removeError;
        await update.mutateAsync({ two_factor_preference: false });
        await factorsQuery.refetch();
        setMfaStatus('Na-disable ang two-factor authentication.');
        return;
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'LinawLetra Parent' });
      if (enrollError) throw enrollError;
      setMfaSetup({ factorId: data.id, qr: data.totp.qr_code }); setMfaCode('');
    } catch (mfaError) {
      setMfaStatus(mfaError instanceof Error ? mfaError.message : 'Hindi ma-set up ang two-factor authentication.');
    } finally {
      mfaBusy.current = false; setMfaPending(false); void factorsQuery.refetch();
    }
  };
  const verifyMfa = async () => {
    if (!mfaSetup || mfaCode.length !== 6 || mfaBusy.current) return;
    mfaBusy.current = true; setMfaPending(true); setMfaStatus(null);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaSetup.factorId, code: mfaCode });
      if (verifyError) throw verifyError;
      // Factor state is authoritative. A preferences-write failure must not
      // leave the UI offering to verify an already verified factor again.
      setMfaSetup(null); setMfaCode('');
      await factorsQuery.refetch();
      await update.mutateAsync({ two_factor_preference: true });
      setMfaStatus('Naka-enable na ang two-factor authentication.');
    } catch (mfaError) {
      setMfaStatus(mfaError instanceof Error ? mfaError.message : 'Hindi ma-verify ang code.');
    } finally { mfaBusy.current = false; setMfaPending(false); }
  };
  const cancelMfa = async () => {
    if (!mfaSetup || mfaBusy.current) return;
    mfaBusy.current = true; setMfaPending(true); setMfaStatus(null);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaSetup.factorId });
      if (error) throw error;
      setMfaSetup(null); setMfaCode(''); await factorsQuery.refetch();
    } catch (mfaError) {
      setMfaStatus(mfaError instanceof Error ? mfaError.message : 'Hindi maisara ang setup. Subukan muli.');
    } finally { mfaBusy.current = false; setMfaPending(false); }
  };
  cancelMfaRef.current = cancelMfa;
  useEffect(() => {
    if (!mfaSetup) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = mfaModalRef.current;
    modal?.querySelector<HTMLInputElement>('input')?.focus();
    function keepFocus(event: KeyboardEvent) {
      if (event.key === 'Escape' && !mfaBusy.current) { event.preventDefault(); void cancelMfaRef.current(); }
      if (event.key !== 'Tab' || !modal) return;
      const controls = Array.from(modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'));
      const first = controls[0]; const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keepFocus);
    return () => { document.removeEventListener('keydown', keepFocus); previous?.focus(); };
  }, [mfaSetup]);
  const downloadData = async () => {
    if (!user || downloadBusy.current) return;
    downloadBusy.current = true; setDownloadPending(true); setDownloadStatus(null);
    try {
      const [children, progress, messages, activities, replies, profile] = await Promise.all([
        supabase.from('children').select('id, name, grade_level, created_at'),
        supabase.from('child_progress').select('*'),
        supabase.from('teacher_messages').select('message, read, created_at, child_id'),
        supabase.from('scheduled_activities').select('child_id,title,description,activity_type,scheduled_date,start_time,end_time,status'),
        supabase.from('parent_teacher_replies').select('teacher_message_id,child_id,message,created_at,attachment_name'),
        supabase.from('parents').select('avatar_url').eq('auth_uid', user.id).maybeSingle(),
      ]);
      if ([children, progress, messages, activities, replies, profile].some((result) => result.error)) throw new Error('Hindi makuha ang ilan sa iyong data. Subukan muli.');
      const content = JSON.stringify({ exported_at: new Date().toISOString(), account: { name: user.user_metadata?.name ?? null, email: user.email }, profile: profile.data, children: children.data ?? [], progress: progress.data ?? [], messages: messages.data ?? [], activities: activities.data ?? [], replies: replies.data ?? [] }, null, 2);
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'linawletra-parent-data.json'; document.body.append(anchor); anchor.click(); anchor.remove();
      requestAnimationFrame(() => URL.revokeObjectURL(url));
      setDownloadStatus('Na-download na ang iyong data.');
    } catch (downloadError) {
      setDownloadStatus(downloadError instanceof Error ? downloadError.message : 'Hindi ma-download ang data ngayon.');
    } finally { downloadBusy.current = false; setDownloadPending(false); }
  };
  const preference = settings?.notification_preferences ?? DEFAULT_PREFERENCES; const english = language === 'en'; const controlsDisabled = !settings || settingsQuery.isLoading || update.isPending;
  return <div className="parent-settings-reference">
    <header className="parent-settings-hero"><div><p>ACCOUNT SETTINGS</p><h1>{english ? 'Settings' : 'Mga Setting'}</h1><span>{english ? 'Make LinawLetra feel right for your family.' : 'Ayusin ang mga abiso, tema, at seguridad para sa inyong pamilya.'}</span></div></header>
    {settingsQuery.isLoading && <p role="status">Kinukuha ang iyong settings...</p>}
    {settingsQuery.error && <p role="alert">Hindi ma-load ang iyong settings. <button type="button" onClick={() => void settingsQuery.refetch()}>Subukan muli</button></p>}
    {update.error && <p className="secondary-tab-error" role="alert">Hindi na-save ang setting. Subukan ulit mamaya.</p>}
    <section className="settings-card notification-card"><header><span className="settings-icon gold"><Bell size={22} /></span><div><h2>{english ? 'Notification Preferences' : 'Notification Preferences'}</h2><p>{english ? 'Save your notification preferences.' : 'I-save ang iyong mga preference para sa abiso.'}</p></div><aside>i {english ? 'Preferences are stored only. Notification filtering and email/SMS delivery are not connected yet.' : 'Nase-save ang preferences. Hindi pa nakakonekta ang notification filtering at email/SMS delivery.'}</aside></header>{rows.map((row) => <div className="notification-row" key={row.key}><span className={`settings-icon ${row.icon}`}><NotificationIcon name={row.icon} /></span><div><h3>{row.title}</h3><p>{row.description}</p></div>{(['inApp', 'email', 'sms'] as Channel[]).map((channel) => <label key={channel}><span>{channel === 'inApp' ? 'In-app' : channel === 'email' ? 'Email' : 'SMS (optional)'}</span><Switch disabled={controlsDisabled} checked={preference[row.key][channel]} label={`${row.title}: ${channel}`} onClick={() => updateChannel(row.key, channel)} /></label>)}</div>)}</section>
    <div className="settings-two-grid"><section className="settings-card appearance-card"><header><span className="settings-icon purple"><Palette size={22} /></span><div><h2>Appearance</h2><p>{english ? 'Choose your dashboard theme.' : 'Piliin ang tema ng iyong dashboard.'}</p></div></header><div className="appearance-options"><button type="button" disabled={controlsDisabled} className={theme === 'default' ? 'selected' : ''} onClick={() => updateTheme('default')}><Sun size={24} /><b>Light Mode</b></button><button type="button" disabled={controlsDisabled} className={theme === 'dark' ? 'selected' : ''} onClick={() => updateTheme('dark')}><Moon size={24} /><b>Dark Mode</b></button><button type="button" disabled={controlsDisabled} onClick={() => updateTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default')}><Monitor size={24} /><b>Gamitin ang System Theme</b></button></div></section><section className="settings-card language-card"><header><span className="settings-icon blue"><Globe2 size={22} /></span><div><h2>{english ? 'Language' : 'Wika / Language'}</h2><p>{english ? 'Choose the language used in LinawLetra.' : 'Piliin ang wikang gagamitin sa LinawLetra.'}</p></div></header><select aria-label="Wika ng dashboard" disabled={controlsDisabled} value={language} onChange={(event) => { setLanguage(event.target.value); document.documentElement.lang = event.target.value === 'en' ? 'en' : 'fil'; update.mutate({ preferred_language: event.target.value }); }}><option value="fil">Filipino (Default)</option><option value="en">English</option></select></section></div>
    <section className="settings-card security-card"><header><span className="settings-icon purple"><ShieldCheck size={22} /></span><div><h2>Privacy at Seguridad</h2><p>Pamahalaan ang seguridad ng iyong account.</p></div><aside>i Panatilihing ligtas ang iyong account.</aside></header><div className="security-row"><span className="settings-icon blue"><LockKeyhole size={20} /></span><div><h3>Baguhin ang Password</h3><p>Magtakda ng bagong password para sa mas ligtas na account.</p></div><Link to="/parent/settings?password=change">Baguhin ang Password →</Link></div><div className="security-row"><span className="settings-icon green"><ShieldCheck size={20} /></span><div><h3>Two-Factor Authentication (optional)</h3><p>Magdagdag ng karagdagang seguridad sa iyong account.</p>{factorsQuery.error && <small role="alert">Hindi makuha ang MFA status. <button type="button" onClick={() => void factorsQuery.refetch()}>Subukan muli</button></small>}{mfaPending && <small role="status">Ina-update ang seguridad...</small>}{mfaStatus && <small className="settings-status" role="status">{mfaStatus}</small>}</div><Switch disabled={controlsDisabled || mfaPending || factorsQuery.isLoading || Boolean(factorsQuery.error)} checked={Boolean(verifiedFactor)} label="Two-factor authentication" onClick={toggleMfa} /></div></section>
    <section className="settings-card data-card"><header><span className="settings-icon blue"><Database size={22} /></span><div><h2>{english ? 'Data Management' : 'Pamahala ng Data'}</h2><p>{english ? 'Control your information in LinawLetra.' : 'Kontrolin ang iyong impormasyon sa LinawLetra.'}</p></div></header><div className="security-row"><span className="settings-icon purple"><Download size={20} /></span><div><h3>{english ? 'Download my data' : 'I-download ang aking data'}</h3><p>{english ? 'Get a copy of your account data, including progress, activities, and profile.' : 'Kumuha ng kopya ng iyong account data tulad ng progress, activities, at profile.'}</p>{downloadStatus && <small className="settings-status" role="status">{downloadStatus}</small>}</div><button type="button" disabled={downloadPending} onClick={() => void downloadData()}>{downloadPending ? 'Dina-download...' : english ? 'Download Data' : 'I-download ang Data'} →</button></div></section>
    {mfaSetup && <div ref={mfaModalRef} className="settings-mfa-modal" role="dialog" aria-modal="true" aria-labelledby="mfa-title"><div style={{ maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}><button type="button" aria-label="Isara" disabled={mfaPending} onClick={() => void cancelMfa()}>×</button><h2 id="mfa-title">I-set up ang Two-Factor Authentication</h2><p>I-scan ang QR code gamit ang authenticator app, pagkatapos ilagay ang 6-digit code.</p><img src={mfaSetup.qr} alt="QR code para sa authenticator app" /><input disabled={mfaPending} inputMode="numeric" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" aria-label="Authentication code" />{mfaStatus && <p role="alert">{mfaStatus}</p>}<button type="button" disabled={mfaPending || mfaCode.length !== 6} onClick={() => void verifyMfa()}>{mfaPending ? 'Ina-verify...' : 'I-verify at I-enable'}</button></div></div>}
  </div>;
}
