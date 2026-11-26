import illustrations from '../../assets/illustrations/role-themes/family-icons.png';
import { SpriteArtwork } from '../../components/illustrations/SpriteArtwork';
const INDEX = { boy: 0, girl: 1, hourglass: 2, medal: 3 } as const;
export function ParentHomeArtwork({ kind }: { kind: keyof typeof INDEX }) {
 return <SpriteArtwork className="ref-home-art" source={illustrations} columns={2} rows={2} index={INDEX[kind]} />;
}
