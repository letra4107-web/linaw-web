import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTs} from './helpers/load-ts.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
  const hooks=[],pendingEffects=[],calls=[];let cursor=0,props,tree;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const react={
    useState(initial){const i=cursor++;if(!hooks[i])hooks[i]={value:initial};return [hooks[i].value,value=>{hooks[i].value=typeof value==='function'?value(hooks[i].value):value;}];},
    useRef(initial){const i=cursor++;return (hooks[i]??={current:initial});},
    useCallback(callback,deps){const i=cursor++;if(!same(hooks[i]?.deps,deps))hooks[i]={value:callback,deps};return hooks[i].value;},
    useEffect(run,deps){const i=cursor++;if(!same(hooks[i]?.deps,deps)){const old=hooks[i];hooks[i]={deps};pendingEffects.push(()=>{old?.cleanup?.();hooks[i].cleanup=run();});}},
  };
  const {PronunciationFeedback}=loadTs('src/components/PronunciationFeedback.tsx',{
    react,'react-dom':{createPortal:children=>children},
    '../lib/ttsPlayer':{playTtsSequence:(items,lang,options)=>new Promise((resolve,reject)=>calls.push({items,lang,...options,resolve,reject}))},
    './a11y/TTSButton':{TTSButton:()=>null},'./a11y/SlowTTSButton':{SlowTTSButton:()=>null},'./ConfettiOverlay':{ConfettiOverlay:()=>null},
  },{AbortController,document:{body:{}}});
  function find(node,label){if(!node||typeof node!=='object')return null;if(node.type==='button'&&node.props['aria-label']===label)return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,label);if(found)return found;}return null;}
  return {
    calls,render(next){if(next)props=next;cursor=0;tree=PronunciationFeedback(props);return renderToStaticMarkup(tree);},
    flush(){pendingEffects.splice(0).forEach(run=>run());},button:label=>find(tree,label),cleanup(){hooks.forEach(slot=>slot?.cleanup?.());},
  };
}
const props=()=>({attemptId:'attempt-a',correct:false,message:'Magaling ang iyong pagsubok! Magsanay pa tayo.',accuracy:47,word:'Buko ang nasa ibabaw ng mesa.',transcript:'ube ang nasa mesa',hint:'Pakinggan at ulitin ang buong pangungusap.',rewardMessage:'Na-save ang pagsubok.'});

test('reading results show the actual total percentage, full target, transcript and guidance',()=>{
  const h=harness(),html=h.render(props());assert.match(html,/Kabuuang kawastuhan: 47%/);assert.match(html,/Buko ang nasa ibabaw ng mesa\./);assert.match(html,/ube ang nasa mesa/);assert.match(html,/Pakinggan at ulitin ang buong pangungusap/);assert.match(html,/Na-save ang pagsubok/);
  assert.match(h.render({...props(),accuracy:0}),/Kabuuang kawastuhan: 0%/);
  assert.doesNotMatch(h.render({...props(),accuracy:undefined}),/Kabuuang kawastuhan:/);
});
test('feedback stays visible during speech and closes after the entire model sequence completes',async()=>{
  const h=harness();h.render(props());h.flush();assert.equal(h.calls.length,1);assert.equal(h.calls[0].items.length,3);assert.match(h.calls[0].items[0].text,/47 porsiyento/);assert.match(h.render(),/reading-feedback-toast/);
  h.calls[0].resolve(true);await tick();assert.equal(h.render(),'');h.flush();
});
test('audio failure preserves the full result and replay can finish and close it',async()=>{
  const h=harness();h.render(props());h.flush();h.calls[0].reject(Error('offline'));await tick();assert.match(h.render(),/Hindi natapos ang audio/);
  h.button('Pakinggan ang positibong mensahe').props.onClick();assert.equal(h.calls.length,2);assert.equal(h.calls[0].signal.aborted,true);h.calls[1].resolve(true);await tick();assert.equal(h.render(),'');
});
test('a replay or a newer attempt cannot be closed by an older playback callback',async()=>{
  const h=harness();h.render(props());h.flush();h.button('Pakinggan ang positibong mensahe').props.onClick();h.calls[0].resolve(true);await tick();assert.match(h.render(),/reading-feedback-toast/);
  h.render({...props(),attemptId:'attempt-b',accuracy:88});h.flush();assert.equal(h.calls.length,3);assert.equal(h.calls[1].signal.aborted,true);h.calls[1].resolve(true);await tick();assert.match(h.render(),/Kabuuang kawastuhan: 88%/);
  h.calls[2].resolve(true);await tick();assert.equal(h.render(),'');
});
test('manual dismissal aborts speech and an interrupted sequence does not auto-dismiss',async()=>{
  const h=harness();h.render(props());h.flush();h.calls[0].resolve(false);await tick();assert.match(h.render(),/reading-feedback-toast/);
  h.button('Pakinggan ang positibong mensahe').props.onClick();h.button('Isara ang mensahe').props.onClick();assert.equal(h.calls[1].signal.aborted,true);assert.equal(h.render(),'');h.cleanup();
});
