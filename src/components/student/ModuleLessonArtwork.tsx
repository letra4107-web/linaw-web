import { useId } from 'react';
import { BookOpen } from 'lucide-react';
import { moduleItemArt, type ModulePicture } from '../../lib/modulePresentation';
import primaryPictures from '../../assets/students/module-reference/tagalog-pictures-a.png';
import extraPictures from '../../assets/students/module-reference/tagalog-pictures-b.png';
import completedPictures from '../../assets/students/module-reference/tagalog-pictures-c.png';
import soundPictures from '../../assets/students/module-reference/tagalog-pictures-d.png';
import wordPictures from '../../assets/students/module-reference/tagalog-word-pictures-a.png';
import moreWordPictures from '../../assets/students/module-reference/tagalog-word-pictures-b.png';
import learnPictures from '../../assets/students/learn-reference/tagalog-module-icons.png';

const LEARN_VIEWPORTS = [
  '41 56 334 266','421 61 205 276','723 59 203 264','988 40 285 298','1324 43 259 294',
  '51 374 253 246','372 367 270 248','677 334 297 298','1019 363 248 260','1312 355 290 269',
  '37 642 278 281','356 668 298 260','689 702 282 205','994 626 263 314','1315 646 281 284',
];

const PRIMARY_VIEWPORTS = [
  '50 10 195 305','300 15 250 300','610 10 200 310','845 45 270 265','1135 15 265 300',
  '5 325 270 250','310 320 245 245','553 350 322 210','880 313 245 265','1140 335 260 220',
  '44 575 215 250','325 563 220 280','573 601 266 212','846 581 282 243','1140 565 260 267',
  '12 855 266 255','305 869 280 222','620 829 180 293','835 883 286 215','1110 852 292 240',
];
const EXTRA_VIEWPORTS = [
  '15 0 265 292','310 55 275 227','594 35 245 249','838 68 280 208','1150 30 245 263',
  '60 291 206 294','302 287 276 293','600 299 205 273','862 303 238 282','1150 303 245 281',
  '7 592 288 222','296 595 296 213','594 591 260 222','843 585 272 257','1118 582 284 230',
  '0 817 301 283','296 811 322 289','632 838 190 245','850 840 267 256','1137 805 265 295',
];

const COMPLETED_VIEWPORTS = [
  '22 5 288 314','337 0 292 321','624 72 319 230','945 20 308 300',
  '10 332 302 285','318 330 308 286','632 315 299 309','943 316 311 312',
  '0 670 338 244','341 619 270 317','638 625 284 314','927 627 327 314',
  '0 931 311 323','315 930 321 324','639 943 298 300','944 930 310 324',
];
const SOUND_VIEWPORTS = [
  '36 42 247 271','322 42 300 271','638 64 294 250','935 38 319 280',
  '38 337 245 278','308 322 314 297','615 383 338 227','945 321 309 306',
  '8 640 305 283','326 640 306 287','654 625 282 305','963 634 291 296',
  '7 936 353 307','359 936 246 310','613 927 331 318','942 936 312 310',
];
const WORD_VIEWPORTS = [
  '25 16 390 383','464 14 368 385','851 27 390 385',
  '36 423 371 397','430 422 416 396','844 507 402 305',
  '3 815 432 424','437 814 443 405','878 821 367 423',
];
const MORE_WORD_VIEWPORTS = [
  '17 19 398 406','426 55 424 374','865 160 380 270',
  '0 457 480 358','480 426 344 390','858 457 396 348',
  '7 805 410 435','425 827 410 412','835 803 419 436',
];
const PICTURE_SHEETS: Record<ModulePicture['sheet'],{ source:string; width:number; height:number; viewports:string[] }> = {
  a:{source:primaryPictures,width:1402,height:1122,viewports:PRIMARY_VIEWPORTS},
  b:{source:extraPictures,width:1402,height:1122,viewports:EXTRA_VIEWPORTS},
  c:{source:completedPictures,width:1254,height:1254,viewports:COMPLETED_VIEWPORTS},
  d:{source:soundPictures,width:1254,height:1254,viewports:SOUND_VIEWPORTS},
  e:{source:wordPictures,width:1254,height:1254,viewports:WORD_VIEWPORTS},
  f:{source:moreWordPictures,width:1254,height:1254,viewports:MORE_WORD_VIEWPORTS},
  learn:{source:learnPictures,width:1619,height:972,viewports:LEARN_VIEWPORTS},
};

function SheetPicture({ source, viewport, width, height }: { source:string; viewport:string; width:number; height:number }) {
  const clipId = useId();
  const [x,y,w,h] = viewport.split(' ').map(Number);
  return <svg viewBox={viewport} focusable="false">
    <defs><clipPath id={clipId}><rect x={x} y={y} width={w} height={h} /></clipPath></defs>
    <image href={source} width={width} height={height} clipPath={`url(#${clipId})`} />
  </svg>;
}

export function ModuleLessonArtwork({ text, type }: { text: string; type: string }) {
  const { picture, exampleWord, color, practiceSound } = moduleItemArt(text,type);
  const sheet = picture ? PICTURE_SHEETS[picture.sheet] : null;
  const viewport = sheet && picture ? sheet.viewports[picture.index] : null;
  const match = exampleWord?.indexOf(text.trim().toLocaleLowerCase('fil-PH')) ?? -1;
  return <div className="module-item-picture" data-picture-mode={practiceSound?'sound':exampleWord?'example':'word'}>
    <div className="module-item-picture-object" aria-hidden="true">
      {sheet && viewport ? <SheetPicture source={sheet.source} viewport={viewport} width={sheet.width} height={sheet.height} />
        : color ? <span className="module-picture-color" style={{background:color}} />
        : <span className="module-picture-letters"><BookOpen size={48} /><b>{type === 'phonetic' ? text : 'Aa'}</b></span>}
    </div>
    {exampleWord && <span className="module-picture-caption">Halimbawa: <strong>{match >= 0 ? <>{exampleWord.slice(0,match)}<mark>{exampleWord.slice(match,match+text.trim().length)}</mark>{exampleWord.slice(match+text.trim().length)}</> : exampleWord}</strong></span>}
    {practiceSound && <span className="module-picture-caption">Pakinggan ang tunog: <strong>{practiceSound}</strong></span>}
  </div>;
}
