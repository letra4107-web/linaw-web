import illustrations from '../../assets/illustrations/role-themes/educator-icons.png';
import { SpriteArtwork } from '../../components/illustrations/SpriteArtwork';
export function TeacherHomeArt({ item, className = '' }: { item: number; className?: string }) {
 return <span aria-hidden="true" className={'th-art th-art-' + item + ' ' + className}><SpriteArtwork source={illustrations} columns={4} rows={2} index={item} style={{display:'block',width:'100%',height:'100%'}} /></span>;
}
