import { moduleBoardLabel, type ModuleReadingItem } from '../../lib/modulePresentation';
import lessonGarden from '../../assets/illustrations/owl-world/student-banner.png';
import gardenFallback from '../../assets/illustrations/owl-world/school-banner.png';

export function ModuleLessonHeader({ title, description, type, items }: { title:string; description:string|null; type:string; items:ModuleReadingItem[] }) {
  const completed = items.filter(item=>item.completed).length;
  const percentage = items.length ? Math.round(completed / items.length * 100) : 0;
  const label = moduleBoardLabel(title,type,items);
  return <header className="module-lesson-hero">
    <img className="module-lesson-hero-art" src={lessonGarden} alt="" aria-hidden="true" loading="eager" fetchPriority="high" onError={event=>{if(event.currentTarget.getAttribute('src')!==gardenFallback)event.currentTarget.src=gardenFallback;}} />
    <div className="module-lesson-hero-copy"><p>Modyul sa pagbasa</p><div><h1>{title}</h1><p>{description || 'Basahin, pakinggan, at bigkasin ang bawat gawain sa iyong sariling bilis.'}</p></div></div>
    <div className={`module-lesson-board ${label.length > 5 ? 'is-long' : ''}`} aria-hidden="true"><span>{label}</span></div>
    <div className="module-lesson-progress" role="progressbar" aria-label="Progreso sa modyul" aria-valuemin={0} aria-valuemax={items.length || 1} aria-valuenow={completed} aria-valuetext={`${completed} sa ${items.length} aralin ang natapos`}><span><i style={{width:`${percentage}%`}} /></span><strong>{completed}/{items.length}</strong></div>
  </header>;
}
