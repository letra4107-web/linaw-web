const nodemailer = require('nodemailer');
const brevoKey = String(process.env.BREVO_API_KEY || '').trim();
const smtpConfigured = Boolean(brevoKey || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));
const transporter = !brevoKey && smtpConfigured ? nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT || 587),secure:process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000}) : null;
async function sendMail({to,subject,html,text}) {
 if (!smtpConfigured) throw Object.assign(new Error('Hindi pa handa ang serbisyo ng email. Makipag-ugnayan sa administrator.'),{code:'MAIL_UNAVAILABLE'});
 const from=process.env.EMAIL_FROM || process.env.SMTP_FROM || 'LinawLetra <no-reply@linawletra.app>';
 try {
  if (brevoKey) {
   const match=from.match(/^(.*?)<([^>]+)>$/);
   const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':brevoKey,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({sender:match?{name:match[1].trim(),email:match[2].trim()}:{name:'LinawLetra',email:from},to:(Array.isArray(to)?to:[to]).map(email=>({email})),subject,...(html?{htmlContent:html}:{}),...(text?{textContent:text}:{})}),signal:AbortSignal.timeout(12000)});
   if(!response.ok){await response.text();throw new Error('Mail provider rejected delivery');}
   await response.text();
  } else await transporter.sendMail({from,to,subject,html,text});
 }catch{throw Object.assign(new Error('Hindi maipadala ang email ngayon. Subukan muli mamaya.'),{code:'MAIL_UNAVAILABLE'});}
 return {queued:true,devFallback:false};
}
module.exports={sendMail,smtpConfigured};
