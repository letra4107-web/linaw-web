export interface LearnModule {
  id: string;
  module_number: number;
  title: string;
  description: string | null;
  instructional_content_type: string;
  assessment_id: string | null;
  state: 'locked' | 'unlocked' | 'completed';
  content_item_count: number;
  completed_content_item_count: number;
}

const BEGINNER_STAGES = [
  { title: 'Panimula', description: 'Tuklasin ang mga unang tunog at titik.', icon: '🌱', tone: 'introduction', from: 1, to: 1 },
  { title: 'Pagsisilaba sa mga Pantig', description: 'Basahin ang mga pantig at pagsamahin ang mga tunog.', icon: '🧩', tone: 'syllables', from: 2, to: 6 },
  { title: 'Pagbasa sa mga Salita', description: 'Basahin ang mga simpleng salita.', icon: '📖', tone: 'reading', from: 7, to: 11 },
  { title: 'Pagpapalawak', description: 'Basahin ang mas mahabang pantig at salita.', icon: '⭐', tone: 'growth', from: 12, to: 16 },
  { title: 'Pagsubok sa Salita', description: 'Basahin ang buong salita at gamitin sa pangungusap.', icon: '🏆', tone: 'words', from: 17, to: 17 },
] as const;

export function learnModulePercent(module: Pick<LearnModule, 'content_item_count' | 'completed_content_item_count'>) {
  if (!Number.isFinite(module.content_item_count) || module.content_item_count <= 0) return 0;
  const completed = Number.isFinite(module.completed_content_item_count) ? module.completed_content_item_count : 0;
  return Math.max(0, Math.min(100, Math.round(completed / module.content_item_count * 100)));
}

export function groupLearnModules(modules: LearnModule[], level: string) {
  const ordered = [...modules].sort((left, right) => left.module_number - right.module_number);
  if (level === 'Beginner') {
    const stages = BEGINNER_STAGES.map((stage, index) => ({
      ...stage, number: index + 1,
      modules: ordered.filter(module => module.module_number >= stage.from && module.module_number <= stage.to),
    })).filter(stage => stage.modules.length);
    const extra = ordered.filter(module => !BEGINNER_STAGES.some(stage => module.module_number >= stage.from && module.module_number <= stage.to));
    return extra.length ? [...stages, { title: 'Karagdagang Aralin', description: 'Ipagpatuloy ang iyong pagkatuto.', icon: '✨', tone: 'extra', number: 6, from: 0, to: Infinity, modules: extra }] : stages;
  }
  // Other levels have different curricula. Keep every server-supplied module
  // and use neutral headings rather than imposing Beginner's phonics labels.
  const size = Math.max(1, Math.ceil(ordered.length / 5));
  const titles = ['Mga Unang Aralin', 'Pagsasanay', 'Paghasa sa Pagbasa', 'Pagpapalawak', 'Pagsubok'];
  return BEGINNER_STAGES.map((stage, index) => ({
    ...stage, title: titles[index], description: 'Magpatuloy sa mga aralin sa iyong antas.', number: index + 1,
    modules: ordered.slice(index * size, (index + 1) * size),
  })).filter(stage => stage.modules.length);
}

// Each picture names a Filipino word beginning with the displayed syllable.
// The word is also shown as a caption so the example does not depend on an
// English name for the object. Order corresponds to the 5 × 3 picture sheet.
const SYLLABLE_ART: Record<string, { emoji: string; color: string; exampleWord: string }> = {
  ba: { emoji: '🏠', color: 'blue', exampleWord: 'Bahay' },
  da: { emoji: '🍃', color: 'pink', exampleWord: 'Dahon' },
  ga: { emoji: '🥛', color: 'teal', exampleWord: 'Gatas' },
  ha: { emoji: '🪴', color: 'red', exampleWord: 'Halaman' },
  ka: { emoji: '🖐️', color: 'blue', exampleWord: 'Kamay' },
  la: { emoji: '✏️', color: 'teal', exampleWord: 'Lapis' },
  ma: { emoji: '👁️', color: 'pink', exampleWord: 'Mata' },
  na: { emoji: '👩‍👧', color: 'red', exampleWord: 'Nanay' },
  nga: { emoji: '📅', color: 'blue', exampleWord: 'Ngayon' },
  pa: { emoji: '☂️', color: 'blue', exampleWord: 'Payong' },
  ra: { emoji: '📻', color: 'pink', exampleWord: 'Radyo' },
  sa: { emoji: '🍌', color: 'teal', exampleWord: 'Saging' },
  ta: { emoji: '☕', color: 'pink', exampleWord: 'Tasa' },
  wa: { emoji: '🧹', color: 'blue', exampleWord: 'Walis' },
  ya: { emoji: '🪙', color: 'pink', exampleWord: 'Yaman' },
};

// Isolate each complete picture in the 1619 × 972 sheet. The generated
// objects are not centered on exact grid boundaries, so equal tiles would
// expose fragments of neighboring pictures.
const TAGALOG_PICTURE_VIEWBOXES = [
  '41 56 334 266', '421 61 205 276', '723 59 203 264', '988 40 285 298', '1324 43 259 294',
  '51 374 253 246', '372 367 270 248', '677 334 297 298', '1019 363 248 260', '1312 355 290 269',
  '37 642 278 281', '356 668 298 260', '689 702 282 205', '994 626 263 314', '1315 646 281 284',
] as const;

export function learnModuleArt(module: Pick<LearnModule, 'title' | 'instructional_content_type'>) {
  const syllable = module.title.match(/^Hanay ng\s+([a-z]+)\b/i)?.[1];
  const art = syllable ? SYLLABLE_ART[syllable.toLowerCase()] : undefined;
  if (art && syllable) {
    const sprite = Object.keys(SYLLABLE_ART).indexOf(syllable.toLowerCase());
    return { ...art, sprite, pictureViewBox: TAGALOG_PICTURE_VIEWBOXES[sprite], syllable: syllable.charAt(0).toUpperCase() + syllable.slice(1).toLowerCase() };
  }
  return { emoji: module.instructional_content_type === 'phonetic' ? '🔤' : '📖', color: 'purple', syllable: null, sprite: null, pictureViewBox: null, exampleWord: null };
}

export function compactModuleDescription(description: string | null, type: string) {
  if (!description || type.toLowerCase() !== 'phonetic') return description;
  return description.replace(/^Bigkasin ang\s*/i, '').replace(/,?\s*at\s+/i, ', ').replace(/\.$/, '');
}
