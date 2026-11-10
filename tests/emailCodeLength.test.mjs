import test from 'node:test';import assert from 'node:assert/strict';import {loadTs} from './helpers/load-ts.mjs';
function harness(code=''){
 const slots=[],calls=[],refs=[];let cursor=0,refCursor=0,destination;
 const {default:Verify}=loadTs('src/pages/auth/VerifyEmail.tsx',{
 react:{useEffect(){},useState(initial){const i=cursor++;if(!(i in slots))slots[i]=i===1?[...code,...Array(8-code.length).fill('')]:initial;return[slots[i],value=>{slots[i]=value;}];},useRef(initial){const i=refCursor++;refs[i]??={current:initial};return refs[i];}},
 'react-router-dom':{Link:'a',useLocation:()=>({state:{email:'qa@example.test'}}),useNavigate:()=>path=>{destination=path;}},
 '../../lib/api':{api:async(path,options)=>{calls.push({path,...options});return{success:true};}},'../../lib/validationMessages':{tagalogError:e=>e.message},'../../components/auth/AuthShell':{isValidEmail:e=>e.includes('@')}
 });
 const find=(tree,predicate)=>!tree||typeof tree!=='object'?undefined:predicate(tree)?tree:[tree.props?.children].flat(Infinity).map(child=>find(child,predicate)).find(Boolean);
 const render=()=>{cursor=0;refCursor=0;return Verify();};
 return{calls,slots,render,find,submit:()=>find(render(),n=>n.type==='form').props.onSubmit({preventDefault(){}}),destination:()=>destination};
}
for(const code of ['123456','12345678'])test('verification submits a complete '+code.length+'-digit code',async()=>{const h=harness(code);await h.submit();assert.equal(h.calls[0].body.code,code);assert.equal(h.destination(),'/login');});
test('verification rejects an incomplete 7-digit code before any request',async()=>{const h=harness('1234567');await h.submit();assert.equal(h.calls.length,0);assert.match(h.slots[2],/6 o 8/);});
test('pasting an 8-digit code distributes every digit and preserves the complete request',async()=>{const h=harness();const first=h.find(h.render(),n=>n.type==='input'&&n.props['aria-label']==='Digit 1 of 8');first.props.onChange({target:{value:'12345678'}});await h.submit();assert.equal(h.calls[0].body.code,'12345678');});

test('pasting a complete 6-digit code replaces an old 8-digit code from any box',async()=>{
 const h=harness('12345678');let prevented=false;
 const input=h.find(h.render(),n=>n.type==='input'&&n.props['aria-label']==='Digit 5 of 8');
 input.props.onPaste({preventDefault(){prevented=true;},clipboardData:{getData:()=> '654 321'}});
 assert.equal(prevented,true);await h.submit();assert.equal(h.calls[0].body.code,'654321');
});
test('backspace in an empty box clears the preceding digit',()=>{
 const h=harness('123456');const input=h.find(h.render(),n=>n.type==='input'&&n.props['aria-label']==='Digit 7 of 8');
 let prevented=false;input.props.onKeyDown({key:'Backspace',preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(h.slots[1].join(''),'12345');
});
test('focusing a filled digit selects it for replacement',()=>{
 const h=harness('12345678');const input=h.find(h.render(),n=>n.type==='input'&&n.props['aria-label']==='Digit 4 of 8');
 let selected=false;input.props.onFocus({currentTarget:{select(){selected=true;}}});assert.equal(selected,true);
});
