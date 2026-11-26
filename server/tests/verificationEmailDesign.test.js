const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),express=require('express');
let sent;
const userId='72000000-0000-4000-8000-000000000001';
const client={from(){const q={select:()=>q,eq:()=>q,limit:async()=>({data:[{id:userId}]})};return q;},auth:{admin:{generateLink:async()=>({data:{user:{id:userId},properties:{email_otp:'00123456'}}})}}};
function stub(name,exports){const file=require.resolve(name);require.cache[file]={id:file,filename:file,loaded:true,exports};}
stub('../config/supabase',{supabaseAdmin:client});stub('../config/mailer',{sendMail:async mail=>{sent=mail;}});
const router=require('../routes/emailVerification');
test('the real verification request delivers branded HTML and fallback text without exposing the code in its response',async()=>{
 const app=express();app.use(express.json());app.use(router);const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 try{
  const result=await new Promise((resolve,reject)=>{const data=JSON.stringify({email:'qa@example.invalid'}),req=http.request({hostname:'127.0.0.1',port:server.address().port,path:'/request',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:text}));});req.on('error',reject);req.end(data);});
  assert.equal(result.status,200);assert.equal(sent.to,'qa@example.invalid');assert.match(sent.html,/class="email-code"/);assert.match(sent.text,/00123456/);assert.doesNotMatch(result.body,/00123456/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
