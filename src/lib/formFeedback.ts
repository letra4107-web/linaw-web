/** Acknowledged save feedback; rendered in the top layer, including over forms. */
export function showFormFeedback(message: string, success = true) {
 const dialog = document.createElement('dialog');
 dialog.setAttribute('role', 'alertdialog'); dialog.setAttribute('aria-label', success ? 'Matagumpay' : 'May problema');
 Object.assign(dialog.style, { maxWidth:'min(440px, calc(100vw - 32px))', width:'100%', padding:'0', border:'1px solid #dce7ee', borderRadius:'24px', boxShadow:'0 28px 90px #102b4655', color:'#16334b', background:'#fff', overflow:'hidden' });
 const card=document.createElement('div');card.style.cssText='padding:28px 30px 26px;text-align:center;background:radial-gradient(ellipse at 50% -35%, #d9f6ed 0, #fff 67%)';
 const badge=document.createElement('div');badge.setAttribute('aria-hidden','true');badge.textContent=success?'✓':'!';badge.style.cssText=`display:grid;place-items:center;width:56px;height:56px;margin:0 auto 15px;border-radius:18px;background:${success?'#d9f5e9':'#fff0e7'};color:${success?'#078067':'#b6532e'};font-size:30px;font-weight:800;box-shadow:0 5px 14px #16334b14`;
 const title=document.createElement('h2'); title.textContent=success ? 'Matagumpay!' : 'Hindi na-save';
 title.style.cssText='font-size:22px;line-height:1.25;font-weight:800;margin:0 0 10px;color:#173b55';
 const text=document.createElement('p');text.textContent=message;text.style.cssText='line-height:1.65;margin:0 auto 23px;color:#526b7d;max-width:340px;overflow-wrap:anywhere';
 const button=document.createElement('button');button.type='button';button.textContent='Sige';button.style.cssText='min-width:124px;padding:11px 25px;border:0;border-radius:12px;background:linear-gradient(135deg,#08796f,#079581);color:white;font-weight:700;font-size:15px;box-shadow:0 5px 12px #08796f30;cursor:pointer';
 card.append(badge,title,text,button);
 button.onclick=()=>dialog.close();dialog.append(card);document.body.append(dialog);
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();button.focus();
}
