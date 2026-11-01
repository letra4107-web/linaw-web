import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarDays, Check, CheckCircle2, CheckCheck, ChevronDown, Clock3, FileText, Heart, Mail, MessageCircle, MoreHorizontal, Search, ShieldCheck, Tag, TrendingUp, X } from 'lucide-react';
import { useNotifications } from '../../lib/useNotifications';
import type { NotificationRow } from '../../lib/useNotifications';
import { teacherNoticeDateMatches, teacherNoticePresentation, teacherNoticeText } from '../../lib/teacher/notificationPresentation';
import type { TeacherNoticeGroup } from '../../lib/teacher/notificationPresentation';
import { QueryErrorNotice } from '../../components/QueryErrorNotice';
import { ProfileDialog } from './TeacherProfileSecurity';
import teacherHeroBackground from '../../assets/teacher/Teacher Home Hero Banner Background.png';
import teacherIllustration from '../../assets/teacher/Teacher Illustration.png';
import './profile-reference.css';
import './notifications-reference.css';

const GROUPS:{id:TeacherNoticeGroup;label:string}[]=[{id:'messages',label:'Mensahe'},{id:'schedule',label:'Iskedyul'},{id:'progress',label:'Progreso'},{id:'system',label:'System'}];
const dateLabel=(value:string)=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('fil-PH',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'}).format(new Date(value)):'Hindi available ang petsa';
function GroupIcon({group}:{group:TeacherNoticeGroup}){return group==='messages'?<MessageCircle aria-hidden/>:group==='schedule'?<CalendarDays aria-hidden/>:group==='progress'?<TrendingUp aria-hidden/>:<ShieldCheck aria-hidden/>;}
function NoticeMenu({row,busy,onRead,onView}:{row:NotificationRow;busy:boolean;onRead:()=>void;onView:()=>void}){
  const ref=useRef<HTMLDetailsElement>(null);
  function close(action:()=>void){if(ref.current)ref.current.open=false;action();}
  return <details ref={ref} className="tn-menu"><summary aria-label={`Mga aksyon: ${row.title}`}><MoreHorizontal aria-hidden/>{!row.is_read&&<i aria-hidden/>}</summary><div><button type="button" onClick={()=>close(onView)}>Basahin ang buong abiso</button><button type="button" disabled={row.is_read||busy} onClick={()=>close(onRead)}>{row.is_read?'Nabasa na':'Markahang nabasa'}</button><Link to="/teacher/settings">Mga setting ng abiso</Link></div></details>;
}
export default function TeacherNotifications(){
  const {notifications,unreadCount,isLoading,error,refetch,markAsRead,markAllAsRead}=useNotifications();
  const [filter,setFilter]=useState<'all'|'unread'|'read'>('all'),[search,setSearch]=useState(''),[period,setPeriod]=useState('all'),[type,setType]=useState('all');
  const [expanded,setExpanded]=useState<string|null>(null),[detailId,setDetailId]=useState<string|null>(null);
  const [lastReadId,setLastReadId]=useState<string|null>(null),[lastAction,setLastAction]=useState<'one'|'all'>('one');
  const busy=markAsRead.isPending||markAllAsRead.isPending,needle=search.trim().toLowerCase(),now=Date.now();
  const shown=notifications.filter(row=>(filter==='all'||(filter==='unread'?!row.is_read:row.is_read))&&(type==='all'||teacherNoticePresentation(row.type).group===type)&&teacherNoticeDateMatches(row.created_at,period,now)&&`${row.title} ${row.body??''} ${row.message??''} ${teacherNoticePresentation(row.type).label}`.toLowerCase().includes(needle)).sort((a,b)=>(Date.parse(b.created_at)||0)-(Date.parse(a.created_at)||0)||a.id.localeCompare(b.id));
  const detail=notifications.find(row=>row.id===detailId),presentation=detail?teacherNoticePresentation(detail.type):null,detailText=detail?teacherNoticeText(detail):null;
  const count=(value:number)=>isLoading?'…':error?'—':value;
  function read(row:NotificationRow){if(row.is_read||busy)return;markAllAsRead.reset();setLastAction('one');setLastReadId(row.id);markAsRead.mutate(row.id);}
  function view(row:NotificationRow){setDetailId(row.id);read(row);}
  function readAll(){if(busy)return;markAsRead.reset();setLastAction('all');markAllAsRead.mutate();}
  function reset(){setFilter('all');setSearch('');setPeriod('all');setType('all');}
  return <div className="teacher-notifications-design">
    <header className="tn-hero"><img className="tn-background" src={teacherHeroBackground} alt="" aria-hidden/><div className="tn-hero-copy"><p>ACCOUNT NG GURO</p><h1>Mga Abiso <span className="tn-hero-bell"><Bell aria-hidden/><i/><i/><i/></span></h1><p>Mahahalagang update sa iyong pagtuturo at account,<br className="tn-wide-break"/> sa isang lugar.</p></div><img className="tn-teacher" src={teacherIllustration} alt="" aria-hidden/><blockquote>Patuloy na<br/> magbigay ng mas<br/> maliwanag na<br/> kinabukasan para<br/> sa bawat bata. <Heart aria-hidden/><Bell aria-hidden/></blockquote></header>
    <section className="tn-inbox" aria-label="Mga abiso ng guro">
      <div className="tn-toolbar"><nav aria-label="Salain ang mga abiso">{([{id:'all',label:'Lahat',number:notifications.length,Icon:Bell},{id:'unread',label:'Hindi pa nababasa',number:unreadCount,Icon:Mail},{id:'read',label:'Nabasa',number:notifications.length-unreadCount,Icon:CheckCircle2}] as const).map(({id,label,number,Icon})=><button type="button" key={id} disabled={isLoading||Boolean(error)} aria-pressed={filter===id} onClick={()=>setFilter(id)}><Icon aria-hidden/>{label} ({count(number)})</button>)}</nav><button type="button" className="tn-read-all" disabled={isLoading||Boolean(error)||!unreadCount||busy} onClick={readAll} title="Markahan ang lahat ng abiso sa account bilang nabasa"><CheckCheck aria-hidden/>{markAllAsRead.isPending?'Ina-update…':'Markahan lahat bilang nabasa'}</button></div>
      <div className="tn-filters"><label className="tn-search"><Search aria-hidden/><input aria-label="Maghanap ng abiso" placeholder="Maghanap ng abiso…" value={search} onChange={event=>setSearch(event.target.value)}/>{search&&<button type="button" aria-label="Alisin ang paghahanap" onClick={()=>setSearch('')}><X aria-hidden/></button>}</label><label className="tn-select"><CalendarDays aria-hidden/><span className="sr-only">Petsa ng abiso</span><select aria-label="Petsa ng abiso" value={period} onChange={event=>setPeriod(event.target.value)}><option value="all">Lahat ng Petsa</option><option value="today">Ngayon</option><option value="7">Huling 7 araw</option><option value="30">Huling 30 araw</option></select></label><label className="tn-select"><Tag aria-hidden/><span className="sr-only">Uri ng abiso</span><select aria-label="Uri ng abiso" value={type} onChange={event=>setType(event.target.value)}><option value="all">Lahat ng Uri</option>{GROUPS.map(group=><option key={group.id} value={group.id}>{group.label}</option>)}</select></label></div>
      <QueryErrorNotice error={error} onRetry={()=>void refetch()} message="Hindi ma-load ang mga abiso. Subukan muli."/>
      {(markAsRead.error||markAllAsRead.error)&&<div className="tn-alert" role="alert"><p>Hindi na-update ang read status. Subukan muli.</p><button type="button" disabled={busy} onClick={()=>{if(lastAction==='all')readAll();else if(lastReadId){const row=notifications.find(row=>row.id===lastReadId);if(row)read(row);}}}>Subukan muli ang pagmarka</button></div>}
      {isLoading&&<div className="tn-state" role="status"><Bell aria-hidden/><p>Kinukuha ang mga abiso…</p></div>}
      {!isLoading&&<div className="tn-list">{shown.map((row,index)=>{
        const info=teacherNoticePresentation(row.type),text=teacherNoticeText(row),open=expanded===row.id,tone=index%2===0?'pink':'blue';
        return <article className={`tn-card ${tone}${row.is_read?'':' unread'}${open?' expanded':''}`} key={row.id} aria-labelledby={`tn-title-${row.id}`}>
          <div className="tn-disc" aria-hidden><span>{info.group==='messages'?<FileText/>:<GroupIcon group={info.group}/>}</span>{!row.is_read&&<i/>}</div>
          <div className="tn-copy"><header><h2 id={`tn-title-${row.id}`}>{row.title}</h2><span className="sr-only">{row.is_read?'Nabasa na':'Hindi pa nababasa'}</span>{text.subject&&<p className="tn-subject">{text.subject}</p>}</header><div className="tn-excerpt" id={`tn-content-${row.id}`}>{text.detail?<p>{text.detail}</p>:<p>Walang karagdagang detalye.</p>}{open&&text.extra&&<p className="tn-extra">{text.extra}</p>}</div></div>
          <div className="tn-meta"><time dateTime={Number.isFinite(Date.parse(row.created_at))?row.created_at:undefined}><Clock3 aria-hidden/>{dateLabel(row.created_at)}</time><span className={`tn-category ${info.group}`}><GroupIcon group={info.group}/>{info.label}</span></div>
          <div className="tn-actions"><button type="button" className="tn-view" onClick={()=>view(row)} aria-label={`Tingnan ang abiso: ${row.title}`}>Tingnan</button><NoticeMenu row={row} busy={busy} onRead={()=>read(row)} onView={()=>view(row)}/><button type="button" className="tn-expand" aria-label={`${open?'Paikliin':'Palawakin'} ang abiso: ${row.title}`} aria-expanded={open} aria-controls={`tn-content-${row.id}`} onClick={()=>{setExpanded(open?null:row.id);if(!open)read(row);}}><ChevronDown aria-hidden/></button></div>
        </article>;
      })}</div>}
      {!isLoading&&!error&&!shown.length&&<div className="tn-state"><Bell aria-hidden/><h2>{notifications.length?'Walang tugmang abiso':'Wala pang abiso'}</h2><p>{notifications.length?'Subukan ang ibang salita, petsa, o uri.':'Lalabas dito ang mga update para sa iyong account.'}</p>{notifications.length>0&&<button type="button" onClick={reset}>I-reset ang mga filter</button>}<Link to="/teacher/settings">Pamahalaan ang notification preferences</Link></div>}
      {!isLoading&&!error&&shown.length>0&&<p className="tn-result-count" role="status">{shown.length} sa {notifications.length} abiso</p>}
    </section>
    {detail&&detailText&&presentation&&<ProfileDialog title={detail.title} onClose={()=>setDetailId(null)}><div className="tn-detail"><p className="tn-detail-meta"><Clock3 aria-hidden/>{dateLabel(detail.created_at)}</p><span className={`tn-category ${presentation.group}`}><GroupIcon group={presentation.group}/>{presentation.label}</span>{detailText.subject&&<h3>{detailText.subject}</h3>}<div className="tn-detail-body"><p>{detailText.detail||'Walang karagdagang detalye.'}</p>{detailText.extra&&<p>{detailText.extra}</p>}</div><p className="tn-detail-status">{markAsRead.isPending?'Minamarkahang nabasa…':detail.is_read?<><Check aria-hidden/>Nabasa na</>:markAsRead.error?'Hindi ma-update ang read status.':'Hindi pa nababasa'}</p>{presentation.destination&&<Link className="tn-destination" to={presentation.destination}>Buksan ang {presentation.group==='messages'?'Mga Mensahe':presentation.group==='progress'?'Progress Reports':presentation.destination==='/teacher/profile'?'Profile':'Mga Aralin'} <ChevronDown aria-hidden/></Link>}</div></ProfileDialog>}
  </div>;
}
