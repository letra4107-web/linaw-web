import {useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {supabase,verifyAccountPassword} from '../lib/supabaseClient';
import {useAuth} from '../lib/auth/AuthContext';
import {tagalogError} from '../lib/validationMessages';
export function EmailChangeForm(){
 const {user}=useAuth(); const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[open,setOpen]=useState(false);
 const change=useMutation({meta:{saveFeedback:'Kumpirmahin ang pagbabago gamit ang mensahe sa iyong email. Hindi pa nababago ang email hangga’t hindi nakukumpirma.'},mutationFn:async()=>{
   if(!user?.email || !email.trim() || email.trim().toLowerCase()===user.email.toLowerCase())throw Error('Maglagay ng bagong email.');
   await verifyAccountPassword(user.email,password,user.id);
   const {error}=await supabase.auth.updateUser({email:email.trim().toLowerCase()});if(error)throw error;
 },onSuccess:()=>{setPassword('');setOpen(false);}});
 return <div><button type="button" onClick={()=>setOpen(!open)}>Baguhin ang Email</button>{open&&<form onSubmit={event=>{event.preventDefault();if(!change.isPending)change.mutate();}}><label>Bagong Email<input aria-label="Bagong Email" type="email" required value={email} disabled={change.isPending} onChange={event=>{setEmail(event.target.value);change.reset();}}/></label><label>Kasalukuyang Password<input aria-label="Password para baguhin ang email" type="password" required autoComplete="current-password" value={password} disabled={change.isPending} onChange={event=>setPassword(event.target.value)}/></label><button type="submit" disabled={change.isPending || !email || !password}>Ipadala ang Kumpirmasyon</button>{change.error&&<p role="alert">{tagalogError(change.error)}</p>}</form>}</div>;
}
