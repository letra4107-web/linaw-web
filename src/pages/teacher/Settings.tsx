import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BookOpen, BriefcaseBusiness, Camera, Check, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Moon, Palette, Save, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useAccessibility, type ThemeMode } from '../../lib/a11y/AccessibilityContext';
import teacherHeroBackground from '../../assets/teacher/Teacher Home Hero Banner Background.png';
import teacherIllustration from '../../assets/teacher/Teacher Illustration.png';

const initialsFor = (name: string) => name.trim().split(/\s+/).filter(Boolean).map((item) => item[0]).join('').slice(0, 2).toUpperCase() || 'GU';

export default function Settings() {
  const { user, identity, refreshIdentity } = useAuth();
  const { theme, setTheme } = useAccessibility();
  const queryClient = useQueryClient();
  const [name, setName] = useState(identity?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  const { data: teacherProfile } = useQuery({ queryKey: ['teacher-profile-settings', user?.id], queryFn: async () => {
    const { data, error: queryError } = await supabase.from('teacher_profiles').select('notify_by_email, notify_progress, notify_schedule, grade_levels, avatar_url').eq('user_id', user!.id).maybeSingle();
    if (queryError) throw queryError;
    return data as { notify_by_email: boolean; notify_progress: boolean; notify_schedule: boolean; grade_levels: number[]; avatar_url: string | null } | null;
  }, enabled: Boolean(user) });
  const gradeLevels = teacherProfile?.grade_levels ?? [];

  const updateProfile = useMutation({ mutationFn: async () => {
    if (!name.trim()) throw new Error('Ilagay ang iyong pangalan.');
    const { error: updateError } = await supabase.from('users').update({ name: name.trim() }).eq('id', user!.id);
    if (updateError) throw updateError;
  }, onSuccess: async () => { setProfileMsg('Na-save ang iyong profile.'); setError(null); await refreshIdentity(); }, onError: (mutationError: Error) => setError(mutationError.message) });

  const updatePassword = useMutation({ mutationFn: async () => {
    if (!currentPassword) throw new Error('Ilagay ang kasalukuyang password.');
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) throw new Error('Sundin ang lahat ng password requirements.');
    if (newPassword !== confirmPassword) throw new Error('Hindi magkatugma ang bagong password.');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email ?? '', password: currentPassword });
    if (signInError) throw new Error('Hindi tama ang kasalukuyang password.');
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;
  }, onSuccess: () => { setPasswordMsg('Na-update ang password.'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError(null); }, onError: (mutationError: Error) => setError(mutationError.message) });

  const toggleNotify = useMutation({ mutationFn: async ({ key, value }: { key: 'notify_by_email' | 'notify_progress' | 'notify_schedule'; value: boolean }) => {
    const { error: updateError } = await supabase.from('teacher_profiles').update({ [key]: value }).eq('user_id', user!.id);
    if (updateError) throw updateError;
  }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-profile-settings'] }), onError: (mutationError: Error) => setError(mutationError.message) });

  const uploadAvatar = useMutation({ mutationFn: async (file: File) => {
    if (!user) throw new Error('Kailangang naka-sign in para mag-upload.');
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) throw new Error('Pumili ng PNG, JPG, o WEBP na hanggang 2 MB.');
    const extension = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('teacher-avatars').upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('teacher-avatars').getPublicUrl(path);
    const { error: profileError } = await supabase.from('teacher_profiles').update({ avatar_url: data.publicUrl }).eq('user_id', user.id);
    if (profileError) throw profileError;
  }, onSuccess: () => { setProfileMsg('Na-update ang profile photo.'); setError(null); queryClient.invalidateQueries({ queryKey: ['teacher-profile-settings'] }); }, onError: (mutationError: Error) => setError(mutationError.message) });

  const passwordChecks = [
    ['8+ characters', newPassword.length >= 8], ['May malaking letra (A-Z)', /[A-Z]/.test(newPassword)], ['May maliit na letra (a-z)', /[a-z]/.test(newPassword)], ['May numero (0-9)', /[0-9]/.test(newPassword)], ['May special character (!@#)', /[^A-Za-z0-9]/.test(newPassword)],
  ];
  const chooseTheme = (next: ThemeMode) => setTheme(next);
  const automaticTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default';

  return <div className="teacher-settings-reference flex min-w-0 flex-col gap-4 pb-6">
    <header className="teacher-settings-hero"><img src={teacherHeroBackground} alt="" aria-hidden="true" /><div className="teacher-settings-hero__wash" aria-hidden="true" /><div><p>Magandang araw,</p><h1>{identity?.displayName ?? 'Guro'} <span>👋</span></h1><small>Pamahalaan ang iyong account at mga kagustuhan sa LinawLetra.</small></div><img className="teacher-settings-hero__teacher" src={teacherIllustration} alt="" aria-hidden="true" /><aside>Patuloy na nagbigay ng mas maliwanag na kinabukasan para sa bawat bata. ♥</aside><section><button type="button" className="teacher-avatar-upload" onClick={() => avatarInput.current?.click()} disabled={uploadAvatar.isPending} aria-label="Palitan ang profile photo">{teacherProfile?.avatar_url ? <img src={teacherProfile.avatar_url} alt="Profile photo" /> : initialsFor(identity?.displayName ?? 'Guro')}<i><Camera /></i></button><input ref={avatarInput} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadAvatar.mutate(file); event.target.value = ''; }} /><div><b>{identity?.displayName ?? 'Guro'}</b><small>{user?.email}</small><i><BriefcaseBusiness /> Guro</i><i><BookOpen /> Grade {gradeLevels.join(', ') || '—'}</i></div><button type="button" className="teacher-avatar-button" onClick={() => avatarInput.current?.click()} disabled={uploadAvatar.isPending}><Camera /> {uploadAvatar.isPending ? 'Ina-upload...' : 'Palitan ang Litrato'}</button></section></header>
    {error && <p className="teacher-settings-notice error" role="alert">{error}</p>}
    <div className="teacher-settings-grid">
      <section className="teacher-settings-card teacher-profile-card"><header><span><UserRound /></span><div><h2>Profile Ko</h2><p>I-edit ang iyong personal na impormasyon.</p></div></header><form onSubmit={(event) => { event.preventDefault(); updateProfile.mutate(); }}><label><span><UserRound /> Pangalan</span><input value={name} onChange={(event) => setName(event.target.value)} aria-label="Pangalan" /></label><label><span><Mail /> Email</span><input value={user?.email ?? ''} readOnly aria-label="Email" /></label><label><span><BriefcaseBusiness /> Tungkulin</span><select value="teacher" disabled aria-label="Tungkulin"><option value="teacher">Guro</option></select></label><div className="teacher-grade-list"><span><BookOpen /> Mga Grade na Itinuturo</span><div>{gradeLevels.map((grade) => <label key={grade}><input type="checkbox" checked readOnly /> Grade {grade}</label>)}{!gradeLevels.length && <small>Wala pang assigned grade.</small>}</div></div>{profileMsg && <p className="teacher-settings-notice success">{profileMsg}</p>}<button type="submit" disabled={updateProfile.isPending}><Save /> {updateProfile.isPending ? 'Sine-save...' : 'I-save ang mga Pagbabago'}</button></form></section>
      <section className="teacher-settings-card teacher-password-card"><header><span><LockKeyhole /></span><div><h2>Palitan ang Password</h2><p>Panatilihing ligtas ang iyong account.</p></div></header><form onSubmit={(event) => { event.preventDefault(); updatePassword.mutate(); }}><div className="teacher-password-layout"><div className="teacher-password-fields"><label>Kasalukuyang Password<span><LockKeyhole /><input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Ilagay ang kasalukuyang password" /><button type="button" onClick={() => setShowCurrent((value) => !value)} aria-label="Ipakita o itago ang kasalukuyang password">{showCurrent ? <EyeOff /> : <Eye />}</button></span></label><label>Bagong Password<span><LockKeyhole /><input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Ilagay ang bagong password" /><button type="button" onClick={() => setShowNew((value) => !value)} aria-label="Ipakita o itago ang bagong password">{showNew ? <EyeOff /> : <Eye />}</button></span></label><label>Kumpirmahin ang Bagong Password<span><LockKeyhole /><input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Ilagay muli ang bagong password" /><button type="button" onClick={() => setShowConfirm((value) => !value)} aria-label="Ipakita o itago ang bagong password">{showConfirm ? <EyeOff /> : <Eye />}</button></span></label></div><aside><ShieldCheck /><b>Mga Kailangan sa Password:</b>{passwordChecks.map(([label, met]) => <p className={met ? 'met' : ''} key={label as string}><Check /> {label as string}</p>)}</aside></div>{passwordMsg && <p className="teacher-settings-notice success">{passwordMsg}</p>}<button type="submit" disabled={updatePassword.isPending}><LockKeyhole /> {updatePassword.isPending ? 'Ina-update...' : 'I-update ang Password'}</button></form></section>
      <section className="teacher-settings-card teacher-notification-card"><header><span><Bell /></span><div><h2>Mga Abiso</h2><p>Piliin kung anong mga abiso ang gusto mong matanggap.</p></div></header><div className="teacher-notification-list"><label className="teacher-notification-toggle"><Mail /><span><b>Ipadala sa email ang mga update</b><small>Makakatanggap ka ng mahahalagang email notification.</small></span><input type="checkbox" checked={teacherProfile?.notify_by_email ?? true} onChange={(event) => toggleNotify.mutate({ key: 'notify_by_email', value: event.target.checked })} aria-label="Ipadala sa email ang mga update" /><i /></label><label className="teacher-notification-toggle"><BookOpen /><span><b>Mga ulat sa progreso ng mag-aaral</b><small>Abiso kapag may bagong progress activity.</small></span><input type="checkbox" checked={teacherProfile?.notify_progress ?? true} onChange={(event) => toggleNotify.mutate({ key: 'notify_progress', value: event.target.checked })} aria-label="Mga ulat sa progreso ng mag-aaral" /><i /></label><label className="teacher-notification-toggle"><Bell /><span><b>Mga paalala sa iskedyul</b><small>Abiso para sa mga naka-iskedyul na gawain.</small></span><input type="checkbox" checked={teacherProfile?.notify_schedule ?? false} onChange={(event) => toggleNotify.mutate({ key: 'notify_schedule', value: event.target.checked })} aria-label="Mga paalala sa iskedyul" /><i /></label></div></section>
      <section className="teacher-settings-card teacher-theme-card"><header><span><Palette /></span><div><h2>Tema at Display</h2><p>Piliin ang theme na komportable para sa iyo.</p></div></header><div className="teacher-theme-options"><button type="button" className={theme === 'default' ? 'selected' : ''} onClick={() => chooseTheme('default')}><Sun /><b>Maliwanag</b><small>Maliwanag at buhay</small>{theme === 'default' && <CheckCircle2 />}</button><button type="button" className={theme === 'dark' ? 'selected' : ''} onClick={() => chooseTheme('dark')}><Moon /><b>Madilim</b><small>Mas komportable sa mata</small>{theme === 'dark' && <CheckCircle2 />}</button><button type="button" className={theme === automaticTheme ? 'selected' : ''} onClick={() => chooseTheme(automaticTheme)}><Palette /><b>Awtomatiko</b><small>Ayon sa iyong device</small>{theme === automaticTheme && <CheckCircle2 />}</button></div></section>
    </div>
  </div>;
}
