import {LoaderCircle,Square,Volume2} from 'lucide-react';
export function ReadingListenButton({status,onClick}:{status:'idle'|'loading'|'speaking';onClick:()=>void}){
 const label=status==='loading'?'Inihahanda ang audio':status==='speaking'?'Ihinto ang pagbasa':'Basahin nang Malakas';
 return <button type="button" className="practice-listen-play" aria-label={label} title={label} aria-busy={status==='loading'} disabled={status==='loading'} onClick={onClick}>
  {status==='loading'?<LoaderCircle className="animate-spin" aria-hidden="true"/>:status==='speaking'?<Square aria-hidden="true"/>:<Volume2 aria-hidden="true"/>}
 </button>;
}
