import { BookOpen } from 'lucide-react';
import { moduleItemArt, type ModulePicture } from '../../lib/modulePresentation';
import { SpriteArtwork } from '../illustrations/SpriteArtwork';
import primaryPictures from '../../assets/illustrations/owl-world/lesson-a.png';
import extraPictures from '../../assets/illustrations/owl-world/lesson-b.png';
import completedPictures from '../../assets/illustrations/owl-world/lesson-c.png';
import soundPictures from '../../assets/illustrations/owl-world/lesson-d.png';
import wordPictures from '../../assets/illustrations/owl-world/lesson-e.png';
import moreWordPictures from '../../assets/illustrations/owl-world/lesson-f.png';
import learnPictures from '../../assets/illustrations/owl-world/lesson-learn.png';

const PICTURE_SHEETS: Record<ModulePicture['sheet'], { source: string; columns: number; rows: number }> = {
 a: { source: primaryPictures, columns: 5, rows: 4 }, b: { source: extraPictures, columns: 5, rows: 4 },
 c: { source: completedPictures, columns: 4, rows: 4 }, d: { source: soundPictures, columns: 4, rows: 4 },
 e: { source: wordPictures, columns: 3, rows: 3 }, f: { source: moreWordPictures, columns: 3, rows: 3 },
 learn: { source: learnPictures, columns: 5, rows: 3 },
};
export function ModuleLessonArtwork({ text, type }: { text: string; type: string }) {
 const { picture, exampleWord, color, practiceSound } = moduleItemArt(text, type);
 const sheet = picture ? PICTURE_SHEETS[picture.sheet] : null;
 const match = exampleWord?.indexOf(text.trim().toLocaleLowerCase('fil-PH')) ?? -1;
 return <div className="module-item-picture" data-picture-mode={practiceSound ? 'sound' : exampleWord ? 'example' : 'word'}>
  <div className="module-item-picture-object" aria-hidden="true">
   {sheet && picture ? <SpriteArtwork {...sheet} index={picture.index} /> : color ? <span className="module-picture-color" style={{ background: color }} /> : <span className="module-picture-letters"><BookOpen size={48} /><b>{type === 'phonetic' ? text : 'Aa'}</b></span>}
  </div>
  {exampleWord && <span className="module-picture-caption">Halimbawa: <strong>{match >= 0 ? <>{exampleWord.slice(0,match)}<mark>{exampleWord.slice(match,match+text.trim().length)}</mark>{exampleWord.slice(match+text.trim().length)}</> : exampleWord}</strong></span>}
  {practiceSound && <span className="module-picture-caption">Pakinggan ang tunog: <strong>{practiceSound}</strong></span>}
 </div>;
}
