import {useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {api} from '../../lib/api';
import {AuthShell,primaryButtonClass} from '../../components/auth/AuthShell';
import {tagalogError} from '../../lib/validationMessages';
export default function ConfirmEmailChange(){
 const location=useLocation(),[token]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('token_hash')??'');
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(''),locked=useRef(false);
 useEffect(()=>{window.history.replaceState(window.history.state,'',window.location.pathname);},[]);
 const submit=async()=>{if(locked.current||done)return;locked.current=true;setBusy(true);setError('');try{await api('/auth/confirm-email-change',{method:'POST',body:{tokenHash:token}});setDone(true);}catch(error){setError(tagalogError(error));}finally{locked.current=false;setBusy(false);}};
 return <AuthShell title="Kumpirmahin ang Email" subtitle="Para lamang ito sa pagbabagong hiniling mo sa Settings.">
  {done?<div role="status"><p>Nakumpirma ang bagong email. Mag-login muli gamit ito. Kung hihingi ng app verification code, ilagay ang code na ipapadala sa bagong email.</p><Link to="/login">Bumalik sa Login</Link></div>:<><p>Kumpirmahin na hawak mo ang bagong email. Hindi mababago ang email hangga't hindi nakukumpirma ang link na ito.</p><button className={primaryButtonClass} disabled={busy||!/^[a-f0-9]{40,128}$/i.test(token)} onClick={()=>void submit()}>{busy?'Kinukumpirma...':'Kumpirmahin ang Email'}</button>{!token&&<p role="alert">Buksan ang link mula sa iyong email upang magpatuloy.</p>}{error&&<p role="alert">{error}</p>}</>}
 </AuthShell>;
}
