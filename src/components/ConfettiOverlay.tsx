import {useEffect} from 'react';
import confetti from 'canvas-confetti';

const DEFAULT_PALETTE=['#8B5CF6','#FFD166','#34D3B0','#FB79AA','#6FCBFF','#F9A64C'];
interface ConfettiOverlayProps {trigger:string|number|null|undefined;palette?:string[];}

/** Layered celebration on its own canvas; controls remain available throughout. */
export function ConfettiOverlay({trigger,palette=DEFAULT_PALETTE}:ConfettiOverlayProps){
 useEffect(()=>{
  const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if(trigger==null||motion?.matches)return;
  const canvas=document.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');canvas.setAttribute('data-reading-confetti','true');
  Object.assign(canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'1000'});
  document.body.appendChild(canvas);
  // The site's CSP excludes blob workers. Keep the short, bounded effect local.
  const fire=confetti.create(canvas,{resize:true,useWorker:false,disableForReducedMotion:true});
  const scale=window.innerWidth<640 ? .65 : 1,timers:Array<ReturnType<typeof setTimeout>>=[];
  let stopped=false;
  const shot=(options:confetti.Options)=>{if(!stopped)void fire({ticks:150,gravity:.9,decay:.93,scalar:.9,colors:palette,disableForReducedMotion:true,...options,particleCount:Math.ceil((options.particleCount??30)*scale)});};
  const cannons=(count:number,velocity:number)=>{
   shot({particleCount:count,angle:62,spread:52,startVelocity:velocity,origin:{x:0,y:.72},shapes:['square','circle'],drift:.35});
   shot({particleCount:count,angle:118,spread:52,startVelocity:velocity,origin:{x:1,y:.72},shapes:['square','circle'],drift:-.35});
  };
  const stop=()=>{if(stopped)return;stopped=true;timers.forEach(clearTimeout);fire.reset();canvas.remove();};
  cannons(35,48);
  timers.push(setTimeout(()=>shot({particleCount:20,spread:360,startVelocity:21,gravity:.42,ticks:100,scalar:1.15,origin:{x:.5,y:.35},colors:['#FFD166','#FFF0B5','#BBA0FF'],shapes:['star']}),120));
  timers.push(setTimeout(()=>cannons(20,38),300));
  timers.push(setTimeout(()=>{for(const x of[.25,.75])shot({particleCount:14,spread:310,startVelocity:18,gravity:.45,ticks:105,origin:{x,y:.26},shapes:['star','circle'],colors:['#FFD166','#34D3B0','#C3ADFF']});},600));
  timers.push(setTimeout(()=>{for(const x of[.15,.85])shot({particleCount:25,angle:270,spread:85,startVelocity:7,gravity:.65,ticks:145,scalar:.8,origin:{x,y:-.05},shapes:['square'],drift:x<.5 ? .35 : -.35});},950));
  timers.push(setTimeout(stop,3600));
  const reduce=(event:MediaQueryListEvent)=>{if(event.matches)stop();};
  const hidden=()=>{if(document.hidden)stop();};
  motion?.addEventListener?.('change',reduce);document.addEventListener?.('visibilitychange',hidden);
  return()=>{stop();motion?.removeEventListener?.('change',reduce);document.removeEventListener?.('visibilitychange',hidden);};
 },[trigger,palette]);
 return null;
}
