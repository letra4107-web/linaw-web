/** Acknowledged save feedback; rendered in the top layer, including over forms. */
export function showFormFeedback(message: string, success = true) {
 const dialog = document.createElement('dialog');
 dialog.setAttribute('role', 'alertdialog'); dialog.setAttribute('aria-label', success ? 'Na-save' : 'Hindi na-save');
 Object.assign(dialog.style, { maxWidth:'min(420px, calc(100vw - 32px))', width:'100%', padding:'24px', border:'1px solid #d4dce8', borderRadius:'20px', boxShadow:'0 20px 70px #152d4855', color:'#16334b', background:'#fff' });
 const title=document.createElement('h2'); title.textContent=success ? 'Na-save' : 'Hindi na-save';
 title.style.cssText='font-size:20px;font-weight:bold;margin-bottom:12px';
 const text=document.createElement('p');text.textContent=message;text.style.cssText='line-height:1.7;margin-bottom:20px;overflow-wrap:anywhere';
 const button=document.createElement('button');button.type='button';button.textContent='OK';button.style.cssText='padding:10px 24px;border-radius:10px;background:#08796f;color:white;font-weight:bold';
 button.onclick=()=>dialog.close();dialog.append(title,text,button);document.body.append(dialog);
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();button.focus();
}
