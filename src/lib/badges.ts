import unangHakbang from '../assets/badges/Unang Hakbang.png';
import batangMambabasa from '../assets/badges/Batang Mambabasa.png';
import masigasigNaMambabasa from '../assets/badges/Masigasig na Mambabasa.png';
import kampeonSaPagbasa from '../assets/badges/Kampeon sa Pagbasa.png';
import dalubhasaSaPagbasa from '../assets/badges/Dalubhasa sa Pagbasa.png';
import unangBigkas from '../assets/badges/Unang Bigkas.png';
import malinawMagsalita from '../assets/badges/Malinaw Magsalita.png';
import tamangBigkas from '../assets/badges/Tamang Bigkas.png';
import bosesNgTagumpay from '../assets/badges/Boses ng Tagumpay.png';
import bigkasChampion from '../assets/badges/Bigkas Champion.png';
import unangAraw from '../assets/badges/Unang Araw.png';
import tuloyTuloy from '../assets/badges/Tuloy-Tuloy!.png';
import lingguhangBayani from '../assets/badges/Lingguhang Bayani.png';
import buwanNgPagsisikap from '../assets/badges/Buwan ng Pagsisikap.png';
import hindiAkoSusuko from '../assets/badges/Hindi Ako Susuko.png';
import lakasNgLoob from '../assets/badges/Lakas ng Loob.png';
import matalinongMagAaral from '../assets/badges/Matalinong Mag-aaral.png';
import patuloyNaUmuunlad from '../assets/badges/Patuloy na Umuunlad.png';
import akingUnangTagumpay from '../assets/badges/Aking Unang Tagumpay.png';
import alamatNgPagbasa from '../assets/badges/Alamat ng Pagbasa.png';

export type BadgeCategory = 'reading' | 'practice' | 'consistency' | 'progress' | 'meta';

export const BADGE_CATEGORY_LABEL: Record<BadgeCategory, string> = {
  reading: 'Pagbasa',
  practice: 'Pagsasanay',
  consistency: 'Katatagan',
  progress: 'Progreso',
  meta: 'Natatangi',
};

export interface BadgeDef {
  id: string;
  title: string;
  category: BadgeCategory;
  xp: number;
  image: string;
  criteria: string;
  /** Only set for the reading-category chain, where the unlock condition is a plain activities_completed count. */
  threshold?: number;
}

export const BADGE_CATALOG: BadgeDef[] = [
  { id: 'unang_hakbang', title: 'Unang Hakbang', category: 'reading', xp: 20, image: unangHakbang, criteria: 'Tapusin ang unang gawain.', threshold: 1 },
  { id: 'batang_mambabasa', title: 'Batang Mambabasa', category: 'reading', xp: 30, image: batangMambabasa, criteria: 'Tapusin ang 5 gawain.', threshold: 5 },
  { id: 'masigasig_na_mambabasa', title: 'Masigasig na Mambabasa', category: 'reading', xp: 40, image: masigasigNaMambabasa, criteria: 'Tapusin ang 10 gawain.', threshold: 10 },
  { id: 'kampeon_sa_pagbasa', title: 'Kampeon sa Pagbasa', category: 'reading', xp: 60, image: kampeonSaPagbasa, criteria: 'Tapusin ang 25 gawain.', threshold: 25 },
  { id: 'dalubhasa_sa_pagbasa', title: 'Dalubhasa sa Pagbasa', category: 'reading', xp: 80, image: dalubhasaSaPagbasa, criteria: 'Tapusin ang 50 gawain.', threshold: 50 },
  { id: 'unang_bigkas', title: 'Unang Bigkas', category: 'practice', xp: 20, image: unangBigkas, criteria: 'Gumawa ng unang pagsasanay sa bigkas.' },
  { id: 'malinaw_magsalita', title: 'Malinaw Magsalita', category: 'practice', xp: 30, image: malinawMagsalita, criteria: 'Makakuha ng 90%+ accuracy sa isang salita.' },
  { id: 'tamang_bigkas', title: 'Tamang Bigkas', category: 'practice', xp: 40, image: tamangBigkas, criteria: 'Makakuha ng 100% accuracy sa 5 magkaibang salita.' },
  { id: 'boses_ng_tagumpay', title: 'Boses ng Tagumpay', category: 'practice', xp: 60, image: bosesNgTagumpay, criteria: 'Magsanay ng 25 beses.' },
  { id: 'bigkas_champion', title: 'Bigkas Champion', category: 'practice', xp: 60, image: bigkasChampion, criteria: 'Magsanay ng 10 beses na may 90%+ average accuracy.' },
  { id: 'unang_araw', title: 'Unang Araw', category: 'consistency', xp: 20, image: unangAraw, criteria: 'Magsanay ng kahit isang beses.' },
  { id: 'tuloy_tuloy', title: 'Tuloy-Tuloy!', category: 'consistency', xp: 30, image: tuloyTuloy, criteria: 'Mag-streak ng 3 araw.' },
  { id: 'lingguhang_bayani', title: 'Lingguhang Bayani', category: 'consistency', xp: 40, image: lingguhangBayani, criteria: 'Mag-streak ng 7 araw.' },
  { id: 'buwan_ng_pagsisikap', title: 'Buwan ng Pagsisikap', category: 'consistency', xp: 60, image: buwanNgPagsisikap, criteria: 'Mag-streak ng 30 araw.' },
  { id: 'hindi_ako_susuko', title: 'Hindi Ako Susuko', category: 'practice', xp: 30, image: hindiAkoSusuko, criteria: 'Subukan ang isang salita nang 5+ beses.' },
  { id: 'lakas_ng_loob', title: 'Lakas ng Loob', category: 'practice', xp: 40, image: lakasNgLoob, criteria: 'Matutunan ang 5 mahihirap na salita.' },
  { id: 'matalinong_mag_aaral', title: 'Matalinong Mag-aaral', category: 'progress', xp: 40, image: matalinongMagAaral, criteria: 'Umunlad nang malaki mula sa iyong baseline accuracy.' },
  { id: 'patuloy_na_umuunlad', title: 'Patuloy na Umuunlad', category: 'progress', xp: 60, image: patuloyNaUmuunlad, criteria: 'Umakyat sa susunod na antas.' },
  { id: 'aking_unang_tagumpay', title: 'Aking Unang Tagumpay', category: 'meta', xp: 25, image: akingUnangTagumpay, criteria: 'Makakuha ng unang badge.' },
  { id: 'alamat_ng_pagbasa', title: 'Alamat ng Pagbasa', category: 'meta', xp: 200, image: alamatNgPagbasa, criteria: 'Makuha lahat ng ibang badge.' },
];

export function findBadge(id: string): BadgeDef | undefined {
  return BADGE_CATALOG.find((b) => b.id === id);
}
