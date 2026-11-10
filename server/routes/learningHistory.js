const express=require('express');
const {supabaseAdmin}=require('../config/supabase');
const {requireAuth,requireRole}=require('../middleware/auth');
const {validateUuidParam}=require('../lib/validation');
const {createSupabaseAuthorizationService}=require('../services/authorization');
const {practiceHistory}=require('../services/practiceHistory');
const router=express.Router(),access=createSupabaseAuthorizationService(supabaseAdmin);
router.use(requireAuth,requireRole('student','parent','teacher','admin'));
router.get('/students/:studentId/practice/:sessionId',validateUuidParam('studentId'),validateUuidParam('sessionId'),async(req,res)=>{
 try{
  const {studentId,sessionId}=req.params;let allowed=req.userRole==='admin';
  if(req.userRole==='teacher')allowed=await access.teacherStudent(req.user.id,studentId);
  if(req.userRole==='parent')allowed=Boolean(await access.parentChild(req.user.id,studentId));
  if(req.userRole==='student'){
   const child=await supabaseAdmin.from('children').select('id').eq('id',studentId).eq('auth_uid',req.user.id).maybeSingle();
   if(child.error)throw child.error;allowed=Boolean(child.data);
  }
  if(!allowed)return res.status(404).json({error:'Hindi makita ang pagsubok sa account na ito.'});
  const offset=Number(req.query.offset||0);
  if(!Number.isSafeInteger(offset)||offset<0||offset>10000)return res.status(400).json({error:'Hindi wastong pahina ng mga pagsubok.'});
  const history=await practiceHistory(supabaseAdmin,studentId,sessionId,{offset});
  if(!history)return res.status(404).json({error:'Hindi makita ang pagsubok sa account na ito.'});
  res.setHeader('Cache-Control','private, no-store');return res.json(history);
 }catch(error){console.error('[learning practice history]',{code:error?.code});return res.status(503).json({error:'Hindi makuha ang mga pagsubok ngayon. Subukan muli.'});}
});
module.exports=router;
