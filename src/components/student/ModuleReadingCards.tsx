import { ArrowRight, Check, LockKeyhole, Mic, Volume2 } from 'lucide-react';
import { TTSButton } from '../a11y/TTSButton';
import { SlowTTSButton } from '../a11y/SlowTTSButton';
import { WordMeaning } from './WordMeaning';
import { ModuleLessonArtwork } from './ModuleLessonArtwork';
import { moduleItemLocked, type ModuleReadingItem } from '../../lib/modulePresentation';

export function ModuleReadingCards({ items, compact, busy, listeningFor, savingFor, onPractice }: {
  items: ModuleReadingItem[];
  compact: boolean;
  busy: boolean;
  listeningFor: string | null;
  savingFor: string | null;
  onPractice: (item:ModuleReadingItem)=>void;
}) {
  const current = items.findIndex((item,index)=>!item.completed&&!moduleItemLocked(items,index));
  return <section className={`module-reading-grid ${compact ? '' : 'module-reading-long'}`} aria-label="Mga babasahin sa modyul">
    {items.map((item,index)=>{
      const locked = moduleItemLocked(items,index);
      const active = index === current;
      return <article key={item.module_item_id} data-content-id={item.content_id} data-state={locked?'locked':item.completed?'completed':active?'current':'available'} className={`module-reading-card ${locked?'is-locked':item.completed?'is-completed':'is-available'} ${active?'is-current':''}`}>
        <div className="module-reading-card-head"><span className="module-item-number" aria-label={`Aralin ${index+1}`}>{item.completed&&!locked?<Check size={21} aria-hidden="true" />:index+1}</span><h2>{item.content_text}</h2>
          {!locked&&<div className="module-card-audio" title={`Pakinggan: ${item.content_text}`}><TTSButton text={item.content_text} rate={item.content_type==='phonetic'?1:undefined} className="module-card-listen" ariaLabel={`Pakinggan ang ${item.content_text}`} /></div>}
        </div>
        {compact ? <ModuleLessonArtwork text={item.content_text} type={item.content_type} /> : <div className="module-phrase-art" aria-hidden="true"><Volume2 size={42} /></div>}
        {locked ? <><span className="module-item-padlock" aria-hidden="true"><LockKeyhole size={24} /></span><p className="module-item-next"><LockKeyhole size={14} aria-hidden="true" />Susunod na {item.content_type==='phonetic'?'tunog':'salita'}</p><p className="sr-only">Tapusin muna ang nakaraang aralin.</p></> : <>
          <p className="module-card-instruction"><Volume2 size={15} aria-hidden="true" />Basahin nang malakas</p>
          <button type="button" className="module-practice-button" onClick={()=>onPractice(item)} disabled={busy} aria-label={`${item.completed?'Ulitin':'Bigkasin'}: ${item.content_text}`}><Mic size={19} aria-hidden="true" /><span>{listeningFor===item.content_id?'Nakikinig…':savingFor===item.content_id?'Sine-save…':item.completed?'Ulitin':'Bigkasin'}</span><ArrowRight size={19} aria-hidden="true" /></button>
          {item.completed&&<p className="module-item-completed"><Check size={14} aria-hidden="true" />Tapos na</p>}
          <details className="module-card-help"><summary>{item.content_type==='word'?'Kahulugan at tulong':'Tulong sa pagbigkas'}</summary><SlowTTSButton text={item.content_text} />{item.content_type==='word'?<WordMeaning word={item.content_text} compactControls />:<p>Pakinggan ang tunog, saka ulitin sa iyong sariling bilis.</p>}</details>
        </>}
      </article>;
    })}
  </section>;
}
