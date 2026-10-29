import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

function harness({ failRequest=false, failPlayback=false, holdRequest=false, holdPlayback=false }={}) {
  const calls=[], players=[];
  let release;
  const request=holdRequest?new Promise(resolve=>{release=resolve;}):Promise.resolve({audioContent:'YQ=='});
  class Audio {
    constructor(){players.push(this);this.paused=false;}
    play(){if(failPlayback)return Promise.reject(new Error('Playback blocked'));if(!holdPlayback)queueMicrotask(()=>this.onended?.());return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const player=loadTs('src/lib/ttsPlayer.ts',{
    './api':{api:async(path,options)=>{calls.push({path,body:options.body});if(failRequest)throw new Error('Unavailable');return request;}},
    './ttsSettings':{getTtsRate:()=>0.8,getTtsPlaybackRate:rate=>rate,isIsolatedFilipinoVowel:text=>/^[aeiou]$/i.test(text.trim())},
  },{Audio,URL:{createObjectURL:()=> 'blob:synthetic-audio'},atob,Blob});
  return {...player,calls,players,release:()=>release({audioContent:'YQ=='})};
}

test('Assessment audio speaks only the supplied Filipino target at the existing vowel rate',async()=>{
  const h=harness();await h.playTtsSequence([{text:'A',rate:0.5}],'fil-PH',{reportErrors:true});
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls)),[{path:'/tts',body:{text:'A',rate:1}}]);
});
test('Assessment audio surfaces unavailable TTS without changing existing optional callers',async()=>{
  const h=harness({failRequest:true});await assert.rejects(h.playTtsSequence(['bata'],'fil-PH',{reportErrors:true}),/Hindi ma-load/);
  await h.playTtsSequence(['bata']);
});
test('Assessment audio surfaces rejected browser playback',async()=>{
  const h=harness({failPlayback:true});await assert.rejects(h.playTtsSequence(['bata'],'fil-PH',{reportErrors:true}),/Hindi tumugtog/);
});
test('Leaving an assessment pauses active playback and settles its promise',async()=>{
  const h=harness({holdPlayback:true}),controller=new AbortController();
  const playing=h.playTtsSequence(['bata'],'fil-PH',{signal:controller.signal,reportErrors:true});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(h.players.length,1);
  controller.abort();await playing;assert.equal(h.players[0].paused,true);
});
test('An old TTS response cannot start playing after assessment navigation',async()=>{
  const h=harness({holdRequest:true}),controller=new AbortController();
  const playing=h.playTtsSequence(['bata'],'fil-PH',{signal:controller.signal,reportErrors:true});
  controller.abort();h.release();await playing;assert.equal(h.players.length,0);
});
