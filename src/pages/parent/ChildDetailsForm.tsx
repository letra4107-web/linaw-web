import {useRef,useState} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {api} from '../../lib/api';
import {tagalogError} from '../../lib/validationMessages';
import {latestChildBirthDate,validOptionalChildBirthDate} from '../../lib/childBirthDate';
import './child-details-form.css';
type Child={id:string;name:string;grade_level:number;date_of_birth?:string|null;profile_revision?:number};
export function ChildDetailsForm({child}:{child:Child}){
 const [name,setName]=useState(child.name),[grade,setGrade]=useState(child.grade_level),[birth,setBirth]=useState(child.date_of_birth??'');
 const [saved,setSaved]=useState(child),locked=useRef(false);const client=useQueryClient();
 const dirty=name.trim()!==saved.name.trim()||grade!==saved.grade_level||birth!==(saved.date_of_birth??'');
 const validBirth=validOptionalChildBirthDate(birth),complete=name.trim().length>=2&&validBirth;
 const save=useMutation({meta:{saveFeedback:'Na-update ang detalye ng anak.'},mutationFn:()=>api<{child:Child}>('/parent/children/'+child.id,{method:'PATCH',auth:true,body:{name:name.trim(),gradeLevel:grade,dateOfBirth:birth||null,revision:saved.profile_revision??0}}),onSuccess:async result=>{setSaved(result.child);await Promise.all(['parent-children','parent-profile-children','parent-overview-children'].map(key=>client.invalidateQueries({queryKey:[key]})));},onSettled:()=>{locked.current=false;}});
 return <form className="child-details-form" onSubmit={event=>{event.preventDefault();if(!locked.current&&!save.isPending&&dirty&&complete){locked.current=true;save.mutate();}}}>
  <h3>I-edit ang Detalye ng Anak</h3>
  <label>Pangalan<input aria-label="Pangalan ng anak" required minLength={2} maxLength={100} value={name} disabled={save.isPending} onChange={event=>{setName(event.target.value);save.reset();}}/></label>
  <label>Baitang<select aria-label="Baitang ng anak" value={grade} disabled={save.isPending} onChange={event=>{setGrade(Number(event.target.value));save.reset();}}>{[1,2,3,4,5,6].map(value=><option key={value} value={value}>Grade {value}</option>)}</select></label>
  <label>Petsa ng Kapanganakan (opsyonal)<input aria-label="Petsa ng kapanganakan ng anak" aria-describedby="child-age-hint" type="date" min="1900-01-01" max={latestChildBirthDate()} value={birth} disabled={save.isPending} onChange={event=>{setBirth(event.target.value);save.reset();}}/></label>
  <p id="child-age-hint">Maaaring iwanang blangko. Kung ilalagay, dapat 7 taong gulang pataas ang bata.</p>
  {!validBirth&&<p role="alert">Maglagay ng wastong petsa para sa batang 7 taong gulang pataas, o iwanang blangko.</p>}
  <button disabled={save.isPending||!dirty||!complete} type="submit">{save.isPending?'Sine-save...':'I-save ang Detalye'}</button>
  {!dirty&&<small>Wala pang pagbabago.</small>}{save.error&&<p role="alert">{tagalogError(save.error)}</p>}
 </form>;
}
