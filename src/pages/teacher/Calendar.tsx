import {useRef,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {CalendarDays,ChevronLeft,ChevronRight,Plus,X} from 'lucide-react';
import {supabase} from '../../lib/supabaseClient';
import {useAuth} from '../../lib/auth/AuthContext';
import {tagalogError} from '../../lib/validationMessages';
import './calendar.css';
type Student={id:string;name:string;grade_level:number};
type Activity={id:string;child_id:string;title:string;scheduled_date:string;start_time:string|null;end_time:string|null;description:string|null;activity_type:string;status:string;created_by:string;created_by_auth_uid:string|null;revision:number};
type CalendarData={students:Student[];activities:Activity[]};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const empty=()=>({id:String(crypto.randomUUID()),child_id:'',title:'',scheduled_date:today(),start_time:'',end_time:'',description:'',activity_type:'reading_lesson'});
const types=[['reading_lesson','Aralin'],['practice','Pagsasanay'],['reminder','Paalala / Takdang-aralin'],['appointment','Pagpupulong']];
export default function TeacherCalendar(){
 const {user}=useAuth(),client=useQueryClient(),busy=useRef(false);
 const [month,setMonth]=useState(today().slice(0,7)),[studentId,setStudentId]=useState(''),[form,setForm]=useState(empty),[editing,setEditing]=useState<Activity|null>(null),[open,setOpen]=useState(false);
 const query=useQuery({queryKey:['teacher-calendar',user?.id],enabled:Boolean(user),refetchInterval:15000,queryFn:async()=>{const {data,error}=await supabase.rpc('get_teacher_calendar');if(error)throw error;return data as CalendarData;}});
 const change=useMutation({meta:{saveFeedback:'Na-save ang iskedyul. May abiso na ang magulang na tingnan ang Kalendaryo.'},mutationFn:async()=>{
  const {data,error}=await supabase.rpc('save_teacher_calendar',{p_id:form.id,p_child:form.child_id,p_title:form.title.trim(),p_date:form.scheduled_date,p_start:form.start_time||null,p_end:form.end_time||null,p_type:form.activity_type,p_description:form.description.trim()||null,p_revision:editing?.revision??null});if(error)throw error;return data;
 },onSuccess:async()=>{setOpen(false);setEditing(null);await client.invalidateQueries({queryKey:['teacher-calendar']});},onSettled:()=>{busy.current=false;}});
 const remove=useMutation({meta:{saveFeedback:'Kinansela ang iskedyul. Naabisuhan ang magulang.'},mutationFn:async(item:Activity)=>{const {error}=await supabase.rpc('delete_teacher_calendar',{p_id:item.id,p_revision:item.revision});if(error)throw error;},onSuccess:()=>client.invalidateQueries({queryKey:['teacher-calendar']}),onSettled:()=>{busy.current=false;}});
 const pending=change.isPending||remove.isPending;
 const dirty=!editing||form.title.trim()!==editing.title||form.scheduled_date!==editing.scheduled_date||form.start_time!==(editing.start_time??'').slice(0,5)||form.end_time!==(editing.end_time??'').slice(0,5)||form.description.trim()!==(editing.description??'')||form.activity_type!==editing.activity_type;
 const start=()=>{change.reset();setEditing(null);setForm({...empty(),child_id:studentId||query.data?.students[0]?.id||''});setOpen(true);};
 const edit=(item:Activity)=>{change.reset();setEditing(item);setForm({id:item.id,child_id:item.child_id,title:item.title,scheduled_date:item.scheduled_date,start_time:(item.start_time??'').slice(0,5),end_time:(item.end_time??'').slice(0,5),description:item.description??'',activity_type:item.activity_type});setOpen(true);};
 const visible=(query.data?.activities??[]).filter(item=>item.scheduled_date.startsWith(month)&&(!studentId||studentId===item.child_id));
 const shift=(amount:number)=>{const [year,m]=month.split('-').map(Number),date=new Date(Date.UTC(year,m-1+amount,1));setMonth(date.toISOString().slice(0,7));};
 return <div className="teacher-calendar"><header><div><h1><CalendarDays/>Kalendaryo</h1><p>Magtakda ng aralin, pagsasanay, at pagpupulong. Makikita ito ng magulang sa Kalendaryo at may abiso sa Mga Abiso.</p></div><button type="button" onClick={start} disabled={!query.data?.students.length||pending}><Plus/>Magdagdag ng Iskedyul</button></header>
  {query.isLoading&&<p role="status">Kinukuha ang iskedyul...</p>}{query.error&&<div role="alert">Hindi makuha ang iskedyul. <button onClick={()=>void query.refetch()}>Subukan muli</button></div>}
  {!query.isLoading&&!query.error&&!query.data?.students.length&&<p>Mag-link muna ng mag-aaral sa Mga Mag-aaral upang makapagtakda ng iskedyul.</p>}
  <div className="teacher-calendar-filters"><label>Mag-aaral<select value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Lahat ng mag-aaral</option>{query.data?.students.map(s=><option value={s.id} key={s.id}>{s.name} · Grade {s.grade_level}</option>)}</select></label><div><button type="button" aria-label="Naunang buwan" onClick={()=>shift(-1)}><ChevronLeft/></button><label>Buwan<input aria-label="Buwan ng iskedyul" type="month" required value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value);}}/></label><button type="button" aria-label="Susunod na buwan" onClick={()=>shift(1)}><ChevronRight/></button></div></div>
  {open&&<form className="teacher-calendar-form" onSubmit={e=>{e.preventDefault();if(busy.current||!dirty)return;busy.current=true;change.mutate();}}><header><h2>{editing?'I-edit ang Iskedyul':'Bagong Iskedyul'}</h2><button type="button" disabled={pending} aria-label="Isara ang form" onClick={()=>setOpen(false)}><X/></button></header>
   <label>Mag-aaral<select required value={form.child_id} disabled={pending||Boolean(editing)} onChange={e=>setForm({...form,child_id:e.target.value})}><option value="">Pumili ng mag-aaral</option>{query.data?.students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label>Pamagat<input autoFocus required maxLength={150} value={form.title} disabled={pending} onChange={e=>setForm({...form,title:e.target.value})}/></label>
   <label>Uri<select value={form.activity_type} disabled={pending} onChange={e=>setForm({...form,activity_type:e.target.value})}>{types.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label>Petsa<input type="date" required min="1900-01-01" max="2200-12-31" value={form.scheduled_date} disabled={pending} onChange={e=>setForm({...form,scheduled_date:e.target.value})}/></label>
   <label>Oras ng Simula (opsyonal)<input type="time" value={form.start_time} disabled={pending} onChange={e=>setForm({...form,start_time:e.target.value})}/></label>
   <label>Oras ng Pagtatapos (opsyonal)<input type="time" value={form.end_time} disabled={pending} onChange={e=>setForm({...form,end_time:e.target.value})}/></label>
   <label className="full">Mga Detalye (opsyonal)<textarea maxLength={1000} rows={3} value={form.description} disabled={pending} onChange={e=>setForm({...form,description:e.target.value})}/></label>
   <p className="full">Lahat ng oras ay oras sa Pilipinas. Ang iskedyul na ito ay makikita ng magulang; guro lamang ang makakapag-edit nito.</p>
   {change.error&&<p className="full" role="alert">{tagalogError(change.error)}</p>}<button disabled={pending||!dirty||!form.title.trim()||!form.child_id||!form.scheduled_date} type="submit">{change.isPending?'Sine-save...':'I-save at Abisuhan ang Magulang'}</button>
  </form>}
  {remove.error&&<p role="alert">{tagalogError(remove.error)}</p>}
  <section aria-label="Mga iskedyul" className="teacher-calendar-list">{visible.map(item=><article key={item.id}><time dateTime={item.scheduled_date}>{new Date(item.scheduled_date+'T00:00:00+08:00').toLocaleDateString('fil-PH',{timeZone:'Asia/Manila',month:'long',day:'numeric',year:'numeric'})} {item.start_time?.slice(0,5)}{item.end_time&&' – '+item.end_time.slice(0,5)}</time><h2>{item.title}</h2><p>{query.data?.students.find(s=>s.id===item.child_id)?.name} · {item.created_by==='parent'?'Personal na paalala ng magulang':item.created_by==='teacher'?'Mula sa guro':'Paalala ng system'}</p>{item.description&&<p>{item.description}</p>}{item.created_by==='teacher'&&item.created_by_auth_uid===user?.id&&<footer><button type="button" disabled={pending} onClick={()=>edit(item)}>I-edit</button><button type="button" disabled={pending} onClick={()=>{if(!busy.current&&window.confirm('Kanselahin ang iskedyul na ito? Aabisuhan ang magulang.')){busy.current=true;remove.mutate(item);}}}>Kanselahin ang Iskedyul</button></footer>}</article>)}{query.data&&!visible.length&&<p>Walang iskedyul sa napiling buwan at mag-aaral.</p>}</section>
 </div>;
}
