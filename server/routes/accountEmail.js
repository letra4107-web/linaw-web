const express=require('express');
const rateLimit=require('express-rate-limit');
const {supabaseAdmin}=require('../config/supabase');
const {accountEmailInUse}=require('../services/accountEmail');
const router=express.Router();
router.post('/email-availability',rateLimit({windowMs:60000,limit:8,standardHeaders:'draft-7',legacyHeaders:false}),async(req,res)=>{
 const email=String(req.body?.email||'').trim().toLowerCase();
 res.set('Cache-Control','no-store');
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Ilagay ang wastong email address.'});
 try{return res.json({available:!await accountEmailInUse(supabaseAdmin,email)});}
 catch{return res.status(503).json({error:'Hindi masuri ang email ngayon. Subukan muli mamaya.'});}
});
module.exports=router;
