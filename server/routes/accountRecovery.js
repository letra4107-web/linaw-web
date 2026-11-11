const express=require('express');
const rateLimit=require('express-rate-limit');
const {createClient}=require('@supabase/supabase-js');
const {supabaseAdmin}=require('../config/supabase');
const {sendMail,smtpConfigured}=require('../config/mailer');
const {requireAuth,requireRole}=require('../middleware/auth');
const {syncConfirmedStudentEmail}=require('../services/confirmedEmailAlias');
const {otpEmailTemplate}=require('../services/otpEmailTemplate');
const validEmail=value=>typeof value==='string'&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const freshClient=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
function createAccountRecoveryRouter({client=supabaseAdmin,mail=sendMail,verifier=freshClient,configured=()=>smtpConfigured}={}){
 const router=express.Router();
 router.use(rateLimit({windowMs:60000,limit:8,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Maghintay ng isang minuto bago subukan muli.'}}));
 const generic='Kung may account na nakarehistro, naipadala ang reset code. Para sa student username, tingnan ang email ng naka-link na magulang.';
 const failure=(res,error)=>{console.error('[account email]',{code:error?.code||error?.name});return res.status(503).json({error:'Hindi maipadala ang verification email ngayon. Subukan muli mamaya.'});};
 async function destination(email){
  const profile=await client.from('users').select('id,role').eq('email',email).maybeSingle();if(profile.error)throw profile.error;
  if(!profile.data)return null;
  const auth=await client.auth.admin.getUserById(profile.data.id);if(auth.error)throw auth.error;
  if(auth.data?.user?.email?.toLowerCase()!==email)return null;
  if(profile.data.role!=='student')return {email,id:profile.data.id};
  const child=await client.from('children').select('parent_id').eq('auth_uid',profile.data.id).maybeSingle();if(child.error)throw child.error;
  if(!child.data?.parent_id)return null;
  const parent=await client.auth.admin.getUserById(child.data.parent_id);if(parent.error)throw parent.error;
  return validEmail(parent.data?.user?.email)?{email:parent.data.user.email,id:profile.data.id}:null;
 }
 router.post('/request-password-reset',async(req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase();if(!validEmail(email))return res.status(400).json({error:'Ilagay ang wastong email o buong student username.'});
  try{
   if(!configured())throw Object.assign(Error('Mail unavailable'),{code:'MAIL_UNAVAILABLE'});
   const target=await destination(email);
   if(target){
    const generated=await client.auth.admin.generateLink({type:'recovery',email});if(generated.error)throw generated.error;
    if(generated.data?.user?.id!==target.id||!/^(?:\d{6}|\d{8})$/.test(generated.data.properties?.email_otp||''))throw Error('Invalid recovery identity');
    const code=generated.data.properties.email_otp;
    await mail({to:target.email,...otpEmailTemplate({code,purpose:'password-reset'})});
   }
   return res.json({success:true,message:generic});
  }catch(error){return failure(res,error);}
 });
 router.post('/complete-password-reset',async(req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase(),code=String(req.body?.code||''),password=req.body?.password;
  if(!validEmail(email)||!/^(?:\d{6}|\d{8})$/.test(code)||typeof password!=='string'||password.length<8||password.length>128||!/[A-Z]/.test(password)||!/[0-9]/.test(password))return res.status(400).json({error:'Ilagay ang wastong email, code, at password na may 8 karakter, malaking titik, at numero.'});
  const auth=verifier();
  try{
   const checked=await auth.auth.verifyOtp({email,token:code,type:'recovery'});
   if(checked.error||!checked.data?.user?.id||checked.data.user.email?.toLowerCase()!==email||!checked.data.session)return res.status(400).json({error:'Mali o paso na ang reset code. Humiling ng panibago.'});
   const changed=await auth.auth.updateUser({password});if(changed.error)throw changed.error;
   return res.json({success:true});
  }catch(error){console.error('[password reset]',{code:error?.code||error?.name});return res.status(503).json({error:'Hindi na-reset ang password. Humiling ng bagong code at subukan muli.'});}
  finally{await auth.auth.signOut({scope:'global'}).catch(()=>{});}
 });
 router.post('/email-change',requireAuth,requireRole('parent','teacher','admin','student'),async(req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase(),password=req.body?.password,current=req.user.email?.toLowerCase();
  if(!validEmail(email)||!current||email===current||typeof password!=='string'||!password||password.length>128)return res.status(400).json({error:'Ilagay ang bagong email at kasalukuyang password.'});
  const auth=verifier();
  try{
   const checked=await auth.auth.signInWithPassword({email:current,password});
   if(checked.error||checked.data?.user?.id!==req.user.id)return res.status(400).json({error:'Hindi tama ang kasalukuyang password.'});
   // Reauthenticate the current account, then prove control of the new inbox.
   // Use the actual action-link token: Auth's hashed_token field can differ.
   const options={redirectTo:'https://linawletra.com/login'};
   const newLink=await client.auth.admin.generateLink({type:'email_change_new',email:current,newEmail:email,options});
   if(newLink.error)throw newLink.error;
   const action=new URL(newLink.data?.properties?.action_link||'');
   const hash=action.searchParams.get('token');
   if(newLink.data?.user?.id!==req.user.id||action.origin!==new URL(process.env.SUPABASE_URL).origin||action.pathname!=='/auth/v1/verify'||action.searchParams.get('type')!=='email_change'||!hash||!/^[a-f0-9]{40,128}$/i.test(hash))throw Error('Invalid email change identity');
   const link='https://linawletra.com/confirm-email-change#token_hash='+encodeURIComponent(hash);
   await mail({to:email,subject:'LinawLetra — Kumpirmahin ang bagong email',text:`Kumpirmahin ang bagong email: ${link}\nKung hindi mo ito hiniling, huwag buksan ang link.`,html:`<h2>Kumpirmahin ang bagong email</h2><p><a href="${escapeHtml(link)}">Kumpirmahin ang email</a></p><p>Kung hindi mo ito hiniling, huwag buksan ang link.</p>`});
   // A failed informational notice must not invalidate the delivered confirmation.
   await mail({to:current,subject:'LinawLetra — May kahilingang baguhin ang email',text:'May hiniling na pagbabago ng email sa iyong account matapos ang password verification. Kung hindi ikaw ito, palitan agad ang iyong password.'}).catch(()=>{});
   return res.json({success:true,message:'Naipadala ang confirmation link sa bagong email. Buksan ito upang kumpirmahin.'});
  }catch(error){return failure(res,error);}
  finally{await auth.auth.signOut({scope:'local'}).catch(()=>{});}
 });
 router.post('/confirm-email-change',async(req,res)=>{
  const hash=req.body?.tokenHash;
  if(typeof hash!=='string'||!/^[a-f0-9]{40,128}$/i.test(hash))return res.status(400).json({error:'Hindi wasto ang confirmation link. Humiling ng panibago sa Settings.'});
  const auth=verifier();
  try{
   const result=await auth.auth.verifyOtp({token_hash:hash,type:'email_change'});
   if(result.error)return res.status(400).json({error:'Nagamit na, mali, o paso na ang link. Tingnan ang isa pang confirmation email, o humiling ng panibago sa Settings.'});
   await syncConfirmedStudentEmail(client,result.data?.user);
   return res.json({success:true});
  }catch(error){console.error('[email confirmation]',{code:error?.code||error?.name});return res.status(503).json({error:'Hindi makumpirma ang email ngayon. Subukan muli.'});}
  finally{await auth.auth.signOut({scope:'local'}).catch(()=>{});}
 });
 return router;
}
module.exports=createAccountRecoveryRouter();module.exports.createAccountRecoveryRouter=createAccountRecoveryRouter;
