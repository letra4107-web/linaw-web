import type { BadgeDef } from '../../lib/badges';
import badgeIllustrations from '../../assets/students/achievements/badge-illustrations.png';

const ILLUSTRATED_BADGES = [
  'unang_hakbang', 'batang_mambabasa', 'masigasig_na_mambabasa', 'kampeon_sa_pagbasa',
  'dalubhasa_sa_pagbasa', 'unang_bigkas', 'malinaw_magsalita', 'tamang_bigkas',
  'boses_ng_tagumpay', 'bigkas_champion', 'unang_araw', 'tuloy_tuloy',
  'lingguhang_bayani', 'buwan_ng_pagsisikap', 'hindi_ako_susuko', 'lakas_ng_loob',
  'matalinong_mag_aaral', 'patuloy_na_umuunlad', 'aking_unang_tagumpay', 'alamat_ng_pagbasa',
];

// Individual viewports keep the generated artwork and neighboring cells separate.
const ART_VIEWPORTS = [
  [14,12,282,270], [305,20,250,260], [562,15,277,266], [847,20,270,260],
  [15,294,279,260], [305,295,254,252], [563,291,275,260], [846,288,270,260],
  [17,564,276,245], [305,564,250,245], [565,559,272,249], [844,559,271,249],
  [17,815,277,251], [302,815,255,251], [565,815,273,251], [843,815,271,251],
  [14,1080,280,290], [302,1075,244,296], [564,1080,275,290], [844,1075,270,296],
];

/** Only decorative artwork changes; catalog IDs and award definitions stay intact. */
export function AchievementArtwork({ badge }: { badge: BadgeDef }) {
  const index = ILLUSTRATED_BADGES.indexOf(badge.id);
  return index < 0 ? <img className="achievement-art" src={badge.image} alt="" /> : (
    <svg className="achievement-art" viewBox={ART_VIEWPORTS[index].join(' ')} aria-hidden="true" focusable="false">
      <image href={badgeIllustrations} width="1122" height="1402" />
    </svg>
  );
}
