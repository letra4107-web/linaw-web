import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api} from '../../lib/api';
import {PracticeAttemptHistory} from '../../components/PracticeAttemptHistory';
import {EmptyState,Pagination} from './AdminPrimitives';
import './monitoring-learning.css';

type Module={title:string;module_number:number;level:string};
type Row={id:string;student_id:string;studentName:string;status?:string;score?:number|null;passed?:boolean|null;pass_percentage_snapshot?:number;started_at?:string;submitted_at?:string|null;assessment?:{title:string;module:Module|null}|null;word?:string;accuracy_percentage?:number|null;is_correct?:boolean;created_at?:string};
type Response={rows:Row[];total:number;page:number;pageSize:number};
const score=(value:number|null|undefined)=>value==null?'—':`${Number(value)}%`;
const date=(value:string|null|undefined)=>value?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'}).format(new Date(value)):'—';
export default function MonitoringLearningTable({userId,kind,childId,showStudent=false}:{userId:string;kind:'assessments'|'activities';childId?:string;showStudent?:boolean}){
 const [page,setPage]=useState(1),[selected,setSelected]=useState<Row|null>(null);
 const query=useQuery({queryKey:['admin-monitoring-learning',userId,kind,childId,page],queryFn:()=>api<Response>(`/admin/monitoring/users/${userId}/learning?${new URLSearchParams({kind,page:String(page),...(childId?{childId}:{})})}`,{auth:true}),refetchInterval:30000});
 const rows=query.data?.rows||[],total=query.data?.total||0,pages=Math.max(1,Math.ceil(total/10));
 return <div className="admin-learning-records">
  <p className="admin-learning-explanation">{kind==='assessments'?'Module assessments check learning at the end of a module. Each row is one assessment attempt.':'Each row is a saved reading attempt, including retries. Select a score to view its transcription and earlier attempts.'}</p>
  {query.isLoading?<p role="status">Loading {kind}…</p>:query.isError?<div role="alert"><p>Hindi makuha ang {kind}. Subukan muli.</p><button type="button" className="admin-learning-detail" onClick={()=>void query.refetch()}>Subukan muli</button></div>:<>
   <div className="admin-table-scroll"><table className="admin-reference-table admin-learning-table" aria-label={kind==='assessments'?'Assessment results':'Learning activities'}>
    <thead><tr><th scope="col">#</th>{showStudent&&<th scope="col">Student</th>}{kind==='assessments'?<><th scope="col">Assessment / Module</th><th scope="col">Score</th><th scope="col">Passing Score</th><th scope="col">Result</th><th scope="col">Started</th><th scope="col">Submitted</th></>:<><th scope="col">Reading Text</th><th scope="col">Score / Details</th><th scope="col">Date and Time</th></>}</tr></thead>
    <tbody>{rows.map((row,index)=><tr key={row.id}><td>{(page-1)*10+index+1}</td>{showStudent&&<td>{row.studentName}</td>}{kind==='assessments'?<><td><b>{row.assessment?.title||'Module assessment'}</b><small className="admin-learning-subtitle">{row.assessment?.module?.title||'Module'}{row.assessment?.module?.level?` · ${row.assessment.module.level}`:''}</small></td><td>{score(row.score)}</td><td>{score(row.pass_percentage_snapshot)}</td><td><span className={`admin-assessment-result ${row.status==='in_progress'?'pending':row.passed?'passed':'retry'}`}>{row.status==='in_progress'?'In Progress':row.passed?'Passed':'Needs Retry'}</span></td><td><time dateTime={row.started_at}>{date(row.started_at)}</time></td><td><time dateTime={row.submitted_at||undefined}>{date(row.submitted_at)}</time></td></>:<><td className="admin-learning-text">{row.word||'Reading activity'}</td><td><button className="admin-learning-detail" type="button" aria-label={`View attempt: ${row.word||'Reading activity'}, ${score(row.accuracy_percentage)}`} onClick={()=>setSelected(row)}>{score(row.accuracy_percentage)} <span>View attempt</span></button></td><td><time dateTime={row.created_at}>{date(row.created_at)}</time></td></>}</tr>)}</tbody>
   </table></div>
   {!rows.length&&<EmptyState>{kind==='assessments'?'No module assessment attempts recorded yet. Reading practice scores are available in Activities.':'No reading attempts recorded yet.'}</EmptyState>}
   <Pagination page={page} pages={Math.max(pages,page)} onChange={setPage} label={`${total} ${kind==='assessments'?'assessment attempts':'reading attempts'}`} />
  </>}
  {selected&&<PracticeAttemptHistory key={selected.id} studentId={selected.student_id} sessionId={selected.id} onClose={()=>setSelected(null)}/>}
 </div>;
}
