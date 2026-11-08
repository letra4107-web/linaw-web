import { tagalogError } from '../../lib/validationMessages';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { IconLabel } from '../a11y/IconLabel';
import { QueryErrorNotice } from '../QueryErrorNotice';
import { prepareDrillItems } from '../../lib/teacher/pdfTools';
import type { EditableDrillItem } from '../../lib/teacher/pdfTools';

interface DrillItemsResponse { material:{id:string;title:string;drill_status:string|null};items:EditableDrillItem[]; }
export function PdfDrillReview({materialId,onPublished}:{materialId:string;onPublished:()=>void}) {
  const queryClient=useQueryClient(),guard=useRef(false);
  const [draft,setDraft]=useState<EditableDrillItem[]|null>(null),[error,setError]=useState<string|null>(null),[success,setSuccess]=useState('');
  const query=useQuery({queryKey:['pdf-drill-items',materialId],queryFn:()=>api<DrillItemsResponse>(`/teacher/pdf-drill/${materialId}/items`,{auth:true}),refetchOnWindowFocus:false});
  const items=draft??query.data?.items,readOnly=query.data?.material.drill_status==='published';
  const action=useMutation({mutationFn:async({publish,rows}:{publish:boolean;rows:EditableDrillItem[]})=>{
    if(readOnly)throw new Error('Nai-publish na ang drill. Gumawa ng bagong draft para sa mga pagbabago.');
    const values=prepareDrillItems(rows);
    if(publish&&!values.length)throw new Error('Magdagdag muna ng isang salita bago i-publish.');
    const saved=await api<{items:EditableDrillItem[]}>(`/teacher/pdf-drill/${materialId}/items`,{method:'PATCH',auth:true,body:{items:values}});
    if(publish)await api(`/teacher/pdf-drill/${materialId}/publish`,{method:'POST',auth:true});
    return saved.items;
  },onSuccess:(rows,submission)=>{
    setDraft(rows);setError(null);setSuccess(submission.publish?'Nai-publish ang drill.':'Na-save ang mga pagbabago.');
    queryClient.setQueryData<DrillItemsResponse>(['pdf-drill-items',materialId],previous=>previous?{...previous,items:rows,material:{...previous.material,drill_status:submission.publish?'published':previous.material.drill_status}}:previous);
    void queryClient.invalidateQueries({queryKey:['pdf-materials']});if(submission.publish)onPublished();
  },onError:(error:Error)=>setError(tagalogError(error)),onSettled:()=>{guard.current=false;}});
  function run(publish:boolean){if(guard.current||!items||readOnly)return;guard.current=true;setError(null);setSuccess('');action.mutate({publish,rows:items});}
  function change(index:number,patch:Partial<EditableDrillItem>){setDraft((items??[]).map((item,i)=>i===index?{...item,...patch}:item));setSuccess('');}
  return <section className="flex min-w-0 flex-col gap-3" aria-label="Suriin ang PDF drill">
    <p className="text-sm text-[var(--color-text-muted)]">Suriin at itama ang bawat salita bago i-publish.</p>
    <QueryErrorNotice error={query.error} onRetry={()=>void query.refetch()} message="Hindi ma-load ang drill. Nananatili ang iyong mga pagbabago rito."/>
    {query.isLoading&&<p role="status">Kinukuha ang drill…</p>}
    {readOnly&&<p role="status" className="rounded-xl border p-3">Nai-publish na ang drill na ito. Mag-upload ng bagong draft upang magbago ng mga salita.</p>}
    {items&&<>
      {items.length===0&&<p>Walang na-detect na salita. Magdagdag ng row sa ibaba.</p>}
      <div className="flex min-w-0 flex-col gap-2">{items.map((item,index)=><div key={item.id??index} className="grid min-w-0 grid-cols-1 items-center gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1fr_5rem_auto]">
        <input aria-label={`Pantig sa row ${index+1}`} disabled={readOnly||action.isPending} value={item.syllable_pattern} maxLength={80} onChange={event=>change(index,{syllable_pattern:event.target.value})} placeholder="Pantig (hal. ba-ta)" className="min-w-0 rounded-lg border px-3 py-2 text-sm"/>
        <input aria-label={`Salita sa row ${index+1}`} disabled={readOnly||action.isPending} value={item.word} maxLength={120} onChange={event=>change(index,{word:event.target.value})} placeholder="Salita (hal. bata)" className="min-w-0 rounded-lg border px-3 py-2 text-sm"/>
        <input aria-label={`XP sa row ${index+1}`} disabled={readOnly||action.isPending} type="number" min={1} max={100} step={1} value={item.xp_value} onChange={event=>change(index,{xp_value:Number(event.target.value)})} className="min-w-0 rounded-lg border px-2 py-2 text-sm"/>
        {!readOnly&&<button type="button" disabled={action.isPending} aria-label={`Alisin ang row ${index+1}`} onClick={()=>{setDraft(items.filter((_,i)=>i!==index));setSuccess('');}} className="min-h-10 rounded-lg border px-3 text-[var(--color-danger)]">Alisin</button>}
      </div>)}</div>
      {!readOnly&&<><button type="button" disabled={action.isPending||items.length>=250} onClick={()=>{setDraft([...items,{band_index:items.length,item_order:items.length,syllable_pattern:'',word:'',image_url:null,xp_value:25}]);setSuccess('');}} className="min-h-10 self-start rounded-full border px-3 py-2 text-sm"><IconLabel icon="➕" label="Magdagdag ng row"/></button><div className="flex flex-wrap gap-2"><button type="button" disabled={action.isPending} onClick={()=>run(false)} className="min-h-11 rounded-xl border px-4 py-2 text-sm">{action.isPending?'Pinoproseso…':'I-save ang mga pagbabago'}</button><button type="button" disabled={action.isPending||!items.length} onClick={()=>run(true)} className="min-h-11 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm text-white">{action.isPending?'Pinoproseso…':'I-publish'}</button></div></>}
    </>}
    {error&&<p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}{success&&<p role="status" className="text-sm text-[var(--color-success)]">{success}</p>}
  </section>;
}
