import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

function harness({ failRequest=false, failPlayback=false, holdRequest=false, holdPlayback=false, browserVoice=false }={}) {
  const calls=[], players=[], utterances=[];
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
    './filipinoVoice':{createFilipinoUtterance:(text,rate)=>browserVoice?{text,rate}:null},
  },{Audio,URL:{createObjectURL:()=> 'blob:synthetic-audio'},atob,Blob,window:{speechSynthesis:{speak:utterance=>{utterances.push(utterance);queueMicrotask(()=>utterance.onend());},cancel(){}}}});
  return {...player,calls,players,utterances,release:()=>release({audioContent:'YQ=='})};
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

test('A new feedback sequence settles and stops the previous playback',async()=>{
  const h=harness({holdPlayback:true});
  const first=h.playTtsSequence(['Una','Hindi na ito babasahin']);
  await new Promise(resolve=>setImmediate(resolve));
  const second=h.playTtsSequence(['Ikalawa']);
  await first;
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.players[0].paused,true);
  assert.deepEqual(h.calls.map(call=>call.body.text),['Una','Ikalawa']);
  h.players[1].onended();await second;
});

test('Unavailable cloud audio uses an installed Filipino voice for the whole encouragement sequence',async()=>{
  const h=harness({failRequest:true,browserVoice:true});
  await h.playTtsSequence(['Kaya mo iyan!','Ulitin natin.','bata'],'fil-PH',{reportErrors:true});
  assert.deepEqual(h.utterances.map(item=>item.text),['Kaya mo iyan!','Ulitin natin.','bata']);
});

test('Starting the microphone invalidates pending feedback before it can play',async()=>{
  const h=harness({holdRequest:true});
  const playing=h.playTtsSequence(['Ang galing mo!']);
  h.stopTtsPlayback();h.release();await playing;
  assert.equal(h.players.length,0);
});
