import '../illustrations/owl-world.css';
import type { BadgeDef } from '../../lib/badges';
import { SpriteArtwork } from '../illustrations/SpriteArtwork';
import badgeIllustrations from '../../assets/illustrations/owl-world/badges.png';

const ILLUSTRATED_BADGES = [
  'unang_hakbang', 'batang_mambabasa', 'masigasig_na_mambabasa', 'kampeon_sa_pagbasa',
  'dalubhasa_sa_pagbasa', 'unang_bigkas', 'malinaw_magsalita', 'tamang_bigkas',
  'boses_ng_tagumpay', 'bigkas_champion', 'unang_araw', 'tuloy_tuloy',
  'lingguhang_bayani', 'buwan_ng_pagsisikap', 'hindi_ako_susuko', 'lakas_ng_loob',
  'matalinong_mag_aaral', 'patuloy_na_umuunlad', 'aking_unang_tagumpay', 'alamat_ng_pagbasa',
];

export function AchievementArtwork({ badge, className = '' }: { badge: BadgeDef; className?: string }) {
 const index = ILLUSTRATED_BADGES.indexOf(badge.id);
 return <SpriteArtwork className={'achievement-art ' + className} source={badgeIllustrations} columns={4} rows={5} index={Math.max(0,index)} />;
}
