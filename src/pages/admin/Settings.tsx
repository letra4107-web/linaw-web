import { tagalogError } from '../../lib/validationMessages';
﻿import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useAccessibility } from '../../lib/a11y/AccessibilityContext';
import { CalendarDays, Check, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, Monitor, Moon, Save, Settings as SettingsIcon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { AdminHero, AdminStats, PanelHeading } from './AdminPrimitives';



function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '🛡️';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function Settings() {
  const { user, identity, refreshIdentity } = useAuth();
  const { theme, setTheme, fontScale, setFontScale, readingGuide, setReadingGuide } = useAccessibility();
  const [showPassword, setShowPassword] = useState(false), [showConfirm, setShowConfirm] = useState(false);
  const [systemTheme, setSystemTheme] = useState(false);
  useEffect(() => { if (!systemTheme) return; const media = window.matchMedia('(prefers-color-scheme: dark)'); const apply = () => setTheme(media.matches ? 'dark' : 'default'); apply(); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply); }, [systemTheme, setTheme]);
  const [name, setName] = useState(identity?.displayName ?? '');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error: err } = await supabase.from('users').update({ name: name.trim() }).eq('id', user!.id);
      if (err) throw err;
    },
    onSuccess: async () => {
      setProfileMsg('Name saved.');
      setError(null);
      await refreshIdentity();
    },
    onError: (err: Error) => setError(tagalogError(err)),
  });

  const updateEmail = useMutation({
    mutationFn: async () => {
      const trimmed = newEmail.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        throw new Error("Ilagay ang wastong email address.");
      }
      const { error: err } = await supabase.auth.updateUser({ email: trimmed });
      if (err) throw err;
    },
    onSuccess: () => {
      setEmailMsg('We sent a confirmation to both email addresses. Open the link to complete the change.');
      setNewEmail('');
      setError(null);
    },
    onError: (err: Error) => setError(tagalogError(err)),
  });

  const updatePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        throw new Error("Gumamit ng hindi bababa sa 8 karakter, malaking letra, at numero.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Hindi magkatugma ang mga password.");
      }
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) throw err;
    },
    onSuccess: () => {
      setPasswordMsg('Password updated.');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
    },
    onError: (err: Error) => setError(tagalogError(err)),
  });

  const passwordChecks = [
    { label: 'Hindi bababa sa 8 karakter', met: newPassword.length >= 8 },
    { label: 'Malaking letra (A–Z)', met: /[A-Z]/.test(newPassword) },
    { label: 'Numero (0–9)', met: /[0-9]/.test(newPassword) },
  ];

  const date = (value?: string) => value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }) : '—';
  return <div className="admin-profile-reference"><AdminHero title={identity?.displayName || 'Admin User'} eyebrow="Admin profile" description={user?.email || ''} icon={<span className="admin-profile-hero-avatar">{initialsFor(identity?.displayName || 'Admin User')}</span>}><span className="admin-profile-account-badge"><ShieldCheck />Admin Account</span></AdminHero>
    <AdminStats items={[{ value: date(user?.created_at), label: 'Joined', icon: <CalendarDays /> }, { value: 'Administrator', label: 'Role', icon: <ShieldCheck /> }, { value: 'Active', label: 'Status', icon: <CheckCircle2 />, color: 'mint' }, { value: date(user?.last_sign_in_at), label: 'Last Login', icon: <LockKeyhole />, color: 'violet' }]} />
    {error && <p role="alert" className="admin-error">{error}</p>}
    <div className="admin-profile-grid"><section className="admin-panel"><PanelHeading icon={<UserRound />} title="Personal Information" description="Manage your personal details." /><form className="admin-profile-form" onSubmit={event => { event.preventDefault(); updateProfile.mutate(); }}><label htmlFor="name">Full Name <em>*</em><span><UserRound /><input id="name" required value={name} onChange={event => setName(event.target.value)} /></span></label><label>Email<span><Mail /><input value={user?.email || ''} readOnly /></span></label>{profileMsg && <p role="status" className="admin-success">{profileMsg}</p>}<button type="submit" className="admin-primary-button" disabled={updateProfile.isPending || !name.trim()}><Save />{updateProfile.isPending ? 'Saving…' : 'Save Changes'}</button></form></section>
    <section className="admin-panel"><PanelHeading icon={<Mail />} title="Change Email" description={`Current email: ${user?.email || ''}. We will send a confirmation link before it is changed.`} /><form className="admin-profile-form" onSubmit={event => { event.preventDefault(); updateEmail.mutate(); }}><label htmlFor="newEmail">New Email<span><Mail /><input id="newEmail" type="email" required value={newEmail} onChange={event => setNewEmail(event.target.value)} placeholder="e.g., newadmin@linawletra.com" /></span></label>{emailMsg && <p role="status" className="admin-success">{emailMsg}</p>}<button type="submit" className="admin-primary-button" disabled={updateEmail.isPending || !newEmail.trim()}>{updateEmail.isPending ? 'Sending…' : 'Update Email'}</button></form></section>
    <section className="admin-panel admin-password-panel"><PanelHeading icon={<LockKeyhole />} title="Change Password" description="Use a strong, unique password for admin access." /><form className="admin-profile-form" onSubmit={event => { event.preventDefault(); updatePassword.mutate(); }}><div className="admin-password-grid"><div><label htmlFor="password">New Password <em>*</em><span><LockKeyhole /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="Enter new password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <Eye /> : <EyeOff />}</button></span></label><label htmlFor="confirmPassword">Confirm New Password <em>*</em><span><LockKeyhole /><input id="confirmPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Re-enter new password" /><button type="button" aria-label={showConfirm ? 'Hide confirmation' : 'Show confirmation'} onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? <Eye /> : <EyeOff />}</button></span></label></div><aside><b>Mga kinakailangan sa password:</b>{passwordChecks.map(check => <p key={check.label} className={check.met ? 'met' : ''}><span>{check.met && <Check />}</span>{check.label}</p>)}{confirmPassword && <p className={newPassword === confirmPassword ? 'met' : ''}><span>{newPassword === confirmPassword && <Check />}</span>Magkatugma ang mga password</p>}</aside></div>{passwordMsg && <p role="status" className="admin-success">{passwordMsg}</p>}<button type="submit" className="admin-primary-button" disabled={updatePassword.isPending || !newPassword || !confirmPassword}><KeyRound />{updatePassword.isPending ? 'Updating…' : 'Update Password'}</button></form></section>
    <section className="admin-panel admin-account-preferences"><PanelHeading icon={<SettingsIcon />} title="Account Preferences" description="Customize your admin experience." /><h3>Interface Theme</h3><div className="admin-theme-choices">{[{ label: 'Light', Icon: Sun, value: 'default' }, { label: 'Dark', Icon: Moon, value: 'dark' }, { label: 'System', Icon: Monitor, value: 'system' }].map(({ label, Icon, value }) => <button type="button" key={value} aria-pressed={value === 'system' ? systemTheme : !systemTheme && value === theme} onClick={() => { setSystemTheme(value === 'system'); if (value !== 'system') setTheme(value as 'default' | 'dark'); }}><Icon /><b>{label}</b></button>)}</div><div className="admin-preference-controls"><label>Text Size<select value={fontScale} onChange={event => setFontScale(event.target.value as 'small' | 'medium' | 'large')}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label><label className="admin-reading-guide-choice"><input type="checkbox" checked={readingGuide} onChange={event => setReadingGuide(event.target.checked)} />Reading Guide</label></div></section></div>
  </div>;
}
