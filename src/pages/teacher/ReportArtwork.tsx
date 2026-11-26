import reportArt from '../../assets/illustrations/role-themes/progress-icons.png';
import portraits from '../../assets/illustrations/role-themes/family-icons.png';
import { SpriteArtwork } from '../../components/illustrations/SpriteArtwork';
export function ReportArtwork({ item, className = '' }: { item: number; className?: string }) {
 return <span className={'tr-art ' + className} aria-hidden="true"><SpriteArtwork source={reportArt} columns={3} rows={1} index={item} style={{display:'block',width:'100%',height:'100%'}} /></span>;
}
export function ReportPortrait({ index }: { index: number }) {
 return <span className={'tr-avatar tr-avatar-' + index % 3} aria-hidden="true"><SpriteArtwork source={portraits} columns={2} rows={2} index={index % 2} /></span>;
}
