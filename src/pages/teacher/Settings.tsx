import {Toggle as SwitchControl} from '../../components/a11y/Toggle';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BarChart3, Bell, BookOpen, Camera, CalendarDays, Check, ChevronRight, Database, Download, GraduationCap, Heart, LockKeyhole, LogOut, Mail, Megaphone, Monitor, Moon, Palette, Pencil, Settings as GearIcon, Sun, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/auth/AuthContext';
import { useAccessibility } from '../../lib/a11y/AccessibilityContext';
import { useTeacherPreferences } from '../../lib/teacher/useTeacherPreferences';
import type { TeacherNoticeCategory, TeacherThemeMode } from '../../lib/teacher/preferences';
import { softSignOut } from '../../lib/auth/softSignOut';
import { loadTeacherParentReplies } from '../../lib/messages/teacherMessages';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { ProfileDialog, TeacherProfileSecurity } from './TeacherProfileSecurity';
import classroom from '../../assets/teacher/Teacher Home Hero Banner Background.png';
import teacher from '../../assets/teacher/Teacher Illustration.png';
import './profile-reference.css';
import './settings-reference.css';

const modes = [{id:'light',label:'Maliwanag',description:'Maliwanag at buhay',Icon:Sun},{id:'dark',label:'Madilim',description:'Mas komportable sa mata',Icon:Moon},{id:'system',label:'Awtomatiko',description:'Ayon sa iyong device',Icon:Palette}] as const;
const notices: {id:TeacherNoticeCategory;label:string;description:string;tone:string;Icon:typeof Bell}[] = [
  {id:'announcements',label:'Mga anunsyo at updates',description:'Mga bagong anunsyo at balita.',tone:'pink',Icon:Megaphone},
  {id:'messages',label:'Mga abiso sa mensahe',description:'Mga update tungkol sa iyong mga pag-uusap.',tone:'blue',Icon:Mail},
  {id:'schedule',label:'Mga paalala sa gawain',description:'Mga paalala sa aralin, aktibidad, at takdang-aralin.',tone:'gold',Icon:CalendarDays},
  {id:'progress',label:'Ulat ng progreso',description:'Mga update sa pagbabasa ng mga mag-aaral.',tone:'green',Icon:BarChart3},
];
function ThemeMiniature({mode}:{mode:TeacherThemeMode}) { return <span className={`tsg-mini ${mode}`} aria-hidden="true"><i><b/><b/><b/></i><span><em><UserRound/></em><span><b/><b/><b/></span></span></span>; }
export default function Settings() {
  const {user,identity}=useAuth(),{theme,setTheme}=useAccessibility(),{preferences,update}=useTeacherPreferences();
  const [notice,setNotice]=useState(''),[preview,setPreview]=useState<TeacherThemeMode|null>(null),[downloadNotice,setDownloadNotice]=useState('');
  const profile=useQuery({queryKey:['teacher-profile-settings',user?.id],queryFn:async()=>{const {data,error}=await supabase.from('teacher_profiles').select('grade_levels, avatar_url').eq('user_id',user!.id).maybeSingle();if(error)throw error;return data as {grade_levels:number[];avatar_url:string|null}|null;},enabled:Boolean(user)});
  const mode=preferences.theme ?? (theme==='dark'?'dark':'light'),grades=profile.data?.grade_levels ?? [];
  function chooseTheme(next:TeacherThemeMode) {
    const persisted=update({theme:next});setTheme(next==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'default'):next==='dark'?'dark':'default');
    setNotice(persisted?'Na-save ang tema para sa account na ito sa browser na ito.':'Nagamit ang tema para sa session na ito. Hindi available ang browser storage.');
  }
  function toggleNotice(category:TeacherNoticeCategory) {const persisted=update({notices:{[category]:preferences.notices?.[category]===false}});setNotice(persisted?'Na-save ang preference sa pag-display ng mga abiso.':'Nagamit ang preference para sa session na ito.');}
  const download=useMutation({ meta: { saveFeedback: 'Na-save ang mga pagbabago.' },mutationFn:async()=>{
    if(profile.error)throw new Error('Hindi makuha ang profile.');
    const results=await Promise.all([supabase.from('lessons').select('id, title, description').eq('teacher_id',user!.id),supabase.from('teacher_messages').select('id, parent_id, child_id, message, read, created_at').eq('teacher_id',user!.id)]);
    if(results.some(result=>result.error))throw new Error('Hindi makuha ang data.');
    const replies=await loadTeacherParentReplies(supabase,user!.id);
    const content=JSON.stringify({exported_at:new Date().toISOString(),account:{id:user!.id,name:identity?.displayName,email:user!.email,role:'teacher'},profile:profile.data??null,preferences,lessons:results[0].data,messages:results[1].data,replies},null,2);
    const url=URL.createObjectURL(new Blob([content],{type:'application/json'})),anchor=document.createElement('a');anchor.href=url;anchor.download='linawletra-teacher-account.json';document.body.append(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  },onSuccess:()=>setDownloadNotice('Na-download ang iyong account data.'),onError:()=>setDownloadNotice('Hindi ma-download ang data. Subukan muli.')});
  const logout=useMutation({ meta: { saveFeedback: 'Na-save ang mga pagbabago.' },mutationFn:()=>softSignOut({userId:user!.id,role:'teacher',displayName:identity?.displayName??'Guro',email:user?.email??''})});

  return <div className="teacher-settings-design">
    <header className="tsg-hero"><img className="tsg-background" src={classroom} alt="" aria-hidden/><div className="tsg-hero-copy"><p>MGA SETTING</p><h1>Mga Setting <GearIcon aria-hidden/></h1><p>Pamahalaan ang iyong account at mga kagustuhan<br className="tsg-wide-break"/> sa LinawLetra.</p></div><img className="tsg-teacher" src={teacher} alt="" aria-hidden/><blockquote>I-customize ang iyong<br/> karanasan para mas<br/> maging produktibo at<br/> komportable sa<br/> pagtuturo. <Heart aria-hidden/></blockquote></header>
    <QueryErrorNotice error={profile.error} onRetry={()=>void profile.refetch()} message="Hindi makuha ang profile summary. Subukan muli."/>
    <div className="tsg-top-grid">
      <section className="tsg-card tsg-profile"><header className="tsg-heading"><span className="tsg-icon purple"><UserRound aria-hidden/></span><div><h2>Profile Ko</h2><p>I-edit ang iyong personal na impormasyon.</p></div><Link className="tsg-edit" to="/teacher/profile"><Pencil aria-hidden/>I-edit ang Profile</Link></header><div className="tsg-profile-content"><div className="tsg-portrait"><span><img className={profile.data?.avatar_url?'':'is-default'} src={profile.data?.avatar_url||teacher} alt="Larawan ng guro"/></span><Link to="/teacher/profile#profile-photo" aria-label="Palitan ang profile photo"><Camera aria-hidden/></Link></div><div className="tsg-fields"><label>Pangalan<input readOnly aria-label="Pangalan" value={identity?.displayName??'Guro'}/></label><label>Email<input readOnly aria-label="Email" value={user?.email??''}/></label><div><label>Tungkulin<span><GraduationCap aria-hidden/><select aria-label="Tungkulin" disabled value="teacher"><option value="teacher">Guro</option></select></span></label><label>Baitang<span><BookOpen aria-hidden/><select aria-label="Baitang" disabled value="assigned"><option value="assigned">{profile.isLoading?'Kinukuha…':profile.error?'Hindi makuha':grades.length?grades.map(grade=>grade===0?'Kindergarten':`Grade ${grade}`).join(', '):'Walang assigned grade'}</option></select></span></label></div></div></div></section>
      <section className="tsg-card tsg-appearance"><header className="tsg-heading"><span className="tsg-icon gold"><Palette aria-hidden/></span><div><h2>Tema at Display</h2><p>Piliin ang theme na komportable para sa iyo.</p></div><button type="button" className="tsg-preview-button" onClick={()=>setPreview(mode)}><Monitor aria-hidden/>I-preview</button></header><div className="tsg-theme-options" aria-label="Tema at Display">{modes.map(({id,label,description,Icon})=><button type="button" key={id} className={mode===id?'selected':''} aria-pressed={mode===id} onClick={()=>chooseTheme(id)}><Icon className="tsg-mode-icon" aria-hidden/>{mode===id&&<span className="tsg-theme-check"><Check aria-hidden/></span>}<ThemeMiniature mode={id}/><b>{label}</b><small>{description}</small></button>)}</div></section>
    </div>
    {notice&&<p className="tsg-status" role="status">{notice}</p>}
    <div className="tsg-bottom-grid">
      <section className="tsg-card tsg-notifications"><header className="tsg-heading"><span className="tsg-icon gold"><Bell aria-hidden/></span><div><h2><Link to="/teacher/notifications" className="tsg-notice-title-link" aria-label="Tingnan ang Mga Abiso">Mga Abiso <ChevronRight aria-hidden/></Link></h2><p>Piliin ang mga abisong ipapakita sa browser na ito.</p></div></header><div className="tsg-notice-options">{notices.map(({id,label,description,tone,Icon})=><div className="tsg-notice-row" key={id}><span className={`tsg-icon ${tone}`}><Icon aria-hidden/></span><div><b>{label}</b><small>{description}</small></div><SwitchControl label={label} on={preferences.notices?.[id]!==false} onClick={()=>toggleNotice(id)}/></div>)}</div></section>
      <TeacherProfileSecurity title="Privacy at Seguridad" description="Pamahalaan ang seguridad ng iyong account." passwordAction={<Link to="/teacher/profile#change-password" className="tsg-security-password"><span className="tp-action-icon blue"><LockKeyhole aria-hidden/></span><span><b>Baguhin ang Password</b><small>Magtakda ng bagong password para sa mas ligtas na account.</small></span><ChevronRight aria-hidden/></Link>}/>
      <section className="tsg-card tsg-data"><header className="tsg-heading"><span className="tsg-icon blue"><Database aria-hidden/></span><div><h2>Pamamahala ng Data</h2><p>Kontrolin ang iyong impormasyon.</p></div></header><button type="button" className="tsg-action" disabled={download.isPending||profile.isLoading} onClick={()=>{setDownloadNotice('');download.mutate();}}><span className="tsg-icon blue"><Download aria-hidden/></span><span><b>{download.isPending?'Dina-download…':'I-download ang Aking Data'}</b><small>Kumuha ng kopya ng iyong account data.</small></span><ChevronRight aria-hidden/></button><button type="button" className="tsg-action danger" disabled={logout.isPending} onClick={()=>logout.mutate()}><span className="tsg-icon pink"><LogOut aria-hidden/></span><span><b>{logout.isPending?'Nagla-log out…':'Mag-log Out'}</b><small>Lumabas sa account sa browser na ito.</small></span><ChevronRight aria-hidden/></button>{downloadNotice&&<p className="tsg-inline-status" role="status">{downloadNotice}</p>}{logout.error&&<p className="tsg-inline-status" role="alert">Hindi makapag-log out. Subukan muli.</p>}</section>
    </div>
    {preview&&<ProfileDialog title="I-preview ang Tema" onClose={()=>setPreview(null)}><div className="tsg-preview-controls">{modes.map(({id,label})=><button type="button" key={id} aria-pressed={preview===id} onClick={()=>setPreview(id)}>{label}</button>)}</div><div className={`tsg-live-preview ${preview==='dark'||preview==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}`}><header><BookOpen aria-hidden/>LinawLetra · Tanggapan ng Guro</header><section><img src={profile.data?.avatar_url||teacher} alt=""/><div><b>{identity?.displayName??'Guro'}</b><p>{grades.map(value=>value===0?'Kindergarten':`Grade ${value}`).join(', ')||'Guro sa LinawLetra'}</p></div></section><p>Mas malinaw na aralin, mas magandang pagkatuto.</p><div className="tsg-preview-lines" aria-hidden><span/><span/><span/></div></div><button type="button" className="tp-primary tsg-use-theme" onClick={()=>{chooseTheme(preview);setPreview(null);}}>Gamitin ang Temang Ito</button></ProfileDialog>}
  </div>;
}
