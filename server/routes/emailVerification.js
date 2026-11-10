const express=require('express');
const rateLimit=require('express-rate-limit');
const {createClient}=require('@supabase/supabase-js');
const {supabaseAdmin}=require('../config/supabase');
const {sendMail}=require('../config/mailer');
const router=express.Router();
const limiter=rateLimit({windowMs:60000,limit:5,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Maghintay ng isang minuto bago subukan muli.'}});
router.use(limiter);
const validEmail=value=>typeof value==='string' && value.length<=254 && /^\S+@\S+\.\S+$/.test(value);
router.post('/request',async(req,res)=>{
 const email=String(req.body?.email || '').trim().toLowerCase();if(!validEmail(email))return res.status(400).json({error:'Ilagay ang wastong email address.'});
 try {
  const {data:rows,error}=await supabaseAdmin.from('users').select('id').eq('email',email).limit(1);if(error)throw error;
  let id=rows?.[0]?.id;
  if(!id && /^[0-9a-f-]{36}$/i.test(String(req.body?.userId || ''))){const auth=await supabaseAdmin.auth.admin.getUserById(req.body.userId);if(!auth.error && auth.data?.user?.email?.toLowerCase()===email)id=auth.data.user.id;}
  if(id){
   const {data,error:linkError}=await supabaseAdmin.auth.admin.generateLink({type:'magiclink',email});if(linkError)throw linkError;
   if(data.user?.id!==id || !data.properties?.email_otp)throw Error('Invalid verification identity');
   await sendMail({to:email,subject:'LinawLetra — Kumpirmahin ang iyong email',text:'Ang iyong verification code ay '+data.properties.email_otp+'. Ilagay ito sa LinawLetra. Huwag ibahagi ang code.'});
  }
  return res.json({success:true,message:'Kung may account sa email na ito, naipadala na ang verification code.'});
 }catch{return res.status(503).json({error:'Hindi maipadala ang verification code ngayon. Subukan muli mamaya.'});}
});
router.post('/verify',async(req,res)=>{
 const email=String(req.body?.email || '').trim().toLowerCase(),code=String(req.body?.code || '');if(!validEmail(email)||!/^\d{6}$/.test(code))return res.status(400).json({error:'Ilagay ang wastong email at 6 na numerong code.'});
 try{
  const verifier=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await verifier.auth.verifyOtp({email,token:code,type:'email'});
  if(error || !data.user?.email_confirmed_at || data.user.email?.toLowerCase()!==email)return res.status(400).json({error:'Mali o paso na ang code. Humiling ng bagong code.'});
  const {data:profile,error:profileError}=await supabaseAdmin.from('users').select('id').eq('id',data.user.id).maybeSingle();if(profileError)throw profileError;
  const saved=profile?await supabaseAdmin.from('users').update({email_verified:true}).eq('id',profile.id):await supabaseAdmin.from('users').insert({id:data.user.id,email,name:data.user.user_metadata?.full_name || email,role:'parent',email_verified:true});
  if(saved.error)throw saved.error;
  await verifier.auth.signOut({scope:'local'});
  return res.json({success:true});
 }catch{return res.status(503).json({error:'Hindi makumpirma ang email ngayon. Subukan muli.'});}
});
module.exports=router;
