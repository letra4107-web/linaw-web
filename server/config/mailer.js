const nodemailer = require('nodemailer');
const brevoKey = String(process.env.BREVO_API_KEY || '').trim();
const gmailUser = String(process.env.GMAIL_USER || '').trim();
const gmailAppPassword = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
const gmailConfigured = Boolean(gmailUser && gmailAppPassword);
const smtpUser = gmailConfigured ? gmailUser : process.env.SMTP_USER;
const smtpPass = gmailConfigured ? gmailAppPassword : process.env.SMTP_PASS;
const smtpHost = gmailConfigured ? 'smtp.gmail.com' : process.env.SMTP_HOST;
const smtpPort = gmailConfigured ? 465 : Number(process.env.SMTP_PORT || 587);
const smtpConfigured = Boolean(brevoKey || (smtpHost && smtpUser && smtpPass));
const transporter = !brevoKey && smtpConfigured ? nodemailer.createTransport({host:smtpHost,port:smtpPort,secure:gmailConfigured || process.env.SMTP_SECURE === 'true' || (!process.env.SMTP_SECURE && smtpPort === 465),auth:{user:smtpUser,pass:smtpPass},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000}) : null;
async function sendMail({to,subject,html,text}) {
 if (!smtpConfigured) throw Object.assign(new Error('Hindi pa handa ang serbisyo ng email. Makipag-ugnayan sa administrator.'),{code:'MAIL_UNAVAILABLE'});
 const from=gmailConfigured ? (process.env.GMAIL_FROM || `LinawLetra <${gmailUser}>`) : (process.env.EMAIL_FROM || process.env.SMTP_FROM || 'LinawLetra <no-reply@linawletra.app>');
 try {
  if (brevoKey) {
   const match=from.match(/^(.*?)<([^>]+)>$/);
   const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':brevoKey,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({sender:match?{name:match[1].trim(),email:match[2].trim()}:{name:'LinawLetra',email:from},to:(Array.isArray(to)?to:[to]).map(email=>({email})),subject,...(html?{htmlContent:html}:{}),...(text?{textContent:text}:{})}),signal:AbortSignal.timeout(12000)});
   if(!response.ok){const failure=await response.json().catch(()=>({}));console.error('[mailer] provider rejected',{status:response.status,code:failure.code,message:failure.message});throw new Error('Mail provider rejected delivery');}
   await response.text();
  } else await transporter.sendMail({from,to,subject,html,text});
 }catch{throw Object.assign(new Error('Hindi maipadala ang email ngayon. Subukan muli mamaya.'),{code:'MAIL_UNAVAILABLE'});}
 return {queued:true,devFallback:false};
}
async function checkMailProvider(){
 if(!brevoKey)return;
 try{const response=await fetch('https://api.brevo.com/v3/account',{headers:{'api-key':brevoKey},signal:AbortSignal.timeout(12000)});
 if(response.ok)console.log('[mailer readiness]',{status:response.status,result:'connected'});
 else{const failure=await response.json().catch(()=>({}));console.error('[mailer readiness]',{status:response.status,code:failure.code,message:failure.message});}
 }catch(error){console.error('[mailer readiness]',{code:error.code||error.name});}
}
module.exports={sendMail,smtpConfigured,checkMailProvider};
